# closer-sdk.js
web-demo-app uses @swagger/spinner, make sure npm can install it by creating a file `.npmrc` with contents: 
```
registry=https://nexus.ratel.io/repository/npm/
```

Building:

```
npm ci
npm run build
```

Running:

```
npm start
```

Test environment:

```
npm test
npm run test-dev
```

## Tested on:
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
