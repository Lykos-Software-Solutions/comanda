import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://comanda.lykos.com.ar"),
  title: "Comanda · Bot de pedidos por WhatsApp",
  description:
    "Convierte un mensaje suelto de WhatsApp en un pedido con productos, cantidades y precios. Demo por Lykos Software Solutions.",
  // Demo publica: lo que tiene que rankear es la pagina de servicio de
  // lykos.com.ar, no esta demo compitiendole por la misma busqueda.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
