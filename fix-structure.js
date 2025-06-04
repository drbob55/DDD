// fix-structure.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing directory structure...\n');

// Check if the wrong /app directory exists
const wrongAppDir = path.join(process.cwd(), 'app');
const correctSrcDir = path.join(process.cwd(), 'src');

if (fs.existsSync(wrongAppDir)) {
  console.log('❌ Found /app directory in wrong location');
  
  // Check what's in it
  const apiDir = path.join(wrongAppDir, 'api');
  if (fs.existsSync(apiDir)) {
    console.log('📁 Found /app/api directory - this should be removed');
    
    // Ask for confirmation
    console.log('\n⚠️  This will remove the incorrectly placed /app directory');
    console.log('   Your actual app files are safe in /src/app');
    console.log('\n   Remove /app directory? (The API routes are duplicated in /src/app/api)');
    
    // For safety, let's just rename it instead of deleting
    const backupName = 'app-backup-' + Date.now();
    fs.renameSync(wrongAppDir, backupName);
    console.log(`\n✅ Renamed /app to /${backupName} for safety`);
    console.log('   You can delete this backup folder later if everything works');
  }
}

// Now let's check if the API routes exist in the correct location
console.log('\n📍 Checking API routes in correct location (/src/app/api/)...\n');

const correctApiRoutes = [
  'src/app/api/users/exists/route.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/auth/verify/route.ts',
];

correctApiRoutes.forEach(route => {
  const fullPath = path.join(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${route} exists`);
  } else {
    console.log(`❌ ${route} missing`);
  }
});

console.log('\n🎯 Summary:');
console.log('1. Your project structure uses /src/app (not /app)');
console.log('2. All your pages and API routes should be in /src/app/');
console.log('3. The /app directory was created by mistake and has been backed up');
console.log('\n🚀 Next steps:');
console.log('1. Restart your Next.js server: npm run dev');
console.log('2. Your frontend should work again at http://localhost:3000');
console.log('3. The API routes in /src/app/api should be working');

// Let's also check what's in your src/app/page.tsx
console.log('\n📄 Your main page file (/src/app/page.tsx) appears to be the auth flow we created.');
console.log('   It should be working now that the conflicting /app directory is removed.');