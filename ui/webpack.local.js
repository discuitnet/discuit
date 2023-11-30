const { merge } = require('webpack-merge');
const prod = require('./webpack.prod.js');

module.exports = merge(prod, {
  devtool: 'source-map',
});
