// MIT License
//
// Copyright (c) 2021 Federico Terzi
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Options, defaultOptions } from "./options";
import { processAsync } from "./scheduling";

type EndIndex = number;

export async function parse(body: string, options: Options = defaultOptions): Promise<unknown> {
  // // TODO: actually pass the threshold as an option
  // if (body.length < 10000 && options.enableShortBodyOptimization) {
  //   return Promise.resolve(JSON.parse(body));
  // }

  const generator = parseValue(body, 0, options);
  return processAsync(generator, options.chunkMillisThreshold);
}


// TODO: should be usable for arrays as well
function findObjectBoundaries(
  body: string,
  index: number,
  maxLength: number,
): EndIndex | undefined {
  let deepLevel = 0;
  let insideString = false;
  let ignoreNext = false;
  let offset = 0;

  while (offset < maxLength) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF while searching for objects");
    }

    if (char === '"') {
      if (!ignoreNext) {
        insideString = !insideString;
      } else {
        ignoreNext = false;
      }
    } else if (char === "\\") {
      ignoreNext = true;
    } else if (char === "{" && !insideString) {
      deepLevel++;
    } else if (char === "}" && !insideString) {
      deepLevel--;
      if (deepLevel === 0) {
        return index;
      }
    }

    offset++;
    index++;
  }

  return undefined;
}

function findArrayBoundaries(
  body: string,
  index: number,
  maxLength: number,
): EndIndex | undefined {
  let deepLevel = 0;
  let insideString = false;
  let ignoreNext = false;
  let offset = 0;

  while (offset < maxLength) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF while searching for arrays");
    }

    if (char === '"') {
      if (!ignoreNext) {
        insideString = !insideString;
      } else {
        ignoreNext = false;
      }
    } else if (char === "\\") {
      ignoreNext = true;
    } else if (char === "[" && !insideString) {
      deepLevel++;
    } else if (char === "]" && !insideString) {
      deepLevel--;
      if (deepLevel === 0) {
        return index;
      }
    }

    offset++;
    index++;
  }

  return undefined;
}


function* parseObject(
  targetObject: object,
  body: string,
  index: number,
  options: Options,
): Generator<void, EndIndex> {
  if (options.enableShortValueOptimization) {
    const endIndex = findObjectBoundaries(body, index, 1000); // TODO: change the threshold

    if (endIndex !== undefined) {
      const slice = body.slice(index, endIndex + 1);
      Object.assign(targetObject, JSON.parse(slice));
      return endIndex;
    }
  }

  return yield* parseObjectIncrementally(targetObject, body, index, options);
}

function* parseObjectIncrementally(
  targetObject: object,
  body: string,
  index: number,
  options: Options
): Generator<void, EndIndex> {
  index++;

  while (true) {
    const [key, keyEndIndex] = parseString(body, index);
    index = keyEndIndex + 1;

    const [colon, colonEndIndex] = parseNonWhitespace(body, index);
    if (colon !== ":") {
      throw new Error("invalid JSON syntax, expected colon :");
    }
    index = colonEndIndex + 1;

    const [value, valueEndIndex] = yield* parseValue(body, index, options);
    index = valueEndIndex + 1;

    targetObject[key] = value;

    yield;

    const [separator, separatorEndIndex] = parseNonWhitespace(body, index);
    if (separator === ",") {
      index = separatorEndIndex + 1;
      continue;
    } else if (separator === "}") {
      break;
    } else {
      throw new Error("unexpected end of object, char: " + separator);
    }

  }

  return index;
}

function* parseArray(
  targetArray: unknown[],
  body: string,
  index: number,
  options: Options,
): Generator<void, EndIndex> {
  if (options.enableShortValueOptimization) {
    const endIndex = findArrayBoundaries(body, index, 1000); // TODO: change the threshold

    if (endIndex !== undefined) {
      const slice = body.slice(index, endIndex + 1);
      const parsedArray = JSON.parse(slice);
      for (let i = 0; i < parsedArray.length; i++) {
        targetArray.push(parsedArray[i]);
      }
      return endIndex;
    }
  }

  return yield* parseArrayIncrementally(targetArray, body, index, options);
}

function* parseArrayIncrementally(
  targetArray: unknown[],
  body: string,
  index: number,
  options: Options
): Generator<void, EndIndex> {
  index++;
  while (true) {
    const [value, valueEndIndex] = yield* parseValue(body, index, options);
    index = valueEndIndex + 1;

    targetArray.push(value);

    yield;

    const [separator, separatorEndIndex] = parseNonWhitespace(body, index);
    if (separator === ",") {
      index = separatorEndIndex + 1;
      continue;
    } else if (separator === "]") {
      break;
    } else {
      throw new Error("unexpected end of object, char: " + separator);
    }

  }

  return index;
}


export function parseString(
  body: string,
  index: number,
): [string, EndIndex] {
  let insideString = false;
  let ignoreNext = false;
  let stringStartIndex = 0;

  while (true) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    if (char === '"') {
      if (!ignoreNext) {
        if (!insideString) {
          stringStartIndex = index;
          insideString = true;
        } else {
          const keySlice = body.slice(stringStartIndex, index + 1);
          const key = JSON.parse(keySlice);
          return [key, index];
        }
      } else {
        ignoreNext = false;
      }
    } else if (char === "\\") {
      ignoreNext = true;
    }

    index++;
  }
}

export function parseNumberBoolOrNull(
  body: string,
  index: number,
): [unknown, EndIndex] {
  let startIndex = index;
  while (true) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    if (char === ',' || char === "]" || char === "}" || char === '"') {
      const slice = body.slice(startIndex, index);
      return [JSON.parse(slice), index - 1];
    }

    index++;
  }
}


function parseNonWhitespace(
  body: string,
  index: number,
): [string, EndIndex] {
  while (true) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") {
      return [char, index];
    }

    index++;
  }
}


function* parseValue(
  body: string,
  index: number,
  options: Options
): Generator<void, [unknown, EndIndex]> {
  const [startChar, startCharEndIndex] = parseNonWhitespace(body, index);

  if (startChar === "{") {
    const objValue = {};
    const objEndIndex = yield* parseObject(objValue, body, startCharEndIndex, options);
    return [objValue, objEndIndex];
  } else if (startChar === "[") {
    const arrayValue = [];
    const arrayEndIndex = yield* parseArray(arrayValue, body, startCharEndIndex, options);
    return [arrayValue, arrayEndIndex];
  } else if (startChar === '"') {
    return parseString(body, startCharEndIndex);
  } else {
    return parseNumberBoolOrNull(body, startCharEndIndex);
  }
}