import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Misma forma que en lpage: `eslint-config-next` ya exporta flat config, asi
// que no hace falta FlatCompat — que ademas revienta con un error de
// estructura circular en eslint 9.39.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
