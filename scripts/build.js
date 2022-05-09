const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

esbuild.build({
  entryPoints: ['index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'bin/index.js',
  plugins: [nodeExternalsPlugin()],
});
