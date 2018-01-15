'use strict';

process.env.TEST = true;

const loaders = require('./webpack/loaders');
const plugins = require('./webpack/plugins');
const webpack = require('./webpack.config');

module.exports = (config) => {
    const coverage = config.singleRun ? ['coverage'] : [];
    const pluginsWithDebug = getPluginsWithDebugOption(plugins, !config.singleRun);

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
                pattern: './src/index.spec.js',
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
            './src/index.spec.js': ['webpack', 'sourcemap'],
            './src/**/*.spec.ts': ['webpack', 'sourcemap'],
        },

        webpack: Object.assign({}, webpack, {
            output: null,
            devtool: 'inline-source-map',
            module: {
                loaders: combineLoaders(loaders),
            },
            stats: {
                colors: true,
                reasons: true,
            },
            plugins: pluginsWithDebug
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
            },
            HeadlessFirefox: {
                base: 'Firefox',
                flags: ['-headless']
            }
        }
    });
};

const combineLoaders = (loaders) =>
    Object.keys(loaders).reduce((aggregate, key) =>
            key === 'tslint' ? aggregate : aggregate.concat([loaders[key]]), []);

const getPluginsWithDebugOption = (plugins, debug) =>
    plugins.map(plugin => {
        if (!plugin.options) plugin.options = {};
        plugin.options.debug = debug;
        return plugin;
    })

