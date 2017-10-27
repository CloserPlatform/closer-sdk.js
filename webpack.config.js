'use strict';

const path = require('path');
const loaders = require('./webpack/loaders');
const plugins = require('./webpack/plugins');

module.exports = {
    entry: path.resolve(__dirname, 'src/main.ts'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'ratel-sdk.js',
        library: 'RatelSDK',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },

    devtool: process.env.NODE_ENV === 'production' ?
        'source-map' :
        'inline-source-map',

    resolve: {
        unsafeCache: false,
        extensions: [
            '.ts',
            '.js',
            '.json'
        ]
    },

    plugins: plugins,

    module: {
        rules: [
            loaders.tslint,
            loaders.tsx,
            loaders.json
        ],
    }
};
