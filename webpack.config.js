var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './src/artichoke.js',
    output: {
        path: path.resolve(__dirname, '.'),
        filename: 'ratel-sdk.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    stats: {
        colors: true
    },
    devtool: 'source-map'
};
