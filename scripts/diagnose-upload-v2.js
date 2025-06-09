// scripts/diagnose-upload-v2.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Dental Aligner Portal - File Upload Diagnostic v2\n');

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

// Check permissions
try {
  const testFile = path.join(casesDir, '.test-write');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Write permissions: OK');
} catch (error) {
  console.log('❌ Write permissions: FAILED');
  console.log('   Error:', error.message);
}

// List existing case directories with file count
console.log('\n📋 Case Upload Summary:');
if (fs.existsSync(casesDir)) {
  const cases = fs.readdirSync(casesDir).filter(f => {
    const fullPath = path.join(casesDir, f);
    return fs.statSync(fullPath).isDirectory() && f !== '.git' && f !== '.gitkeep';
  });
  
  console.log(`Total cases: ${cases.length}`);
  
  let totalFiles = 0;
  let casesWithFiles = 0;
  let emptyCases = [];
  
  cases.forEach(caseNum => {
    const caseDir = path.join(casesDir, caseNum);
    const files = fs.readdirSync(caseDir).filter(f => !f.startsWith('.'));
    
    if (files.length > 0) {
      casesWithFiles++;
      totalFiles += files.length;
    } else {
      emptyCases.push(caseNum);
    }
  });
  
  console.log(`Cases with files: ${casesWithFiles}`);
  console.log(`Empty cases: ${emptyCases.length}`);
  console.log(`Total files uploaded: ${totalFiles}`);
  
  if (emptyCases.length > 0 && emptyCases.length <= 10) {
    console.log(`Empty case numbers: ${emptyCases.join(', ')}`);
  }
}

// Check API routes - look for both .ts and .tsx
console.log('\n🛣️  API Routes Check:');
const apiDir = path.join(process.cwd(), 'src', 'app', 'api', 'cases');
if (fs.existsSync(apiDir)) {
  console.log('✅ /api/cases directory exists');
  
  // Check for route files
  const routeFiles = ['route.ts', 'route.tsx', 'route.js'];
  let routeFileFound = null;
  
  for (const fileName of routeFiles) {
    const filePath = path.join(apiDir, fileName);
    if (fs.existsSync(filePath)) {
      routeFileFound = fileName;
      console.log(`✅ Found route file: ${fileName}`);
      
      // Check file content
      const content = fs.readFileSync(filePath, 'utf8');
      console.log('   ✅ Contains POST handler:', content.includes('export async function POST'));
      console.log('   ✅ Contains formData handling:', content.includes('formData'));
      console.log('   ✅ Contains file processing:', content.includes('writeFile'));
      
      // Check for import issues
      if (content.includes('@/lib/auth')) {
        console.log('   ⚠️  WARNING: Imports from @/lib/auth - should import from ../auth/[...nextauth]/route');
      }
      
      break;
    }
  }
  
  if (!routeFileFound) {
    console.log('❌ No route file found (checked: route.ts, route.tsx, route.js)');
  }
} else {
  console.log('❌ /api/cases directory not found');
}

// Check database for recent cases
console.log('\n📊 Recent Upload Activity:');
const recentCases = fs.existsSync(casesDir) 
  ? fs.readdirSync(casesDir)
      .filter(f => fs.statSync(path.join(casesDir, f)).isDirectory() && f.startsWith('250606'))
      .slice(-5)
  : [];

if (recentCases.length > 0) {
  console.log('Last 5 cases created today:');
  recentCases.forEach(caseNum => {
    const caseDir = path.join(casesDir, caseNum);
    const files = fs.readdirSync(caseDir);
    console.log(`   ${caseNum}: ${files.length} file(s)`);
  });
}

// Check for common issues
console.log('\n⚠️  Potential Issues Found:');
let issueCount = 0;

// Check for empty cases
const allCases = fs.existsSync(casesDir) 
  ? fs.readdirSync(casesDir).filter(f => fs.statSync(path.join(casesDir, f)).isDirectory())
  : [];
  
const emptyCaseCount = allCases.filter(caseNum => {
  const caseDir = path.join(casesDir, caseNum);
  const files = fs.readdirSync(caseDir);
  return files.length === 0 || files.every(f => f.startsWith('.'));
}).length;

if (emptyCaseCount > 0) {
  console.log(`${++issueCount}. Found ${emptyCaseCount} empty case directories`);
  console.log('   This suggests cases are being created but files are not being saved');
}

// Check file naming
let incorrectNaming = 0;
allCases.forEach(caseNum => {
  const caseDir = path.join(casesDir, caseNum);
  const files = fs.readdirSync(caseDir).filter(f => !f.startsWith('.'));
  files.forEach(file => {
    if (!file.startsWith(caseNum)) {
      incorrectNaming++;
    }
  });
});

if (incorrectNaming > 0) {
  console.log(`${++issueCount}. Found ${incorrectNaming} files with incorrect naming`);
  console.log('   Files should start with case number');
}

if (issueCount === 0) {
  console.log('No issues found! 🎉');
}

// Recommendations
console.log('\n💡 Next Steps:');
console.log('1. Since files ARE being uploaded, the issue is likely in displaying them');
console.log('2. Check CaseDetails.tsx - it expects scanFileUrl to contain ALL files as JSON');
console.log('3. Check the database to see what\'s stored in scanFileUrl field');
console.log('4. The UI might be looking for files in the wrong location');
console.log('5. Run: npm run dev and check the browser console for 404 errors on file URLs');

console.log('\n✨ Diagnostic complete!\n');