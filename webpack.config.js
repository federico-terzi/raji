const path = require("path");
// const TerserPlugin = require("terser-webpack-plugin");

module.exports = [
  {
    entry: "./src/index.ts",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      library: {
        name: "raji",
        type: "umd",
      },
      filename: "raji.js",
      path: path.resolve(__dirname, "dist"),
    },
    // optimization: {
    //   minimize: false,
    //   minimizer: [new TerserPlugin()],
    // },
  },
  {
    entry: "./src/index.ts",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    experiments: {
      outputModule: true,
    },
    output: {
      library: {
        type: "module",
      },
      filename: "raji.js",
      path: path.resolve(__dirname, "esm"),
    },
  },
];
