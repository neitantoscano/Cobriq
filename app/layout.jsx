import "./globals.css";

export const metadata = {
  title: "Cobriq",
  description: "Lleva la cuenta de quien te debe y cobra sin perseguir a nadie.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
