// Copied from https://github.com/jeromecoupe/webstoemp
const path = require("path");

module.exports = {
  mode: "production",
  entry: "./app/js/popup.js",
  output: {
    path: path.resolve(__dirname, "./dist/js"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        include: [path.resolve(__dirname, "./src/assets/js")],
        loader: "eslint-loader",
      },
      {
        test: /\.js?$/,
        include: [path.resolve(__dirname, "./src/assets/js")],
        loader: "babel-loader",
      },
    ],
  },
};