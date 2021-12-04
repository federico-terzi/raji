import { defaultOptions, Options } from "../src/options";
import { parse } from "../src/parsing";

const fs = require("fs");
const path = require("path");

const DISABLE_ALL_OPTIMIZATIONS: Options = {
  ...defaultOptions,
  asyncParsingAfterMillis: 0,
  shortBodyThreshold: 0,
  shortValueThreshold: 0,
};

const TEST_CASES_OPTIONS_MATRIX: { name: string; options: Options }[] = [
  {
    name: "disable all optimizations",
    options: {
      ...DISABLE_ALL_OPTIMIZATIONS,
    },
  },
  {
    name: "enable short value optimization",
    options: {
      ...DISABLE_ALL_OPTIMIZATIONS,
      shortValueThreshold: 1000,
    },
  },
  {
    name: "default settings",
    options: {
      ...defaultOptions,
    },
  },
];

describe("parse", () => {
  const readTestFiles = (): {
    body: string;
    name: string;
    shouldBeAccepted: boolean;
  }[] => {
    const testDir = path.resolve(__dirname, "./data/parsing");
    return fs
      .readdirSync(testDir)
      .filter(
        (fileName: string) =>
          fileName.startsWith("y_") || fileName.startsWith("n_")
      )
      .map((fileName: string) => {
        const filePath = path.resolve(testDir, fileName);
        const body = fs.readFileSync(filePath, "utf8");
        const match = /[y|n|i]_(.*)\.json/.exec(fileName);
        const name = match[1];
        const shouldBeAccepted = fileName.startsWith("y_");

        return {
          body,
          name,
          shouldBeAccepted,
        };
      });
  };

  const testDataFiles = readTestFiles();

  const testCases = TEST_CASES_OPTIONS_MATRIX.flatMap((options) => {
    return testDataFiles.map((dataFile) => ({
      name: dataFile.name,
      optionsProfile: options.name,
      options: options.options,
      body: dataFile.body,
      shouldBeAccepted: dataFile.shouldBeAccepted,
    }));
  });

  test.each(testCases.filter((test) => test.shouldBeAccepted))(
    "test $name should be parsed correctly [$optionsProfile]",
    async ({ body, options }) => {
      const parsed = await parse(body, options);

      expect(parsed).toEqual(JSON.parse(body));
    }
  );

  test.each(testCases.filter((test) => !test.shouldBeAccepted))(
    "test $name should throw error [$optionsProfile]",
    async ({ body, options }) => {
      await expect(parse(body, options)).rejects.toThrow();
    }
  );
});
