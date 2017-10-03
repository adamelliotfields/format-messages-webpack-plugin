const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const FormatMessagesWebpackPlugin = require('../lib/FormatMessagesWebpackPlugin');

const { IgnorePlugin, DefinePlugin, HotModuleReplacementPlugin, NamedModulesPlugin } = webpack;

const NODE_ENV = process.env.NODE_ENV;
const APP_TITLE = 'Demo';
const PROTOCOL = 'http';
const HOST = '0.0.0.0';
const PORT = 3000;

module.exports = {
  devtool: 'eval',

  entry: {
    main: ['react-hot-loader/patch', path.join(__dirname, 'src', 'index.jsx')]
  },

  output: {
    pathinfo: true,
    publicPath: '/',
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].chunk.js',
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

  performance: {
    hints: false
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
          plugins: ['react-hot-loader/babel'],
          cacheDirectory: path.join(__dirname, '.cache')
        }
      }
    ]
  },

  plugins: [
    new FormatMessagesWebpackPlugin({ notifications: true }),
    new HTMLWebpackPlugin({
      inject: 'body',
      template: path.join(__dirname, 'src', 'templates', 'index.ejs'),
      title: APP_TITLE,
      favicon: path.join(__dirname, 'src', 'favicon', 'favicon.ico')
    }),
    new IgnorePlugin(/^\.\/locale$/, /moment$/),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
    }),
    new HotModuleReplacementPlugin(),
    new NamedModulesPlugin()
  ],

  devServer: {
    https: PROTOCOL === 'https',
    host: HOST,
    port: PORT,
    hot: true,
    compress: true,
    overlay: true,
    clientLogLevel: 'none',
    quiet: true,
    historyApiFallback: true,
    publicPath: '/',
    watchOptions: { ignored: /node_modules/ }
  }
};
