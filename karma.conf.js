'use strict';
const testTsconfig = require('./tsconfig.test.json');

module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: [
      'jasmine', 'karma-typescript'
    ],
    plugins: [
      'karma-jasmine',
      'karma-typescript',
      'karma-coverage',
      'karma-chrome-launcher',
      'karma-firefox-launcher'
    ],
    files: [
      { pattern: 'src/**/*.ts' },
      { pattern: 'test/**/*.ts' }
    ],
    preprocessors: {
      'src/**/*.ts': ['karma-typescript', 'coverage'],
      'test/**/*.ts': ['karma-typescript']
    },
    reporters: ['progress', 'coverage', 'karma-typescript'],
    karmaTypescriptConfig: testTsconfig,
    // only output json report to be remapped by remap-istanbul
    coverageReporter: {
      check: {
        global: {
          statements: 85,
          branches: 75,
          functions: 80,
          lines: 85,
        }
      },
      dir: './coverage/',
      reporters: [
        // reporters not supporting the `file` property
        { type: 'html', subdir: 'report-html' },
        { type: 'lcov', subdir: 'report-lcov' },
        // reporters supporting the `file` property, use `subdir` to directly
        // output them in the `dir` directory
        // { type: 'cobertura', subdir: '.', file: 'cobertura.txt' },
        // { type: 'lcovonly', subdir: '.', file: 'report-lcovonly.txt' },
        { type: 'text', subdir: '.', file: 'text.txt' },
        { type: 'text-summary', subdir: '.', file: 'text-summary.txt' },
      ],
    },
    port: 9876,
    colors: true,
    logLevel: config.singleRun ? config.LOG_INFO : config.LOG_DEBUG,
    autoWatch: true,
    browsers: ['ChromeWithFakeUserMedia', 'Firefox'],
    customLaunchers: {
      ChromeWithFakeUserMedia: {
        base: 'Chrome',
        flags: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--headless', "--no-sandbox"]
      },
      HeadlessChrome: {
        base: 'Chrome',
        flags: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
          '--headless', '--disable-gpu', '--remote-debugging-port=9222']
      },
      HeadlessFirefox: {
        base: 'Firefox',
        flags: ['-headless']
      }
    }
  });
};