var path = require('path');
var webpack = require('webpack');
var TypedocPlugin = require('typedoc-webpack-plugin');

module.exports = {
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'ratel-sdk.js',
        libraryTarget: 'var',
        library: 'RatelSDK'
    },
    plugins: [
        new TypedocPlugin({
            externalPattern: "**/tests/**"
        })
    ],
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            }
        ]
    },
    stats: {
        colors: true
    },
    devtool: 'source-map'
};
