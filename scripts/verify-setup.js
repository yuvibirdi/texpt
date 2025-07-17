#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying LaTeX Presentation Editor setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'electron/main.ts',
  'electron/preload.ts',
  'electron/tsconfig.json',
  'src/index.tsx',
  'src/App.tsx',
  'src/setupTests.ts',
  'public/index.html',
  '.gitignore',
  'README.md'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check build directory
const buildExists = fs.existsSync(path.join(__dirname, '..', 'build'));
console.log(`\n🏗️  Build directory: ${buildExists ? '✅ Present' : '❌ Missing'}`);

// Check node_modules
const nodeModulesExists = fs.existsSync(path.join(__dirname, '..', 'node_modules'));
console.log(`📦 Dependencies: ${nodeModulesExists ? '✅ Installed' : '❌ Missing'}`);

// Check package.json scripts
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const requiredScripts = ['dev', 'build', 'test', 'start', 'build-react', 'build-electron'];
  
  console.log('\n🚀 Checking npm scripts:');
  requiredScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    console.log(`  ${exists ? '✅' : '❌'} ${script}`);
  });
} catch (error) {
  console.log('❌ Error reading package.json');
}

console.log('\n' + '='.repeat(50));
if (allFilesExist && buildExists && nodeModulesExists) {
  console.log('🎉 Setup verification complete! All systems ready.');
  console.log('\n💡 Next steps:');
  console.log('   • Run "npm run dev" to start development');
  console.log('   • Run "npm test" to run tests');
  console.log('   • Run "npm run build" to create production build');
} else {
  console.log('⚠️  Setup incomplete. Please check missing items above.');
}
console.log('='.repeat(50));