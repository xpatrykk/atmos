import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {ignores: ["**/node_modules/**", "**/dist/**", ".vercel/**", ".work/**", ".superpowers/**"]},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {languageOptions: {globals: {...globals.browser, ...globals.node}}},
  {files: ["**/*.{ts,tsx}"], plugins: {"react-hooks": reactHooks}, rules: {...reactHooks.configs.recommended.rules}},
);
