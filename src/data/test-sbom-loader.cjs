// Simple test script to load and parse real SBOM data
const fs = require('fs');
const path = require('path');

// Read the real SBOM file
const sbomPath = path.join(__dirname, 'test-sbom1', 'sbom_SCA scans_python_root_2025-10-06.json');
const sbomData = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));

console.log('SBOM File loaded successfully!');
console.log('Total components:', sbomData.components.length);
console.log('Total dependencies:', sbomData.dependencies.length);

// Find jupyter-console
const jupyterConsole = sbomData.components.find(c => c.name === 'jupyter-console');
if (jupyterConsole) {
  console.log('\nFound jupyter-console:');
  console.log('- Name:', jupyterConsole.name);
  console.log('- Version:', jupyterConsole.version);
  console.log('- Type:', jupyterConsole.type);
  console.log('- License:', jupyterConsole.licenses?.[0]?.license?.name || 'Unknown');
}

// Find jupyter-console dependencies
const jupyterDeps = sbomData.dependencies.find(d => d.ref === 'jupyter-console==6.6.3');
if (jupyterDeps) {
  console.log('\nJupyter-console dependencies:');
  console.log('- Count:', jupyterDeps.dependsOn.length);
  jupyterDeps.dependsOn.forEach((dep, index) => {
    console.log(`  ${index + 1}. ${dep}`);
  });
}

// Check if all dependencies exist as components
if (jupyterDeps) {
  console.log('\nChecking if all dependencies exist as components:');
  jupyterDeps.dependsOn.forEach(dep => {
    const depName = dep.split('==')[0];
    const exists = sbomData.components.some(c => c.name === depName);
    console.log(`  ${depName}: ${exists ? '✓' : '✗'}`);
  });
}
