var raji;(()=>{"use strict";var e={d:(t,n)=>{for(var r in n)e.o(n,r)&&!e.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:n[r]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};e.r(t),e.d(t,{parse:()=>i});const n={asyncParsingAfterMillis:20,chunkMillisThreshold:50,enableSyncStartupOptimization:!0,enableShortBodyOptimization:!0,enableShortValueOptimization:!0,shortBodyThreshold:1e4,shortValueThreshold:1e3};function r(e,t){return new Promise(((n,r)=>{setTimeout((()=>{try{const r=(new Date).getTime();for(;(new Date).getTime()-r<t;){const t=e.next();if(t.done)return void n(t.value[0])}n(void 0)}catch(e){return void r(e)}}),0)}))}function o(e,t,n){return function(e,t,n,r){return new(n||(n=Promise))((function(o,i){function c(e){try{a(r.next(e))}catch(e){i(e)}}function s(e){try{a(r.throw(e))}catch(e){i(e)}}function a(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(c,s)}a((r=r.apply(e,t||[])).next())}))}(this,void 0,void 0,(function*(){if(n>0)try{const t=function(e,t){const n=(new Date).getTime();for(;(new Date).getTime()-n<t;){const t=e.next();if(t.done)return t.value[0]}}(e,n);if(void 0!==t)return Promise.resolve(t)}catch(e){return Promise.reject(e)}for(;;)try{const n=yield r(e,t);if(void 0!==n)return Promise.resolve(n)}catch(e){return Promise.reject(e)}}))}function i(e,t){var r,i,c,s,a,u;return c=this,s=void 0,u=function*(){if(e.length<(null!==(r=null==t?void 0:t.shortBodyThreshold)&&void 0!==r?r:n.shortBodyThreshold)&&(null!==(i=null==t?void 0:t.enableShortBodyOptimization)&&void 0!==i?i:n.enableShortBodyOptimization))return Promise.resolve(JSON.parse(e));const c=void 0!==t?Object.assign(Object.assign({},n),t):n,s=function*(e,t,n){const[r,o]=yield*f(e,0,n);return function(e,t){for(;;){const n=e[t];switch(n){case" ":case"\t":case"\n":case"\r":t++;break;case void 0:return;default:throw new Error("expected whitespace, found: "+n)}}}(e,o+1),[r,o]}(e,0,c);return o(s,c.chunkMillisThreshold,c.enableSyncStartupOptimization?c.asyncParsingAfterMillis:0)},new((a=void 0)||(a=Promise))((function(e,t){function n(e){try{o(u.next(e))}catch(e){t(e)}}function r(e){try{o(u.throw(e))}catch(e){t(e)}}function o(t){var o;t.done?e(t.value):(o=t.value,o instanceof a?o:new a((function(e){e(o)}))).then(n,r)}o((u=u.apply(c,s||[])).next())}))}function c(e,t,n,r){let o=0,i=!1,c=!1,s=0;const a=0===r?"[":"{",u=0===r?"]":"}";for(;s<n;){const n=e[t];if(void 0===n)throw new Error("unexpected EOF while searching for objects");if(c)c=!1;else if('"'===n)i=!i;else if("\\"!==n||c)if(n!==a||i){if(n===u&&!i&&(o--,0===o))return t}else o++;else c=!0;s++,t++}}function*s(e,t,n,r){if(r.enableShortValueOptimization){const o=c(t,n,r.shortValueThreshold,1);if(void 0!==o){const r=t.slice(n,o+1);return Object.assign(e,JSON.parse(r)),o}}return yield*function*(e,t,n,r){n++;const[o,i]=l(t,n);if("}"===o)return i;e:for(;;){const[o,i]=u(t,n);n=i+1;const[c,s]=l(t,n);if(":"!==c)throw new Error("invalid JSON syntax, expected colon :");n=s+1;const[a,d]=yield*f(t,n,r);n=d+1,e[o]=a,yield;const[h,y]=l(t,n);switch(h){case",":n=y+1;continue;case"}":n=y;break e;default:throw new Error("unexpected end of object, char: "+h)}}return n}(e,t,n,r)}function*a(e,t,n,r){if(r.enableShortValueOptimization){const o=c(t,n,r.shortValueThreshold,0);if(void 0!==o){const r=t.slice(n,o+1),i=JSON.parse(r);for(let t=0;t<i.length;t++)e.push(i[t]);return o}}return yield*function*(e,t,n,r){n++;const[o,i]=l(t,n);if("]"===o)return i;e:for(;;){const[o,i]=yield*f(t,n,r);n=i+1,e.push(o),yield;const[c,s]=l(t,n);switch(c){case",":n=s+1;continue;case"]":n=s;break e;default:throw new Error("unexpected end of array, char: "+c)}}return n}(e,t,n,r)}function u(e,t){let n=!1;const[r,o]=l(e,t);if('"'!==r)throw new Error("expected start of string");for(t=o+1;;){const r=e[t];if(void 0===r)throw new Error("unexpected EOF");if(n)n=!1;else{if('"'===r){const n=e.slice(o,t+1);return[JSON.parse(n),t]}"\\"!==r||n||(n=!0)}t++}}function l(e,t){for(;;){const n=e[t];switch(n){case" ":case"\t":case"\n":case"\r":t++;break;case void 0:throw new Error("EOF while parsing non-whitespace");default:return[n,t]}}}function*f(e,t,n){const[r,o]=l(e,t);switch(r){case"{":const t={};return[t,yield*s(t,e,o,n)];case"[":const r=[];return[r,yield*a(r,e,o,n)];case'"':return u(e,o);default:return function(e,t){let n=t;for(;;){switch(e[t]){case",":case"]":case"}":case'"':case void 0:const r=e.slice(n,t);return[JSON.parse(r),t-1]}t++}}(e,o)}}raji=t})();
//# sourceMappingURL=bundle.js.map