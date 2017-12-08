'use strict';

const path = require('path');
const loaders = require('./webpack/loaders');
const plugins = require('./webpack/plugins');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src-demo-app/index.ts',

    output: {
        path: path.resolve(__dirname, 'dist-demo-app'),
        filename: 'index.js'
    },

    devtool: process.env.NODE_ENV === 'production' ?
        'source-map' :
        'inline-source-map',

    resolve: {
        extensions: [
            '.ts',
            '.js',
            '.json'
        ]
    },

    plugins: plugins.concat([
        new CopyWebpackPlugin([
            'src-demo-app/index.css'
        ]),
        new HtmlWebpackIncludeAssetsPlugin({
            assets: 'index.css',
            append: true
        }),
        new HtmlWebpackPlugin({
            template: 'src-demo-app/index.html',
            inject: 'body',
            hash: true
        })
    ]),

    module: {
        loaders: [
            loaders.tslint,
            {
                test: /\.tsx?$/,
                loader: 'ts-loader?configFile=tsconfig.demoapp.json'
            },
            loaders.json
        ],
    }
};
