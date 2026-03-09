import type {Config} from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^firebase-admin/firestore$":
      "<rootDir>/__mocks__/firebase-admin/firestore.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {tsconfig: "tsconfig.test.json"}],
  },
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: "reports", outputName: "junit.xml"}],
    ["jest-html-reporters", {
      publicPath: "./reports",
      filename: "test-report.html",
      openReport: false,
      inlineSource: true,
    }],
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};

export default config;
