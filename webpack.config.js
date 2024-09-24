const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './script.ts',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: {
        "fs": false,
        "path": false,
        "os": false,
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-typescript']
              }
            },
            'ts-loader'
          ],
          exclude: /node_modules/,
        },
      ],
    },
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
      }),
      new HtmlWebpackPlugin({
        template: './student.html',
        filename: 'student.html',
      }),
      new HtmlWebpackPlugin({
        template: './teacher.html',
        filename: 'teacher.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'styles.css', to: 'styles.css' },
        ],
      }),
      new webpack.DefinePlugin({
        'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
        'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY),
        'process.env.TEACHER_PASSWORD': JSON.stringify(process.env.TEACHER_PASSWORD),
      }),
    ],
  };
};
