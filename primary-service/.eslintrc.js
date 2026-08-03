module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "script",
  },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
  ignorePatterns: ["node_modules/", "coverage/", "logs/", "uploads/"],
};
