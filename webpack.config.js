// Derived from https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate

var webpack = require("webpack"),
    path = require("path"),
    fileSystem = require("fs"),
    CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin,
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    WriteFilePlugin = require("write-file-webpack-plugin");

// load the secrets
var alias = {};

var fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

var options = {
  mode: "production",
  entry: {
    popup: path.join(__dirname, "app", "js", "popup.js"),
    background: path.join(__dirname, "app", "js", "background.js"),
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: "style-loader!css-loader",
        exclude: /node_modules/
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        loader: "file-loader?name=[name].[ext]",
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    alias: alias
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin(),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.EnvironmentPlugin(["NODE_ENV"]),
    new CopyWebpackPlugin([
      // have to copy this, can't minify or let node touch it because node wraps it in
      // a function which makes it not return the value we expect
      { from: "app/js/contentScript.js" },
      { from: "app/js/contentScriptStatement.js" }
    ]),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "app", "popup.html"),
      filename: "popup.html",
      chunks: ["popup"]
    }),
    new WriteFilePlugin()
  ]};

module.exports = options;
