// inspect-api.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Inspecting your API routes...\n');

// Function to read file content
function readFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Show first 10 lines
    const lines = content.split('\n').slice(0, 10);
    return lines.join('\n');
  } catch (error) {
    return `Error reading file: ${error.message}`;
  }
}

// Check API routes
const apiRoutes = [
  'app/api/users/exists/route.ts',
  'app/api/users/exists/route.js',
  'app/api/auth/login/route.ts',
  'app/api/auth/login/route.js',
  'app/api/auth/register/route.ts',
  'app/api/auth/register/route.js',
  'app/api/auth/verify/route.ts',
  'app/api/auth/verify/route.js',
];

console.log('📁 Checking for API route files:\n');
apiRoutes.forEach(route => {
  const fullPath = path.join(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found: ${route}`);
    console.log('   First 10 lines:');
    console.log('   ' + readFileContent(fullPath).split('\n').join('\n   '));
    console.log('');
  }
});

// List entire app directory structure
console.log('\n📂 Complete /app directory structure:');
function listDirectory(dir, indent = '') {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      if (item.startsWith('.')) return; // Skip hidden files
      
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`${indent}📁 ${item}/`);
        if (!item.includes('node_modules')) {
          listDirectory(itemPath, indent + '  ');
        }
      } else {
        const ext = path.extname(item);
        const icon = ['.ts', '.tsx', '.js', '.jsx'].includes(ext) ? '📄' : '📃';
        console.log(`${indent}${icon} ${item}`);
      }
    });
  } catch (error) {
    console.log(`${indent}❌ Error reading directory: ${error.message}`);
  }
}

const appPath = path.join(process.cwd(), 'app');
if (fs.existsSync(appPath)) {
  listDirectory(appPath);
} else {
  console.log('❌ No /app directory found!');
}

// Check if using pages directory
const pagesPath = path.join(process.cwd(), 'pages');
if (fs.existsSync(pagesPath)) {
  console.log('\n⚠️  Also found /pages directory - make sure you\'re not mixing routers!');
}

// Check for common issues
console.log('\n🔍 Common Issues to Check:');
console.log('1. Make sure route files are named exactly "route.ts" or "route.js"');
console.log('2. Ensure you\'re exporting named functions (GET, POST, etc.)');
console.log('3. Check that you\'re using App Router syntax, not Pages Router');
console.log('4. Verify no TypeScript errors are preventing compilation');

// Check tsconfig
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('\n📋 TypeScript Config found');
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('   Include paths:', tsconfig.include || 'default');
    console.log('   Exclude paths:', tsconfig.exclude || 'default');
  } catch (error) {
    console.log('   Error reading tsconfig.json');
  }
}