const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FormatMessagesWebpackPlugin = require('../lib/FormatMessagesWebpackPlugin');

const { IgnorePlugin, DefinePlugin } = webpack;
const { ModuleConcatenationPlugin, CommonsChunkPlugin } = webpack.optimize;

const NODE_ENV = process.env.NODE_ENV;
const APP_TITLE = 'Demo';
const PUBLIC_PATH = '/';

module.exports = {
  bail: true,

  devtool: 'source-map',

  stats: 'none',

  entry: {
    main: [path.join(__dirname, 'src', 'index.jsx')]
  },

  output: {
    path: path.join(__dirname, 'build'),
    publicPath: PUBLIC_PATH,
    filename: 'js/[name].[chunkhash:8].js',
    chunkFilename: 'js/[name].[chunkhash:8].chunk.js',
    devtoolModuleFilenameTemplate: (info) => (
      path
        .relative(path.join(__dirname, 'src'), info.absoluteResourcePath)
        .replace(/\\/g, '/')
    )
  },

  resolve: {
    extensions: ['.js', '.json', '.jsx', '.web.js', '.web.jsx'],
    alias: {
      'react-native': 'react-native-web'
    }
  },

  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        enforce: 'pre',
        loader: 'eslint-loader',
        exclude: /node_modules/,
        options: {
          formatter: require('../formatter'),
          emitWarning: true,
          parser: 'babel-eslint',
          baseConfig: {
            extends: ['semistandard-react']
          }
        }
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['react-latest'],
          compact: true
        }
      }
    ]
  },

  plugins: [
    new FormatMessagesWebpackPlugin(),
    new CleanWebpackPlugin(['build'], { verbose: false }),
    new HTMLWebpackPlugin({
      inject: 'body',
      template: path.join(__dirname, 'src', 'templates', 'index.ejs'),
      title: APP_TITLE,
      favicon: path.join(__dirname, 'src', 'favicon', 'favicon.ico'),
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    new IgnorePlugin(/^\.\/locale$/, /moment$/),
    new CommonsChunkPlugin({
      name: 'vendor',
      minChunks: (module) => module.context && module.context.indexOf('node_modules') !== -1
    }),
    new CommonsChunkPlugin({
      name: 'manifest',
      minChunks: Infinity
    }),
    new ModuleConcatenationPlugin(),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
    })
  ]
};
