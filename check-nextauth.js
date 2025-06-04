// check-nextauth.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking NextAuth configuration...\n');

const nextAuthFile = path.join(process.cwd(), 'src/app/api/auth/[...nextauth]/route.ts');

if (fs.existsSync(nextAuthFile)) {
  console.log('✅ Found NextAuth route file\n');
  console.log('Content:');
  const content = fs.readFileSync(nextAuthFile, 'utf8');
  console.log(content);
} else {
  console.log('❌ NextAuth route file not found at expected location');
}

// Also check for .env.local
console.log('\n\n📋 Checking for environment variables...');
const envFile = path.join(process.cwd(), '.env.local');
const envFileAlt = path.join(process.cwd(), '.env');

if (fs.existsSync(envFile)) {
  console.log('✅ Found .env.local file');
  console.log('⚠️  Make sure it contains:');
  console.log('   NEXTAUTH_URL=http://localhost:3000');
  console.log('   NEXTAUTH_SECRET=your-secret-key');
} else if (fs.existsSync(envFileAlt)) {
  console.log('✅ Found .env file');
  console.log('⚠️  Make sure it contains:');
  console.log('   NEXTAUTH_URL=http://localhost:3000');
  console.log('   NEXTAUTH_SECRET=your-secret-key');
} else {
  console.log('❌ No .env.local or .env file found');
  console.log('   You need to create one with NextAuth configuration');
}