module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@app': './src/app',
            '@presentation': './src/presentation',
            '@domain': './src/domain',
            '@data': './src/data',
            '@sync': './src/sync',
            '@shared': '../../packages/shared/src',
          },
        },
      ],
    ],
  };
};
