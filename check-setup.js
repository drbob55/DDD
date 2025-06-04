// check-setup.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking your Next.js project structure...\n');

// Check if app directory exists
const appDir = path.join(process.cwd(), 'app');
if (fs.existsSync(appDir)) {
  console.log('✅ /app directory exists');
  
  // Check for API directory
  const apiDir = path.join(appDir, 'api');
  if (fs.existsSync(apiDir)) {
    console.log('✅ /app/api directory exists');
    
    // List all API routes
    console.log('\n📁 API Routes found:');
    function listFiles(dir, prefix = '') {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          console.log(`${prefix}📂 ${file}/`);
          listFiles(filePath, prefix + '  ');
        } else {
          console.log(`${prefix}📄 ${file}`);
        }
      });
    }
    listFiles(apiDir, '  ');
  } else {
    console.log('❌ /app/api directory NOT found');
    console.log('   Creating API directory...');
    fs.mkdirSync(apiDir, { recursive: true });
  }
} else {
  console.log('❌ /app directory NOT found');
  console.log('   Are you using the Pages Router instead of App Router?');
}

// Check for pages directory
const pagesDir = path.join(process.cwd(), 'pages');
if (fs.existsSync(pagesDir)) {
  console.log('\n⚠️  Found /pages directory - you might be using Pages Router');
}

// Check package.json
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['@prisma/client', 'bcryptjs', 'next'];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} installed`);
  } else {
    console.log(`❌ ${dep} NOT installed`);
  }
});

// Check Next.js version
if (packageJson.dependencies.next) {
  console.log(`\nNext.js version: ${packageJson.dependencies.next}`);
}

console.log('\n💡 To create the required API routes:');
console.log('1. Create these directories:');
console.log('   - app/api/users/exists/');
console.log('   - app/api/auth/login/');
console.log('   - app/api/auth/register/');
console.log('   - app/api/auth/verify/');
console.log('2. Add route.ts file in each directory');
console.log('3. Make sure you are using App Router (not Pages Router)');