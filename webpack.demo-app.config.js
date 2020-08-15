'use strict';

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src-demo-app/index.ts',

  output: {
    path: __dirname + '/dist-demo-app',
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
      'src-demo-app/index.css'
    ]),
    new HtmlWebpackPlugin({
      template: 'src-demo-app/index.html',
      inject: 'body',
      hash: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader?configFile=tsconfig.demoapp.json'
      }
    ],
  }
};
