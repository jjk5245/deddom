import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./dedupe.mjs'], // Your source file
  outdir: './dist',                // Your minified bundle output
  bundle: true,                    // Combine imports into one file
//   minify: true,                    // Compress variable names, strip comments
  platform: 'node',                // Target Node.js ecosystem
  format: 'cjs',                   // Output format (CommonJS or ESM)
  target: 'node18',                // Language syntax features target
  banner: {
    // Re-injects the critical executable header above minified code
    js: '#!/usr/bin/env node', 
  },
  // Keep external dependencies out of the code if you want them pulled via npm
  external: ['@babel/parser', '@babel/traverse', 'uuid'], 
}).catch(() => process.exit(1));

console.log('⚡ Build complete and minified into dist/dedupe.js');
