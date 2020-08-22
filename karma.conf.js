'use strict';
const webpack = require('./webpack.config');
const WebpackKarmaDieHardPlugin = require('webpack-karma-die-hard');

module.exports = (config) => {
  const coverage = config.singleRun ? ['coverage'] : [];

  config.set({
    basePath: '',
    frameworks: [
      'jasmine',
    ],
    plugins: [
      'karma-jasmine',
      'karma-sourcemap-writer',
      'karma-sourcemap-loader',
      'karma-webpack',
      'karma-coverage',
      'karma-remap-istanbul',
      'karma-spec-reporter',
      'karma-chrome-launcher',
      'karma-firefox-launcher'
    ],
    mime: {
      'application/javascript': ['ts']
    },
    files: [
      {
        pattern: './test/index.spec.js',
        served: true,
        included: true,
        watched: true,
      }
    ],
    preprocessors: {
      './test/index.spec.js': ['webpack', 'sourcemap'],
      './test/**/*.spec.ts': ['webpack', 'sourcemap'],
    },
    webpack: Object.assign({}, webpack, {
      output: null,
      devtool: 'inline-source-map',
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: 'ts-loader?configFile=tsconfig.test.json'
          },
          istanbulInstrumenter,
        ],
      },
      plugins: [
        // Do not run tests if compilation failed
        new WebpackKarmaDieHardPlugin(),
      ],
    }),
    reporters: ['spec']
      .concat(coverage)
      .concat(coverage.length > 0 ? ['karma-remap-istanbul'] : []),
    remapIstanbulReporter: {
      src: [
        'coverage/chrome/coverage-final.json',
        'coverage/headlesschrome/coverage-final.json',
        'coverage/firefox/coverage-final.json'
      ],
      reports: {
        html: 'coverage',
        'text-summary': './coverage/summary.txt'
      },
      timeoutNotCreated: 2000,
      timeoutNoMoreFiles: 2000,
    },
    // only output json report to be remapped by remap-istanbul
    coverageReporter: {
      check: {
        global: {
          statements: 74,
          branches: 68,
          lines: 76,
          functions: 62,
        }
      },
      type: 'json',
      dir: './coverage/',
      subdir: browser => browser.toLowerCase().split(/[ /-]/)[0] // returns 'chrome' etc
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

const istanbulInstrumenter = {
  enforce: 'post',
  exclude: [/web-demo-app/, /^(.)*\.mock\.ts$/],
  test: /^(.(?!\.spec))*\.tsx?$/,
  loader: 'istanbul-instrumenter-loader',
  query: {
    embedSource: true,
  },
};
