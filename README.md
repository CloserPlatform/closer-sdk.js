![SDK](./sdk.png)

# Ratel JavaScript SDK
demo-app uses @swagger/spinner, make sure npm can install it by creating a file `.npmrc` with contents: 
```
strict-ssl=false
registry=https://nexus.ratel.io/repository/npm/
```

Building:

```
npm install
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

## 307 response:
When run locally, SDK will connect with ratel & artichoke via `http` protocol.
 This causes HSTS problem.
 To hack this in Chrome (http://stackoverflow.com/questions/34108241/non-authoritative-reason-header-field-http):
 - open chrome://net-internals/#hsts
 - delete domains: 'api.dev.ratel.io' and 'artichoke.ratel.io'
 - enjoy


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

## Callstats
To enable Callstats:
* pass proper configuration
```
callstats: {
  appId: 'your-app-id',
  appSecret: 'your-app-secret'
}
```
* ensure that Callstats library is properly loaded
  * web: https://docs.callstats.io/javascript/#step-1-include-callstats-js
  * React Native: https://www.npmjs.com/package/react-native-callstats
