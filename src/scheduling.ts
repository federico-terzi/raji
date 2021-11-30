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

export function executeChunkAsync(
  generator: Generator<void>
): Promise<unknown | undefined> {
  return new Promise((resolve, reject) => {
    window.requestIdleCallback((deadline): void => {
      try {
        do {
          const next = generator.next();

          if (next.done) {
            resolve(next.value[0]);
            return;
          }
        } while (deadline.timeRemaining() > 0);

        resolve(undefined);
      } catch (error) {
        reject(error);
        return;
      }
    });
  });
}

export function executeChunkAsyncFallback(
  generator: Generator<void>,
  timeoutMillis: number
): Promise<unknown | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout((): void => {
      try {
        const startTime = new Date().getTime();

        while (new Date().getTime() - startTime < timeoutMillis) {
          const next = generator.next();

          if (next.done) {
            resolve(next.value[0]);
            return;
          }
        }

        resolve(undefined);
      } catch (error) {
        reject(error);
        return;
      }
    }, 0);
  });
}

export function executeChunkSync(
  generator: Generator<void>,
  timeoutMillis: number
): unknown | undefined {
  const startTime = new Date().getTime();

  while (new Date().getTime() - startTime < timeoutMillis) {
    const next = generator.next();

    if (next.done) {
      return next.value[0];
    }
  }

  return undefined;
}

export async function processAsync(
  generator: Generator<void, [unknown, number]>,
  chunkTimeoutMillis: number,
  asyncParsingAfterMillis: number
): Promise<unknown> {
  // If the optimization is enabled, we execute the first "chunk" of work synchronously
  // so that we don't have to pay the price of the setTimeout call for small payloads
  if (asyncParsingAfterMillis > 0) {
    try {
      const syncParsed = executeChunkSync(generator, asyncParsingAfterMillis);
      if (syncParsed !== undefined) {
        return Promise.resolve(syncParsed);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const asyncExecutor =
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
      ? executeChunkAsync
      : executeChunkAsyncFallback;

  while (true) {
    try {
      const parsed = await asyncExecutor(generator, chunkTimeoutMillis);
      if (parsed !== undefined) {
        return Promise.resolve(parsed);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
