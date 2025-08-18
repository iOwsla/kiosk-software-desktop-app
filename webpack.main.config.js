const path = require('path');

module.exports = {
  entry: './src/main/main.ts',
  target: 'electron-main',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'api'),
          path.resolve(__dirname, 'shared')
        ],
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
    filename: 'main.js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/api': path.resolve(__dirname, 'api'),
      '@/shared': path.resolve(__dirname, 'shared')
    }
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: [
    'better-sqlite3',
    'bcrypt',
    'sqlite3',
    'mongoose',
    'mysql2/promise'
  ].reduce((acc, name) => ({...acc, [name]: `commonjs ${name}`}), {})
};