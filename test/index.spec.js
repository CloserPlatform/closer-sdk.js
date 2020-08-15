// Single entrypoint for tests. Prevents multiple shimming window by webrtc-adapter
const testsContext = require.context('.', true, /\.spec\.(ts|mock)/);
testsContext.keys().forEach(testsContext);