'use strict';

process.env.TEST = true;

const loaders = require('./webpack/loaders');
const plugins = require('./webpack/plugins');
const webpack = require('./webpack.config');

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
                pattern: './src/**/*.spec.ts',
                served: true,
                included: true,
                watched: true,
            },
            {
                pattern: '**/*.map',
                served: true,
                included: false,
                watched: true,
            },
        ],

        exclude: [
            './src/fixtures.spec.ts'
        ],

        preprocessors: {
            './src/**/*.spec.ts': ['webpack', 'sourcemap'],
        },

        webpack: Object.assign({}, webpack, {
            output: null,
            devtool: 'inline-source-map',
            verbose: false,
            module: {
                loaders: combinedLoaders(),
                postLoaders: config.singleRun
                    ? [ loaders.istanbulInstrumenter ]
                    : [ ],
            },
            stats: {
                colors: true,
                reasons: true,
            },
            debug: config.singleRun ? false : true,
            plugins,
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
            },
            timeoutNotCreated: 2000,
            timeoutNoMoreFiles: 2000,
        },

        // only output json report to be remapped by remap-istanbul
        coverageReporter: {
            type: 'json',
            dir: './coverage/',
            subdir: (browser) => browser.toLowerCase().split(/[ /-]/)[0] // returns 'chrome' etc
        },

        port: 9876,

        colors: true,

        logLevel: config.singleRun ? config.LOG_INFO : config.LOG_DEBUG,

        autoWatch: true,

        browsers: ['ChromeWithFakeUserMedia', 'Firefox'],

        customLaunchers: {
            ChromeWithFakeUserMedia: {
                base: 'Chrome',
                flags: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
            },
            HeadlessChrome: {
                base: 'Chrome',
                flags: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
                        '--headless', '--disable-gpu', '--remote-debugging-port=9222']
            }
        }
    });
};

function combinedLoaders() {
    return Object.keys(loaders).reduce(function reduce(aggregate, k) {
        switch (k) {
        case 'istanbulInstrumenter':
        case 'tslint':
            return aggregate;
        default:
            return aggregate.concat([loaders[k]]);
        }
    }, []);
}
