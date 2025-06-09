// show-structure.js
const fs = require('fs');
const path = require('path');

console.log('📁 Project Structure:\n');

// Function to create tree structure
function createTree(dir, prefix = '', isLast = true, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return;
  
  const files = fs.readdirSync(dir).filter(f => {
    // Skip these directories/files
    return !['.git', 'node_modules', '.next', '.env', 'dist', 'build'].includes(f);
  });
  
  files.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const isLastFile = index === files.length - 1;
    const stats = fs.statSync(filePath);
    const isDirectory = stats.isDirectory();
    
    // Print current item
    console.log(prefix + (isLastFile ? '└── ' : '├── ') + file + (isDirectory ? '/' : ''));
    
    // Recurse if directory
    if (isDirectory) {
      const extension = isLastFile ? '    ' : '│   ';
      createTree(filePath, prefix + extension, isLastFile, depth + 1, maxDepth);
    }
  });
}

// Start from current directory
createTree(process.cwd());

// Also show specific important files content
console.log('\n📄 Key Files:\n');

// Check for main page files
const pageFiles = [
  'app/page.tsx',
  'app/page.jsx',
  'app/page.js',
  'src/app/page.tsx',
  'src/app/page.jsx',
  'src/app/page.js',
  'pages/index.tsx',
  'pages/index.jsx',
  'pages/index.js'
];

console.log('🏠 Main Page File:');
let foundPage = false;
for (const file of pageFiles) {
  if (fs.existsSync(file)) {
    console.log(`Found: ${file}`);
    console.log('First 20 lines:');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').slice(0, 20);
    console.log(lines.map(l => '  ' + l).join('\n'));
    foundPage = true;
    break;
  }
}

if (!foundPage) {
  console.log('❌ No main page file found!');
}

// Check layout files
console.log('\n📐 Layout File:');
const layoutFiles = [
  'app/layout.tsx',
  'app/layout.jsx',
  'app/layout.js',
  'src/app/layout.tsx',
  'src/app/layout.jsx',
  'src/app/layout.js'
];

let foundLayout = false;
for (const file of layoutFiles) {
  if (fs.existsSync(file)) {
    console.log(`Found: ${file}`);
    console.log('First 20 lines:');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').slice(0, 20);
    console.log(lines.map(l => '  ' + l).join('\n'));
    foundLayout = true;
    break;
  }
}

// Check package.json for project type
console.log('\n📦 Project Configuration:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Next.js version:', pkg.dependencies?.next || 'Not found');
  console.log('Scripts:', Object.keys(pkg.scripts || {}));
}

// Check if using src directory
if (fs.existsSync('src')) {
  console.log('\n⚠️  Using /src directory structure');
}

// Check for TypeScript
if (fs.existsSync('tsconfig.json')) {
  console.log('\n✅ TypeScript project');
}
