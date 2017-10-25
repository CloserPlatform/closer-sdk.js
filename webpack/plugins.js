'use strict';

const path = require('path');
const webpack = require('webpack');

const sourceMap = process.env.TEST || process.env.NODE_ENV !== 'production'
  ? [new webpack.SourceMapDevToolPlugin({ filename: null, test: /\.tsx?$/ })]
  : [];

const basePlugins = [
  new webpack.DefinePlugin({
    __DEV__: process.env.NODE_ENV !== 'production',
    __TEST__: JSON.stringify(process.env.TEST || false),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  new webpack.NoEmitOnErrorsPlugin()
].concat(sourceMap);

const devPlugins = [];

const prodPlugins = [
  // // FIXME UglifyJS doesn't work well with ts-loader.
  // new webpack.optimize.UglifyJsPlugin({
  //   compress: {
  //     warnings: true,
  //   },
  // }),
];

module.exports = basePlugins
  .concat(process.env.NODE_ENV === 'production' ? prodPlugins : [])
  .concat(process.env.NODE_ENV === 'development' ? devPlugins : []);
