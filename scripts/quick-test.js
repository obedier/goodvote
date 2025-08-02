#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 GoodVote Quick Test Setup Validation\n');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  details: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  results.details.push({ name, passed, details });
}

// Check if test scripts exist
const testScripts = [
  'scripts/test-database.js',
  'scripts/test-api.js',
  'scripts/test-frontend.js',
  'scripts/run-tests.js'
];

console.log('📁 Checking Test Scripts...');
for (const script of testScripts) {
  const exists = fs.existsSync(script);
  logTest(`Script exists: ${script}`, exists);
}

// Check if package.json has test scripts
console.log('\n📦 Checking Package.json...');
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasTestScripts = packageJson.scripts && 
    packageJson.scripts.test && 
    packageJson.scripts['test:db'] && 
    packageJson.scripts['test:api'] && 
    packageJson.scripts['test:frontend'];
  
  logTest('Package.json has test scripts', hasTestScripts);
  
  // Check dependencies
  const hasTestDeps = packageJson.dependencies && 
    packageJson.dependencies['node-fetch'] && 
    packageJson.dependencies.puppeteer;
  
  logTest('Test dependencies installed', hasTestDeps);
} else {
  logTest('Package.json exists', false);
}

// Check if docs folder has test documentation
console.log('\n📚 Checking Documentation...');
const docsPath = path.join(process.cwd(), '..', 'docs');
const testPlanExists = fs.existsSync(path.join(docsPath, 'test-plan.md'));
const manualChecklistExists = fs.existsSync(path.join(docsPath, 'manual-validation-checklist.md'));

logTest('Test plan documentation exists', testPlanExists);
logTest('Manual validation checklist exists', manualChecklistExists);

// Check if .env.local exists
console.log('\n🔧 Checking Environment...');
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);
logTest('Environment file exists', envExists, envExists ? '.env.local found' : '.env.local not found');

// Check if scripts directory exists
console.log('\n📂 Checking Directory Structure...');
const scriptsDir = path.join(process.cwd(), 'scripts');
const scriptsDirExists = fs.existsSync(scriptsDir);
logTest('Scripts directory exists', scriptsDirExists);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 QUICK TEST SUMMARY');
console.log('='.repeat(50));

console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

if (results.failed > 0) {
  console.log('\n❌ Issues Found:');
  results.details
    .filter(test => !test.passed)
    .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Install missing dependencies: npm install');
  console.log('   2. Create .env.local file with database credentials');
  console.log('   3. Ensure database is running with FEC data');
  console.log('   4. Start development server: npm run dev');
  console.log('   5. Run full test suite: npm run test');
} else {
  console.log('\n🎉 All tests passed! Test setup is ready.');
  console.log('\n💡 You can now run:');
  console.log('   - npm run test (run all tests)');
  console.log('   - npm run test:db (database tests only)');
  console.log('   - npm run test:api (API tests only)');
  console.log('   - npm run test:frontend (frontend tests only)');
}

console.log('\n📖 For manual testing, see: docs/manual-validation-checklist.md');

process.exit(results.failed > 0 ? 1 : 0); 