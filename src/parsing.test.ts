import { Options } from "./options"
import { parseString, parse } from "./parsing"

const DISABLE_ALL_OPTIMIZATIONS: Options = {
  chunkMillisThreshold: 50,
  enableShortBodyOptimization: false,
  enableShortValueOptimization: false
};


describe("parse", () => {
  it("base case without optimizations", async () => {
    const json = '{"key1":"test", "key2":{"value":"test2", "array": ["one", "two"]}, "another": true, "other": null, "finally": 123}';

    const parsed = await parse(json, DISABLE_ALL_OPTIMIZATIONS);

    expect(parsed).toEqual(JSON.parse(json));
  })


  // TODO: test invalid syntax
})

// describe("parseNextString", () => {
//   it("works correctly", () => {
//     expect(parseString('  "example key": ', 1)).toEqual(["example key", 14])
//   })

//   // TODO: test invalid syntax
// })