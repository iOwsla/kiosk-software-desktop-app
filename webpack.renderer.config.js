/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');


module.exports = {
  entry: {
    renderer: './src/renderer/index.tsx'
  },
  target: 'web',
  mode: process.env.NODE_ENV || 'development',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        include: /src/,
        use: [{
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: 'tsconfig.json',
            compilerOptions: {
              declaration: false,
              noEmit: false,
              module: 'ESNext'
            }
          }
        }]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js')
              }
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
    clean: false
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      templateParameters: {
        isDevelopment: process.env.NODE_ENV !== 'production'
      }
    }),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'typeof require': '"function"'
    }),
    new webpack.ProvidePlugin({
      global: 'globalThis',
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    ...(process.env.NODE_ENV !== 'production' ? [new webpack.HotModuleReplacementPlugin()] : [])
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/pages': path.resolve(__dirname, 'src/pages'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/shared': path.resolve(__dirname, 'shared')
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "util": require.resolve("util"),
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring-es3"),
      "fs": false,
      "net": false,
      "tls": false
    }
  },
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false
      },
      webSocketTransport: 'ws',
      logging: 'warn'
    },
    webSocketServer: 'ws',
    liveReload: false,
    static: false,
    compress: true
  }
};