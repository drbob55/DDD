// scripts/setup-uploads.js
const fs = require('fs');
const path = require('path');

// Create upload directory structure
const createUploadDirs = () => {
  const baseDir = path.join(process.cwd(), 'public', 'uploads');
  const casesDir = path.join(baseDir, 'cases');
  
  // Create directories if they don't exist
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log('✅ Created uploads directory');
  } else {
    console.log('✅ Uploads directory already exists');
  }
  
  if (!fs.existsSync(casesDir)) {
    fs.mkdirSync(casesDir, { recursive: true });
    console.log('✅ Created cases directory');
  } else {
    console.log('✅ Cases directory already exists');
  }
  
  // Create .gitkeep file to ensure directory is tracked
  const gitkeepPath = path.join(casesDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log('✅ Created .gitkeep file');
  }
  
  // Count existing cases
  const existingCases = fs.readdirSync(casesDir).filter(f => {
    const fullPath = path.join(casesDir, f);
    return fs.statSync(fullPath).isDirectory() && f !== '.gitkeep';
  });
  
  console.log(`\n📊 Found ${existingCases.length} existing cases`);
  
  // Create example structure for documentation
  console.log('\n📁 Upload directory structure:');
  console.log('public/');
  console.log('└── uploads/');
  console.log('    └── cases/');
  console.log('        └── {caseNumber}/');
  console.log('            ├── {caseNumber}_upper_{timestamp}.stl');
  console.log('            ├── {caseNumber}_lower_{timestamp}.stl');
  console.log('            ├── {caseNumber}_bite_{timestamp}.stl');
  console.log('            └── {caseNumber}_additional_{index}_{timestamp}.{ext}');
  
  console.log('\n✅ Upload directories ready!');
};

// Run the setup
createUploadDirs();

// Export for use in other scripts
module.exports = { createUploadDirs };