import chrome from "eslint-plugin-chrome";

export default [
  {
    files: ["src/**/*.js", "build/**/*.mjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { chrome: "readonly", window: "readonly", document: "readonly", console: "readonly" } },
    plugins: { chrome: chrome },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-inner-html": "error",
      "chrome/no-unsupported-chrome-api": "warn",
      "chrome/no-privileged-queries": "error"
    }
  }
];