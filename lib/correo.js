import { Resend } from "resend";

/* Manda correos con Resend.
   Nunca avienta error: si algo falla lo deja en los logs y
   devuelve ok:false. Un correo que no sale no debe tumbar un
   pago ni un webhook. */

const cliente = () => new Resend(process.env.RESEND_API_KEY);

/* Candado de pruebas.
   Sin dominio propio, Resend solo deja mandar al correo de la
   cuenta. Mientras exista CORREO_PRUEBA, todo se va para alla,
   sin importar a quien iba. El dia que haya dominio, se borra
   esa variable y los correos empiezan a llegar de verdad. */
function aDondeVa(correo) {
  const prueba = process.env.CORREO_PRUEBA;
  if (prueba) return { para: prueba, desviado: correo };
  return { para: correo, desviado: null };
}

export function pesosCorreo(c) {
  return (Number(c || 0) / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* La envoltura del correo.
   Los correos no entienden hojas de estilo ni clases: todo va
   escrito en cada etiqueta o no se ve. */
export function envoltura({ titulo, cuerpo, pie }) {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#f4f4f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;
                    font-family:Helvetica,Arial,sans-serif;">

        <tr><td style="background:#000000;padding:20px 24px;">
          <span style="color:#39FF14;font-size:22px;font-weight:bold;">C</span>
          <span style="color:#ffffff;font-size:18px;font-weight:bold;
                       letter-spacing:-0.3px;margin-left:8px;">Cobriq</span>
        </td></tr>

        <tr><td style="padding:28px 24px 8px;">
          <h1 style="margin:0;font-size:20px;line-height:1.3;color:#000000;">
            ${titulo}
          </h1>
        </td></tr>

        <tr><td style="padding:0 24px 28px;">
          ${cuerpo}
        </td></tr>

        <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e4;">
          <p style="margin:0;font-size:12px;color:#8a8a8a;line-height:1.5;">
            ${pie || "Te llega porque tienes una cuenta en Cobriq."}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* Boton negro para los correos. Se dibuja con una tabla porque
   los botones de verdad no funcionan en el correo. */
export function boton(texto, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr><td style="background:#000000;border-radius:8px;">
      <a href="${url}"
         style="display:inline-block;padding:13px 22px;color:#ffffff;
                font-size:15px;font-weight:bold;text-decoration:none;
                font-family:Helvetica,Arial,sans-serif;">${texto}</a>
    </td></tr>
  </table>`;
}

/* Manda un correo. Devuelve { ok, id } o { ok:false, error }. */
export async function mandarCorreo({ para, asunto, html, texto }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("correo: falta RESEND_API_KEY");
    return { ok: false, error: "sin llave" };
  }
  if (!para) {
    return { ok: false, error: "sin destinatario" };
  }

  const { para: destino, desviado } = aDondeVa(para);

  /* Cuando esta el candado, el asunto dice para quien era
     de verdad. Si no, uno acaba confundido en la bandeja. */
  const asuntoFinal = desviado ? `[prueba → ${desviado}] ${asunto}` : asunto;

  try {
    const { data, error } = await cliente().emails.send({
      from: process.env.CORREO_DE || "Cobriq <onboarding@resend.dev>",
      to: destino,
      subject: asuntoFinal,
      html,
      text: texto,
    });

    if (error) {
      console.error("correo:", error.message || error);
      return { ok: false, error: error.message || "no se pudo enviar" };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("correo:", e.message);
    return { ok: false, error: e.message };
  }
}
