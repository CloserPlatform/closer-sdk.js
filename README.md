![SDK](./sdk.png)

# Ratel JavaScript SDK
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
- Firefox 61*
- Opera 54 (chrome67)

* Renegotiation doesn't work between chrome 67 & firefox 61 because of SDP incompatibilities.
Chrome still implements PlanB and firefox use Unified plan:
https://bugs.chromium.org/p/chromium/issues/detail?id=465349
This should be solved in M-69
For now, the solution is to add both tracks (audio&video) before the first sdp offer&answer is being sent and disable them if needed.
