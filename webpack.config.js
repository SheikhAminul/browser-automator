const path = require('path')

module.exports = {
	target: 'web',
	entry: {
		'index': './src/index.ts',
		'library': './src/library.ts',
		'self': './src/self.ts',
		'browser': './src/browser.ts',
		'page': './src/page.ts'
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'lib'),
		libraryTarget: 'umd',
		globalObject: 'this',
		umdNamedDefine: true
	},
	mode: 'production',
	module: {
		rules: [
			{
				test: /\.(ts)?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.ts'],
		modules: ['src', 'node_modules']
	}
}