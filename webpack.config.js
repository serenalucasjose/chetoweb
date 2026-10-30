const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerWebpackPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
    entry: './src/js/main.js',
    mode: 'production',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            inject: 'body'
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'static' }
            ]
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css'
        })
    ],
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader, // Replaces 'style-loader'
                    { loader: 'css-loader', options: { url: false } }, // las url() apuntan a /img del sitio publicado
                    { loader: 'sass-loader', options: { api: 'modern' } }
                ],
            },
        ],
    },
    performance: {
        hints: false, // imágenes y videos estáticos pesan más que el bundle
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserWebpackPlugin(), // Minifies JavaScript
            new CssMinimizerWebpackPlugin() // Minifies CSS
        ],
    }
};