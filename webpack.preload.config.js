const path = require('path');

module.exports = {
  entry: './src/main/preload/preload.ts',
  target: 'electron-preload',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: 'tsconfig.json',
            compilerOptions: {
              declaration: false,
              noEmit: false
            }
          }
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'preload.js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/shared': path.resolve(__dirname, 'shared')
    }
  },
  node: {
    __dirname: false,
    __filename: false
  }
};