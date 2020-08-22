'use strict';

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',

  output: {
    path: __dirname + '/dist',
    filename: 'index.js'
  },
  resolve: {
    extensions: [
      '.ts',
      '.js',
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      'src/index.css'
    ]),
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      inject: 'body',
      hash: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader?configFile=tsconfig.json'
      }
    ],
  }
};
