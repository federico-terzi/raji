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

export async function parse(
  body: string,
  customOptions?: Partial<Options>
): Promise<any> {
  if (
    body.length <
    (customOptions?.shortBodyThreshold ?? defaultOptions.shortBodyThreshold)
  ) {
    return Promise.resolve(JSON.parse(body));
  }

  const options =
    customOptions !== undefined
      ? {
          ...defaultOptions,
          ...customOptions,
        }
      : defaultOptions;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const bodyBuffer = encoder.encode(body);

  const generator = parseRoot(bodyBuffer, 0, options, decoder);
  return processAsync(
    generator,
    options.chunkMillisThreshold,
    options.asyncParsingAfterMillis
  );
}

function findBoundaries(
  bodyBuffer: Uint8Array,
  index: number,
  maxLength: number,
  boundaryType: BoundaryType
): EndIndex | undefined {
  let deepLevel = 0;
  let insideString = false;
  let ignoreNext = false;
  let offset = 0;

  const startChar = boundaryType === ARRAY_BOUNDARY ? 91 : 123; // 91 = [ 123 = {
  const endChar = boundaryType === ARRAY_BOUNDARY ? 93 : 125; // 93 = ] 125 = }

  while (offset < maxLength) {
    const char = bodyBuffer[index];

    if (char === undefined) {
      throw new Error("unexpected EOF while searching for objects");
    }

    if (ignoreNext) {
      ignoreNext = false;
    } else if (char === 34) {
      // 34 = "
      insideString = !insideString;
    } else if (char === 92 && !ignoreNext) {
      // 92 = \
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
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, EndIndex> {
  if (options.shortValueThreshold > 0) {
    const endIndex = findBoundaries(
      bodyBuffer,
      index,
      options.shortValueThreshold,
      OBJECT_BOUNDARY
    );

    if (endIndex !== undefined) {
      const slice = bodyBuffer.slice(index, endIndex + 1);
      const sliceString = decoder.decode(slice);
      Object.assign(targetObject, JSON.parse(sliceString));
      return endIndex;
    }
  }

  return yield* parseObjectIncrementally(
    targetObject,
    bodyBuffer,
    index,
    options,
    decoder
  );
}

function* parseObjectIncrementally(
  targetObject: object,
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, EndIndex> {
  index++;

  // Object might be empty
  const [nextChar, nextCharEndIndex] = parseNextNonWhitespace(
    bodyBuffer,
    index
  );
  if (nextChar === 125) {
    // 125 = }
    return nextCharEndIndex;
  }

  outerLoop: while (true) {
    const [key, keyEndIndex] = parseString(bodyBuffer, index, decoder);
    index = keyEndIndex + 1;

    const [colon, colonEndIndex] = parseNextNonWhitespace(bodyBuffer, index);
    if (colon !== 58) {
      // 58 = :
      throw new Error("invalid JSON syntax, expected colon :");
    }
    index = colonEndIndex + 1;

    const [value, valueEndIndex] = yield* parseValue(
      bodyBuffer,
      index,
      options,
      decoder
    );
    index = valueEndIndex + 1;

    targetObject[key] = value;

    yield;

    const [separator, separatorEndIndex] = parseNextNonWhitespace(
      bodyBuffer,
      index
    );
    switch (separator) {
      case 44: // 44 = ,
        index = separatorEndIndex + 1;
        continue;
      case 125: // 125 = }
        index = separatorEndIndex;
        break outerLoop;
      default:
        throw new Error("unexpected end of object, char: " + separator);
    }
  }

  return index;
}

function* parseArray(
  targetArray: unknown[],
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, EndIndex> {
  if (options.shortValueThreshold > 0) {
    const endIndex = findBoundaries(
      bodyBuffer,
      index,
      options.shortValueThreshold,
      ARRAY_BOUNDARY
    );

    if (endIndex !== undefined) {
      const slice = bodyBuffer.slice(index, endIndex + 1);
      const sliceString = decoder.decode(slice);
      const parsedArray = JSON.parse(sliceString);
      for (let i = 0; i < parsedArray.length; i++) {
        targetArray.push(parsedArray[i]);
      }
      return endIndex;
    }
  }

  return yield* parseArrayIncrementally(
    targetArray,
    bodyBuffer,
    index,
    options,
    decoder
  );
}

function* parseArrayIncrementally(
  targetArray: unknown[],
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, EndIndex> {
  index++;

  // Array might be empty
  const [nextChar, nextCharEndIndex] = parseNextNonWhitespace(
    bodyBuffer,
    index
  );
  if (nextChar === 93) {
    // 93 = ]
    return nextCharEndIndex;
  }

  outerLoop: while (true) {
    const [value, valueEndIndex] = yield* parseValue(
      bodyBuffer,
      index,
      options,
      decoder
    );
    index = valueEndIndex + 1;

    targetArray.push(value);

    yield;

    const [separator, separatorEndIndex] = parseNextNonWhitespace(
      bodyBuffer,
      index
    );
    switch (separator) {
      case 44: // 44 = ,
        index = separatorEndIndex + 1;
        continue;
      case 93: // 93 = ]
        index = separatorEndIndex;
        break outerLoop;
      default:
        throw new Error("unexpected end of array, char: " + separator);
    }
  }

  return index;
}

export function parseString(
  bodyBuffer: Uint8Array,
  index: number,
  decoder: TextDecoder
): [string, EndIndex] {
  let ignoreNext = false;

  const [firstChar, firstCharEndIndex] = parseNextNonWhitespace(
    bodyBuffer,
    index
  );
  if (firstChar !== 34) {
    // 34 = "
    throw new Error("expected start of string");
  }

  index = firstCharEndIndex + 1;

  while (true) {
    const char = bodyBuffer[index];

    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    if (ignoreNext) {
      ignoreNext = false;
    } else if (char === 34) {
      // 34 = "
      const keySlice = bodyBuffer.slice(firstCharEndIndex, index + 1);
      const keyString = decoder.decode(keySlice);
      const key = JSON.parse(keyString);
      return [key, index];
    } else if (char === 92 && !ignoreNext) {
      // 92 = \
      ignoreNext = true;
    }

    index++;
  }
}

export function parseNumberBoolOrNull(
  bodyBuffer: Uint8Array,
  index: number,
  decoder: TextDecoder
): [unknown, EndIndex] {
  let startIndex = index;
  while (true) {
    const char = bodyBuffer[index];

    switch (char) {
      case 44: // ,
      case 93: // ]
      case 125: // }
      case 34: // "
      case undefined:
        const slice = bodyBuffer.slice(startIndex, index);
        const sliceString = decoder.decode(slice);
        return [JSON.parse(sliceString), index - 1];
    }

    index++;
  }
}

function parseNextNonWhitespace(
  bodyBuffer: Uint8Array,
  index: number
): [number, EndIndex] {
  while (true) {
    const char = bodyBuffer[index];

    switch (char) {
      case 32: // Space
      case 9: // Tab
      case 10: // New line
      case 13: // Carriage return
        index++;
        break;
      case undefined:
        throw new Error("EOF while parsing non-whitespace");
      default:
        return [char, index];
    }
  }
}

function throwErrorIfNonWhitespaceIsPresent(
  bodyBuffer: Uint8Array,
  index: number
): void {
  while (true) {
    const char = bodyBuffer[index];

    switch (char) {
      case 32: // Space
      case 9: // Tab
      case 10: // New line
      case 13: // Carriage return
        index++;
        break;
      case undefined:
        return;
      default:
        throw new Error("expected whitespace, found: " + char);
    }
  }
}

function* parseValue(
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, [unknown, EndIndex]> {
  const [startChar, startCharEndIndex] = parseNextNonWhitespace(
    bodyBuffer,
    index
  );

  switch (startChar) {
    case 123: // {
      const objValue = {};
      const objEndIndex = yield* parseObject(
        objValue,
        bodyBuffer,
        startCharEndIndex,
        options,
        decoder
      );
      return [objValue, objEndIndex];
    case 91: // [
      const arrayValue = [];
      const arrayEndIndex = yield* parseArray(
        arrayValue,
        bodyBuffer,
        startCharEndIndex,
        options,
        decoder
      );
      return [arrayValue, arrayEndIndex];
    case 34: // "
      return parseString(bodyBuffer, startCharEndIndex, decoder);
    default:
      return parseNumberBoolOrNull(bodyBuffer, startCharEndIndex, decoder);
  }
}

function* parseRoot(
  bodyBuffer: Uint8Array,
  index: number,
  options: Options,
  decoder: TextDecoder
): Generator<void, [unknown, EndIndex]> {
  const [value, endIndex] = yield* parseValue(
    bodyBuffer,
    index,
    options,
    decoder
  );

  throwErrorIfNonWhitespaceIsPresent(bodyBuffer, endIndex + 1);

  return [value, endIndex];
}
