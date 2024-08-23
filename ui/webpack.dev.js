const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = (env, argv) => {
  const proxyHost = process.env.PROXY_HOST;

  const proxy = [
    {
      context: ['/api', '/images'],
      target: proxyHost,
      secure: false, // keep false for https hosts
    },
  ];

  return merge(common, {
    mode: 'development',
    output: {
      filename: '[name].[contenthash].js',
    },
    devtool: 'inline-source-map',
    devServer: {
      // contentBase: './dist',
      historyApiFallback: true,
      proxy: proxyHost ? proxy : undefined,
    },
  });
};
