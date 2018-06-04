'use strict';

exports.tslint = {
    enforce: 'pre',
    test: /\.tsx?$/,
    loader: 'tslint-loader',
    exclude: [/node_modules/],
    options: {
      emitErrors: true
    }
};

exports.tsx = {
    test: /\.tsx?$/,
    loader: 'ts-loader',
    exclude: [/node_modules/],
};

exports.istanbulInstrumenter = {
    enforce: 'post',
    exclude: [/zz\.ts$/, /src-demo-app/],
    test: /^(.(?!\.spec))*\.tsx?$/,
    loader: 'istanbul-instrumenter-loader',
    query: {
        embedSource: true,
    },
};

exports.json = {
    test: /\.json$/,
    loader: 'json',
};
