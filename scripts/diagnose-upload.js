// scripts/diagnose-upload.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Dental Aligner Portal - File Upload Diagnostic\n');

// Check current working directory
console.log('📂 Current working directory:', process.cwd());

// Check if public directory exists
const publicDir = path.join(process.cwd(), 'public');
console.log('\n📁 Public directory exists:', fs.existsSync(publicDir));

// Check upload directory structure
const uploadsDir = path.join(publicDir, 'uploads');
const casesDir = path.join(uploadsDir, 'cases');

console.log('📁 Uploads directory exists:', fs.existsSync(uploadsDir));
console.log('📁 Cases directory exists:', fs.existsSync(casesDir));

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  console.log('\n⚠️  Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(casesDir)) {
  console.log('⚠️  Creating cases directory...');
  fs.mkdirSync(casesDir, { recursive: true });
}

// Check permissions
try {
  const testFile = path.join(casesDir, '.test-write');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('\n✅ Write permissions: OK');
} catch (error) {
  console.log('\n❌ Write permissions: FAILED');
  console.log('   Error:', error.message);
}

// List existing case directories
console.log('\n📋 Existing case directories:');
if (fs.existsSync(casesDir)) {
  const cases = fs.readdirSync(casesDir).filter(f => fs.statSync(path.join(casesDir, f)).isDirectory());
  if (cases.length === 0) {
    console.log('   No cases found');
  } else {
    cases.forEach(caseNum => {
      const caseDir = path.join(casesDir, caseNum);
      const files = fs.readdirSync(caseDir);
      console.log(`   📂 ${caseNum}/`);
      files.forEach(file => {
        const stats = fs.statSync(path.join(caseDir, file));
        console.log(`      📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    });
  }
}

// Check environment
console.log('\n🔧 Environment:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   Next.js detected:', fs.existsSync(path.join(process.cwd(), 'next.config.ts')));

// Check API routes
console.log('\n🛣️  API Routes:');
const apiDir = path.join(process.cwd(), 'src', 'app', 'api', 'cases');
if (fs.existsSync(apiDir)) {
  console.log('   ✅ /api/cases directory exists');
  const routeFile = path.join(apiDir, 'route.ts');
  console.log('   ✅ route.ts exists:', fs.existsSync(routeFile));
  
  if (fs.existsSync(routeFile)) {
    const content = fs.readFileSync(routeFile, 'utf8');
    console.log('   ✅ Contains POST handler:', content.includes('export async function POST'));
    console.log('   ✅ Contains file handling:', content.includes('formData.get'));
  }
} else {
  console.log('   ❌ /api/cases directory not found');
}

// Recommendations
console.log('\n💡 Recommendations:');
console.log('1. Ensure the server is running with: npm run dev');
console.log('2. Check browser console for any client-side errors');
console.log('3. Check Network tab to see if files are being sent in FormData');
console.log('4. Verify file size is under 100MB');
console.log('5. Check that file extensions are: .stl, .obj, .zip, or .ply');

console.log('\n✨ Diagnostic complete!\n');