import type { NextConfig } from "next";

/**
 * Export estático: la demo no tiene backend ni base de datos. El parser corre
 * en el navegador y el estado del pedido vive en la sesión de cada visitante,
 * asi que dos personas probando al mismo tiempo no se pisan. Cero costo de
 * hosting y nada que se pueda caer.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
