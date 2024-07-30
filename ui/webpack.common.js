const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const fs = require('fs');
const YAML = require('yaml');
const webpack = require('webpack');

function makeid(length) {
  let result = '';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = chars.length;
  let counter = 0;
  while (counter < length) {
    result += chars.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function readYamlConfigFile() {
  const file = fs.readFileSync('../ui-config.yaml', 'utf-8');
  const preConfig = YAML.parse(file);
  const allowedKeys = [
    'siteName',
    'captchaSiteKey',
    'emailContact',
    'facebookURL',
    'twitterURL',
    'instagramURL',
    'discordURL',
    'githubURL',
    'substackURL',
    'disableImagePosts',
    'disableForumCreation',
    'forumCreationReqPoints',
    'defaultFeedSort',
    'maxImagesPerPost',
  ];
  const config = {};
  for (let key in preConfig) {
    if (allowedKeys.includes(key)) {
      config[key] = preConfig[key];
    }
  }
  if (!config.defaultFeedSort) {
    config.defaultFeedSort = 'hot';
  }
  config.cacheStorageVersion = makeid(8); // changes on each build

  return config;
}

module.exports = {
  entry: {
    app: './src/index.js',
    'service-worker': {
      import: './service-worker.js',
      filename: '[name].js',
    },
  },
  output: {
    filename: '[name].js',
    assetModuleFilename: '[name][ext]',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './index.html',
      manifest: './manifest.json',
    }),
    new NodePolyfillPlugin(),
    new webpack.DefinePlugin({ CONFIG: JSON.stringify(readYamlConfigFile()) }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },
      {
        test: /\.m?(js|jsx)$/,
        exclude: /(node_modules|bower_components|service-worker.js)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(json)$/i,
        type: 'asset/resource',
      },
    ],
  },
};
