# RAJI
> Really Async JSON Interface: a non-blocking alternative to JSON.parse to keep web UIs responsive.

[![npm](https://img.shields.io/npm/v/raji)](https://www.npmjs.com/package/raji)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/raji)](https://www.npmjs.com/package/raji)
![GitHub](https://img.shields.io/github/license/federico-terzi/raji)

In a nutshell:

* **RAJI guarantees that JSON parsing won't 
freeze your UI, especially on slower mobile devices.**
* It does so by dividing the parsing work in chunks.
* It's extremely easy to integrate with web apps, you just need to change the `JSON.parse(payload)` calls to `await parse(payload)` calls.
* RAJI chunks the work only when necessary. 
If the payload is small enough, it invokes `JSON.parse` 
synchronously under the hoods so you won't pay an additional overhead.
* RAJI is extremely lightweight, only 1.71kB gzipped.

> This project is experimental, so there's a lot to be improved. 
> All feedback and help is highly appreciated!

### Demo

The following video shows a quick demo of Raji, or you can try it out yourself at this link: https://federicoterzi.com/raji/

[![RAJI video demo](https://img.youtube.com/vi/VhDjtx4afts/0.jpg)](https://www.youtube.com/watch?v=VhDjtx4afts)

### Explanation

Traditionally, web applications have been using the `JSON.parse` method to convert JSON
payloads into JS objects. 
While being very optimized, the `JSON.parse` call is **blocking**, which means the
page will become **unresponsive** when called with large JSON payloads,
effectively freezing the app. 
This effect is even more pronounced on slower mobile devices.

Therefore, sometimes the **`JSON.parse` method creates a bad UX, 
freezing the app and causing all user's input events to being delayed.**

RAJI attempts to mitigate this problem by **splitting the parsing work in
chunks, and interleaving them with other tasks in the event loop**.
In other words, instead of parsing the whole payload within one 
event loop "tick", it distributes it across multiple ticks.
If during the parsing process the user generates some input events,
these are processed shortly afterward, keeping the UI responsive.

RAJI expose this functionality through a simple, **async** call.
So instead of parsing the payload as:

```js
const object = JSON.parse(payload)
```

you'll need to handle a promise:

```js
const object = await parse(payload);
```

## Installation

You can install it from NPM

```
npm install raji
```

Or using `yarn`:

```
yarn add raji
```

Or use directly in the browser:

```html
<script src="https://unpkg.com/raji/dist/raji.js"></script>
```

## Usage

To use RAJI, you can call the async `parse` method:

```ts
import { parse } from "raji"

const object = await parse(jsonPayload);
```

### Options

That method also accept an optional `option` parameter
to tune some optimizations:

```ts
const object = await parse(jsonPayload, {
  shortBodyThreshold: 1000,
});
```

These are the possible options:

| Option | Description | Default value |
| - | - | - |
| `asyncParsingAfterMillis` | Number of milliseconds after which the processing should become asynchronous. This is helpful to improve performance for short payloads, for which paying the price of going async might not be worth it. Set to `0` to disable this optimization. | 20 |
| `chunkMillisThreshold` | Maximum amount of time (in milliseconds) for which a chunk can be executed when using the `setTimeout` fallback | 50 |
| `shortBodyThreshold` | If the payload is smaller (in bytes) than this value, RAJI will call `JSON.parse` directly. This makes it much more efficient for small payloads in which chunking would be a useless overhead. Set to `0` to disable this optimization. | 10000 |
| `shortValueThreshold` | Maximum length of a JSON element (object or array) that can be feeded to `JSON.parse` during chunked processing. If an element is larger than that, it's recursively chunked. Set to `0` to disable this optimization. | 1000 |
| `yieldAfterThreshold` | RAJI batches the parsing "yields" if the number of scanned chars is below this threshold, improving performance. Set to `0` to disable this optimization. | 2000 |


## Testing

RAJI includes a comprehensive test suite thanks to the
(awesome) [JSONTestSuite](https://github.com/nst/JSONTestSuite) project.
To run the tests, first install all the required dependencies with `yarn`,
and then run the tests with:

```
yarn test
```

## Performance

**`JSON.parse` will always have an higher throughput than RAJI**.
The reason is simple, `JSON.parse` is a built-in method implemented
using efficient native code, which will always be faster 
than a JS-based solution. That said:

* Throughput is not the most important metric for a web frontend, but
response times and interaction delays are critical. **RAJI trades
better response times and interaction delays for lower throughput**.
* RAJI goes to great lengths to minimize the JS overhead. 
Instead of parsing the whole JSON at the JS level, it delegates the 
parsing to `JSON.parse` whenever possible.
For example, if a payload is small enough, RAJI will call `JSON.parse`
on it directly. On the other hand, if the payload is big it will 
recursively chunk it into smaller pieces, call `JSON.parse`
over each of them and recombine the result.

For small payloads, you can expect a 1.5x-2x slowdown.
For big payloads, the slowdown is in the 2x-10x range depending on 
the browser (with Firefox being the slowest and Chrome the fastest so far).

Therefore, RAJI is a safe choice for most scenarios, as it has comparable
performance for small payloads and guarantees good responsiveness
for big ones, preventing UI freezes.

## FAQ

### Is this relying on Web Workers?

No, all the parsing process is executed on the main thread, distributing the work over multiple chunks.

### Shouldn't you use Web Workers for this?

While we _could_ use Web Workers to move the parsing process
out of the main thread, that doesn't solve the problem with big payloads.
In particular, there's currently no way to share a _structured_ object
between a worker and main thread without causing an additional serialization
and deserialization, which are blocking operations.

In other words, you can parse the JSON without blocking the main thread
by moving the processing on a worker thread, but then you would have
to pay a similar price moving the object back to the main thread.
Therefore, this approach is only useful if you need small chunks
of derived data from this JSON on the main thread, and not the whole payload.

[This article](https://surma.dev/things/is-postmessage-slow/) does a great
job explaining the problem further, and it's a great read!

### Special thanks

I'd like to say thanks to all people that provided valuable feedback:

* Thanks to [@giacomocerquone](https://github.com/giacomocerquone) for the discussions we had on possible approaches to improve performance!