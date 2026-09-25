import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mandarCorreo, envoltura, boton, pesosCorreo } from "../../../../lib/correo";

/* Los recordatorios de cada manana.
   Vercel llama esta ruta una vez al dia. Revisa que deudas
   vencen pronto o ya se pasaron, segun lo que cada negocio
   configuro en Ajustes, y le manda correo al deudor. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Tope por corrida. El plan gratis de Resend aguanta poco,
   y mas vale quedarse corto que quedarse sin servicio. */
const TOPE = 80;

/* La fecha de hoy en Mexico. El servidor corre en otro huso,
   asi que preguntarle la fecha directo da un dia equivocado
   a ciertas horas. */
function hoyEnMexico() {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return f; // "2026-09-24"
}

const aFecha = (s) => new Date(s + "T00:00:00");

const diasEntre = (a, b) =>
  Math.round((aFecha(a) - aFecha(b)) / 86400000);

/* Misma regla que usa la base para dejar entrar a alguien:
   con plan pagado al corriente, o con prueba vigente. */
function cuentaActiva(p, ahora) {
  if (!p) return false;
  if (p.plan === "active") {
    return !p.current_period_end || new Date(p.current_period_end) > ahora;
  }
  if (p.plan === "past_due") {
    return !!p.current_period_end && new Date(p.current_period_end) > ahora;
  }
  if (p.plan === "trial") {
    return !!p.trial_ends_at && new Date(p.trial_ends_at) > ahora;
  }
  return false;
}

export async function GET(request) {
  /* Solo Vercel puede disparar esto. Sin el candado, cualquiera
     podria llamarlo mil veces y quemar el envio de correos. */
  const secreto = process.env.CRON_SECRET;
  const traido  = request.headers.get("authorization");

  if (!secreto || traido !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const hoy    = hoyEnMexico();
  const ahora  = new Date();
  const origen = new URL(request.url).origin;

  const cuenta = { revisadas: 0, mandados: 0, fallados: 0, saltados: 0 };

  try {
    /* 1. Negocios que quieren correos automaticos */
    const { data: reglas, error: errReglas } = await admin
      .from("reminder_settings")
      .select("owner_id, days_before, days_after")
      .eq("email_enabled", true);

    if (errReglas) throw new Error("reglas: " + errReglas.message);
    if (!reglas || reglas.length === 0) {
      return NextResponse.json({ ok: true, hoy, ...cuenta });
    }

    const ids = reglas.map((r) => r.owner_id);

    /* 2. Cuales de esos tienen la cuenta al corriente */
    const { data: perfiles } = await admin
      .from("profiles")
      .select("id, plan, trial_ends_at, current_period_end, business_name")
      .in("id", ids);

    const porId = new Map((perfiles || []).map((p) => [p.id, p]));

    for (const regla of reglas) {
      if (cuenta.mandados >= TOPE) break;

      const perfil = porId.get(regla.owner_id);
      if (!cuentaActiva(perfil, ahora)) {
        cuenta.saltados++;
        continue;
      }

      /* 3. Sus deudas abiertas con fecha */
      const { data: deudas } = await admin
        .from("debts_view")
        .select("id, customer_id, customer_name, customer_email, concept, balance_cents, due_date, public_token, kind, status")
        .eq("owner_id", regla.owner_id)
        .eq("status", "pending")
        .not("due_date", "is", null);

      if (!deudas || deudas.length === 0) continue;

      const antes   = regla.days_before ?? [];
      const despues = regla.days_after ?? [];

      /* 4. A cuales les toca hoy */
      const tocan = deudas.filter((d) => {
        if (d.kind === "cobro") return false;      // los cobros no vencen
        if (!d.customer_email) return false;       // sin correo no hay a donde
        if (Number(d.balance_cents) <= 0) return false;

        const faltan = diasEntre(d.due_date, hoy);   // + antes, - despues
        if (faltan >= 0) return antes.includes(faltan);
        return despues.includes(Math.abs(faltan));
      });

      if (tocan.length === 0) continue;

      /* 5. Los que ya recibieron correo hoy, no otra vez */
      const { data: yaHechos } = await admin
        .from("reminders")
        .select("debt_id")
        .eq("owner_id", regla.owner_id)
        .eq("channel", "email")
        .eq("trigger_type", "auto")
        .eq("scheduled_for", hoy);

      const hechos = new Set((yaHechos || []).map((r) => r.debt_id));

      for (const d of tocan) {
        if (cuenta.mandados >= TOPE) break;
        if (hechos.has(d.id)) { cuenta.saltados++; continue; }

        cuenta.revisadas++;

        const faltan  = diasEntre(d.due_date, hoy);
        const negocio = perfil?.business_name || "tu proveedor";
        const saldo   = pesosCorreo(d.balance_cents);
        const link    = `${origen}/d/${d.public_token}`;

        const cuando =
          faltan > 1  ? `vence en ${faltan} dias`
          : faltan === 1 ? "vence manana"
          : faltan === 0 ? "vence hoy"
          : Math.abs(faltan) === 1 ? "vencio ayer"
          : `vencio hace ${Math.abs(faltan)} dias`;

        const titulo = `Hola ${d.customer_name}, tu pago ${cuando}`;

        const html = envoltura({
          titulo,
          cuerpo: `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333333;">
              Tienes <strong>${saldo}</strong> pendientes con
              <strong>${negocio}</strong> por "${d.concept}".
            </p>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#333333;">
              Puedes ver tu saldo y pagar desde aqui:
            </p>
            ${boton("Ver mi saldo", link)}
            <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8a8a;">
              Si ya pagaste, entra al mismo link y avisale al negocio
              para que quede registrado.
            </p>
          `,
          pie: `Te lo manda ${negocio} a traves de Cobriq.`,
        });

        const texto =
          `Hola ${d.customer_name}, tu pago ${cuando}. ` +
          `Tienes ${saldo} pendientes con ${negocio} por "${d.concept}". ` +
          `Ve tu saldo y paga aqui: ${link}`;

        const r = await mandarCorreo({
          para: d.customer_email,
          asunto: titulo,
          html,
          texto,
        });

        /* 6. Quede como quede, se anota. El historial sirve para
           no repetir y para que el dueno vea que si se mando. */
        await admin.from("reminders").insert({
          owner_id: regla.owner_id,
          debt_id: d.id,
          customer_id: d.customer_id,
          channel: "email",
          trigger_type: "auto",
          status: r.ok ? "sent" : "failed",
          body: texto,
          provider_id: r.ok ? r.id : null,
          error_message: r.ok ? null : String(r.error || "").slice(0, 300),
          scheduled_for: hoy,
          sent_at: r.ok ? new Date().toISOString() : null,
        });

        if (r.ok) cuenta.mandados++;
        else cuenta.fallados++;
      }
    }

    console.log("recordatorios", hoy, JSON.stringify(cuenta));
    return NextResponse.json({ ok: true, hoy, ...cuenta });
  } catch (e) {
    console.error("recordatorios:", e.message);
    return NextResponse.json({ ok: false, error: e.message, ...cuenta }, { status: 500 });
  }
}
