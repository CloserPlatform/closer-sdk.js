// Single entrypoint for tests. Prevents multiple shimming window by webrtc-adapter
const testsContext = require.context(".", true, /\.spec\.ts/);
testsContext.keys().forEach(testsContext);
