import fs from 'fs';
import path from 'path';

try {
  // process.cwd() points to the root of the project installing your package
  const targetProjectRoot = process.cwd();
  
  // Navigate up if npm executes from within node_modules during install
  const isInsideNodeModules = targetProjectRoot.includes('node_modules');
  const projectRoot = isInsideNodeModules 
    ? targetProjectRoot.split(`${path.sep}node_modules`)[0] 
    : targetProjectRoot;

  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Ensure the scripts block exists
    if (!pkg.scripts) pkg.scripts = {};

    // Only inject if it doesn't already exist to prevent overwrites
    if (!pkg.scripts['deddom']) {
      pkg.scripts['deddom'] = 'deddom';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf-8');
      console.log('✅ Successfully added "npm run deddom" to your package.json scripts.');
    }
  }
} catch (error) {
  console.error('⚠️ Could not automatically add deddom script to package.json:', error.message);
}
