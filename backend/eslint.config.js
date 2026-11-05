module.exports = [
  { ignores: ["node_modules/**"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        AbortController: "readonly", Buffer: "readonly", URL: "readonly", __dirname: "readonly", clearInterval: "readonly", clearTimeout: "readonly",
        console: "readonly", module: "readonly", process: "readonly", require: "readonly",
        setInterval: "readonly", setTimeout: "readonly",
      },
    },
    rules: { "no-undef": "error" },
  },
];
