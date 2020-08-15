'use strict';

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: __dirname + '/src/index.ts',
  devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(),
  ],
  output: {
    path: __dirname + '/dist',
    filename: 'closer-sdk.js',
    library: 'CloserSDK',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  resolve: {
    unsafeCache: false,
    extensions: [
      '.ts',
      '.js',
      '.json'
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader?configFile=tsconfig.sdk.json'
      }
    ],
  },
  optimization: {
    // removeAvailableModules: false,
    // usedExports: true,
    // removeEmptyChunks: false,
    // splitChunks: false,
    // Set it to single to create a single runtime bundle for all chunks
    // runtimeChunk: 'single',
    minimize: true,
    usedExports: true,
    minimizer: [
      new TerserPlugin({
        sourceMap: true,
        extractComments: {
          condition: 'all',
          filename: () => '',
          banner: () => '',
        },
      })
    ],
  },
};
