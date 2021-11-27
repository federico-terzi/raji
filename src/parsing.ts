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

export async function parse(body: string, options: Options = defaultOptions): Promise<unknown> {
  // TODO: actually pass the threshold as an option
  if (body.length < 1000 && options.enableShortBodyOptimization) {
    return Promise.resolve(JSON.parse(body));
  }

  // TODO: check if start as object or array, and assume that it's too big to find boundaries here
}

// Algorithm:
// 1. Scan the object/array
//    - If total string len is less then a threshold, JSON.parse over it
//    - If over, decompose the object/array

type EndIndex = number;

// TODO: should be usable for arrays as well
function findObjectBoundaries(
  body: string,
  index: number,
  maxObjectLength: number
): EndIndex | undefined {
  let deepLevel = 0;
  let insideString = false;
  let ignoreNext = false;
  let offset = 0;

  while (offset < maxObjectLength) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
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
        return offset;
      }
    }

    offset++;
  }

  return undefined;
}

export function* populateObject(
  targetObject: object,
  body: string,
  index: number,
  options: Options,
): Generator<void, EndIndex> {
  if (options.enableShortValueOptimization) {
    const endIndex = findObjectBoundaries(body, index, 100); // TODO: change the threshold

    if (endIndex !== undefined) {
      targetObject = JSON.parse(body.slice(index, endIndex + 1));
      return endIndex;
    }
  }

  return yield* populateObjectMembers(targetObject, body, index, options);
}

export function parseNextString(
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

function parseNextNonWhitespace(
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


function* populateObjectMembers(
  targetObject: object,
  body: string,
  index: number,
  options: Options
): Generator<void, EndIndex> {
  while (true) {
    const [key, keyEndIndex] = parseNextString(body, index);
    index = keyEndIndex + 1;

    const [colon, colonEndIndex] = parseNextNonWhitespace(body, index);
    if (colon !== ":") {
      throw new Error("invalid JSON syntax, expected colon :");
    }
    index = colonEndIndex + 1;

    const [value, valueEndIndex] = yield* parseNextValue(body, index, options);
    index = valueEndIndex + 1;

    targetObject[key] = value;

    yield;

    const [separator, separatorEndIndex] = parseNextNonWhitespace(body, index);
    if (separator === ",") {
      continue;
    } else if (separator === "}") {
      break;
    } else {
      throw new Error("unexpected end of object, char: " + separator);
    }

  }

  return index;
}

function* parseNextValue(
  body: string,
  index: number,
  options: Options
): Generator<void, [unknown, EndIndex]> {
  const [startChar, startCharEndIndex] = parseNextNonWhitespace(body, index);

  if (startChar === "{") {
    const objValue = {};
    const objEndIndex = yield* populateObject(objValue, body, startCharEndIndex, options);
    return [objValue, objEndIndex];
  } else if (startChar === "[") {
    // TODO
    throw new Error("TODO!");
  } else if (startChar === '"') {
    const [string, stringEndIndex] = parseNextString(body, startCharEndIndex);
    return [string, stringEndIndex];
  } else {
    // TODO
    throw new Error("TODO!" + startChar);
  }
}