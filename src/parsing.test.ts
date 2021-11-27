import { Options } from "./options"
import { parseNextString, populateObject } from "./parsing"

const DISABLE_ALL_OPTIMIZATIONS: Options = {
  enableShortBodyOptimization: false, enableShortValueOptimization: false
};

describe("parseNextString", () => {
  it("works correctly", () => {
    expect(parseNextString('  "example key": ', 1)).toEqual(["example key", 14])
  })

  // TODO: test invalid syntax
})

describe("populateObject", () => {
  it("base case without optimizations", () => {
    const json = '{"key1":"test", "key2":{"value":"test2"}}';

    const target = {};
    const gen = populateObject(target, json, 0, DISABLE_ALL_OPTIMIZATIONS);
    let count = 0;
    while (!gen.next().done) {
      console.log("step " + count);
      count++;
    }

    expect(target).toEqual(JSON.parse(json));
  })

  // TODO: test invalid syntax
})