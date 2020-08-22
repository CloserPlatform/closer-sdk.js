closer-sdk.js
==============

[![NPM](https://img.shields.io/npm/v/@closerplatform/closer-sdk.svg)](https://www.npmjs.com/package/@closerplatform/closer-sdk)

closer-sdk.js allows you to add Chat & WebRTC calls to your web and mobile apps.

### Technical Support
If you need technical support, please contact
[tech@closer.app](mailto:tech@closer.app).

Installation
------------

### NPM

We recommend using `npm` to add the CloserSDK as a dependency.

```
npm install closer-sdk --save
```

Using this method, you can `import` closer-sdk.js using ES Module or TypeScript syntax:

```js
import { CloserSDK } from 'closer-sdk';
```

Or using CommonJS:

```js
const CloserSDK = require('closer-sdk').CloserSDK;
```

Compatibility
--------------

### Works with:
- Chrome 67*
- Safari 11.1.1
- Mobile Safari iOS 11.4 (*webview is not supported)
- Firefox 61*
- Opera 54 (chrome67)
- Edge 42 (without Call.broadcast)

* Renegotiation doesn't work between chrome 67 & firefox 61 because of SDP incompatibilities.
Chrome still implements PlanB and firefox use Unified plan:
https://bugs.chromium.org/p/chromium/issues/detail?id=465349
This should be solved in M-69
For now, the solution is to add both tracks (audio&video) before the first sdp offer&answer is being sent and disable them if needed.
* rtcpMuxPolicy `negotiate` is not supported by Edge - use `require` instead 
* negotiationNeededDisabled turn on to disable in call renegotiation (which does't work between Chrome&Safari)
* Call broadcast & message event is based on RtcDataChannel which is not supported by Edge - check BrowserUtils.isBrowserSupported docs

Testing
-------

Running unit tests requires firefox and chrome browsers. You can run unit tests via:

```
npm run test
```

License
-------

See [LICENSE](https://github.com/CloserPlatform/closer-sdk.js/blob/master/LICENSE)
