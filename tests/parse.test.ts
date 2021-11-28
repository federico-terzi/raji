import { Options } from "../src/options"
import { parse } from "../src/parsing"

const fs = require("fs");
const path = require("path");

const DISABLE_ALL_OPTIMIZATIONS: Options = {
  chunkMillisThreshold: 50,
  enableShortBodyOptimization: false,
  enableShortValueOptimization: false
};

describe("parse", () => {
  const readTestFiles = (): { body: string, name: string, shouldBeAccepted: boolean }[] => {
    const testDir = path.resolve(__dirname, "./data/parsing");
    return fs.readdirSync(testDir)
      .filter((fileName: string) => fileName.startsWith("y_") || fileName.startsWith("n_"))
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
        }
      });
  }

  const testCases = readTestFiles();

  test.each(testCases.filter(test => test.shouldBeAccepted))(
    "test $name should be parsed correctly [without optimizations]",
    async ({ body }) => {
      const parsed = await parse(body, DISABLE_ALL_OPTIMIZATIONS);

      expect(parsed).toEqual(JSON.parse(body));
    }
  )

  test.each(testCases.filter(test => !test.shouldBeAccepted))(
    "test $name should throw error [without optimizations]",
    async ({ body }) => {
      await expect(parse(body, DISABLE_ALL_OPTIMIZATIONS)).rejects.toThrow();
    }
  )

  test.each(testCases.filter(test => test.shouldBeAccepted))(
    "test $name should be parsed correctly [default options]",
    async ({ body }) => {
      const parsed = await parse(body);

      expect(parsed).toEqual(JSON.parse(body));
    }
  )

  test.each(testCases.filter(test => !test.shouldBeAccepted))(
    "test $name should throw error [default options]",
    async ({ body }) => {
      await expect(parse(body)).rejects.toThrow();
    }
  )

  // TODO: create a few test-cases for the nested cases
})