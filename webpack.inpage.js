const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    inpage: path.join(__dirname, 'src/inpage.js'),
  },
  output: {
    path: path.join(__dirname, 'dist/js'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {},
    symlinks: false,
  },
  plugins: [],
};
