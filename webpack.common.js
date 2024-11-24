const path = require('path');
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: {
    app: './js/app.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: './js/app.js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // ALL .scss files emitted under '<top-level-dist>/email-templates', maintaining sub-folder structure
        {
          from: 'shaders/*.fs',
          to: './',
        },
      ],
    })
  ]
};
