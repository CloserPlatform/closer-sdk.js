'use strict';

var path = require('path');
const loaders = require('./webpack/loaders');
const plugins = require('./webpack/plugins');

module.exports = {
    entry: './src/main.ts',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'ratel-sdk.js',
        libraryTarget: 'var',
        library: 'RatelSDK'
    },

    devtool: process.env.NODE_ENV === 'production' ?
        'source-map' :
        'inline-source-map',

    resolve: {
        extensions: [
            '',
            '.webpack.js',
            '.web.js',
            '.tsx',
            '.ts',
            '.js',
            '.json'
        ],
    },

    plugins: plugins,

    module: {
        preLoaders: [
            loaders.tslint
        ],
        loaders: [
            loaders.tsx,
            loaders.json
        ],
    }
};
