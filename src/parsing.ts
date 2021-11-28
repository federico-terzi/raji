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

const ARRAY_BOUNDARY = 0;
const OBJECT_BOUNDARY = 1;
type BoundaryType = typeof ARRAY_BOUNDARY | typeof OBJECT_BOUNDARY;
type EndIndex = number;

export async function parse(body: string, options: Options = defaultOptions): Promise<unknown> {
  if (body.length < options.shortBodyThreshold && options.enableShortBodyOptimization) {
    return Promise.resolve(JSON.parse(body));
  }

  const generator = parseRoot(body, 0, options);
  return processAsync(generator, options.chunkMillisThreshold);
}


function findBoundaries(
  body: string,
  index: number,
  maxLength: number,
  boundaryType: BoundaryType,
): EndIndex | undefined {
  let deepLevel = 0;
  let insideString = false;
  let ignoreNext = false;
  let offset = 0;

  const startChar = boundaryType === ARRAY_BOUNDARY ? "[" : "{";
  const endChar = boundaryType === ARRAY_BOUNDARY ? "]" : "}";

  while (offset < maxLength) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF while searching for objects");
    }

    if (ignoreNext) {
      ignoreNext = false
    } else if (char === '"') {
      insideString = !insideString;
    } else if (char === "\\" && !ignoreNext) {
      ignoreNext = true;
    } else if (char === startChar && !insideString) {
      deepLevel++;
    } else if (char === endChar && !insideString) {
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
    const endIndex = findBoundaries(body, index, options.shortValueThreshold, OBJECT_BOUNDARY);

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

  // Object might be empty
  const [nextChar, nextCharEndIndex] = parseNextNonWhitespace(body, index);
  if (nextChar === "}") {
    return nextCharEndIndex;
  }

  while (true) {
    const [key, keyEndIndex] = parseString(body, index);
    index = keyEndIndex + 1;

    const [colon, colonEndIndex] = parseNextNonWhitespace(body, index);
    if (colon !== ":") {
      throw new Error("invalid JSON syntax, expected colon :");
    }
    index = colonEndIndex + 1;

    const [value, valueEndIndex] = yield* parseValue(body, index, options);
    index = valueEndIndex + 1;

    targetObject[key] = value;

    yield;

    const [separator, separatorEndIndex] = parseNextNonWhitespace(body, index);
    if (separator === ",") {
      index = separatorEndIndex + 1;
      continue;
    } else if (separator === "}") {
      index = separatorEndIndex;
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
    const endIndex = findBoundaries(body, index, options.shortValueThreshold, ARRAY_BOUNDARY);

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

  // Array might be empty
  const [nextChar, nextCharEndIndex] = parseNextNonWhitespace(body, index);
  if (nextChar === "]") {
    return nextCharEndIndex;
  }

  while (true) {
    const [value, valueEndIndex] = yield* parseValue(body, index, options);
    index = valueEndIndex + 1;

    targetArray.push(value);

    yield;

    const [separator, separatorEndIndex] = parseNextNonWhitespace(body, index);
    if (separator === ",") {
      index = separatorEndIndex + 1;
      continue;
    } else if (separator === "]") {
      index = separatorEndIndex;
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
  let ignoreNext = false;

  const [firstChar, firstCharEndIndex] = parseNextNonWhitespace(body, index);
  if (firstChar !== '"') {
    throw new Error("expected start of string");
  }

  index = firstCharEndIndex + 1;

  while (true) {
    const char = body[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    if (ignoreNext) {
      ignoreNext = false;
    } else if (char === '"') {
      const keySlice = body.slice(firstCharEndIndex, index + 1);
      const key = JSON.parse(keySlice);
      return [key, index];
    } else if (char === "\\" && !ignoreNext) {
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

    if (char === ',' || char === "]" || char === "}" || char === '"' || char === undefined) {
      const slice = body.slice(startIndex, index);
      return [JSON.parse(slice), index - 1];
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
      throw new Error("EOF while parsing non-whitespace");
    }

    if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") {
      return [char, index];
    }

    index++;
  }
}

function throwErrorIfNonWhitespaceIsPresent(
  body: string,
  index: number,
): void {
  while (true) {
    const char = body[index];

    if (char === undefined) {
      return;
    }

    if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") {
      throw new Error("expected whitespace, found: " + char);
    }

    index++;
  }
}


function* parseValue(
  body: string,
  index: number,
  options: Options
): Generator<void, [unknown, EndIndex]> {
  const [startChar, startCharEndIndex] = parseNextNonWhitespace(body, index);

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

function* parseRoot(
  body: string,
  index: number,
  options: Options
): Generator<void, [unknown, EndIndex]> {
  const [value, endIndex] = yield* parseValue(body, index, options);

  throwErrorIfNonWhitespaceIsPresent(body, endIndex + 1);

  return [value, endIndex];
}