/** Jest config — primary-service (CommonJS / Node) */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/workers/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 15000,
  // Avoid open-handle noise from express/redis in smoke tests
  forceExit: true,
};
