// check-dashboard.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking dashboard setup...\n');

// Files to check
const filesToCheck = [
  'src/app/dashboard/page.tsx',
  'src/components/AdminDashboard.tsx',
  'src/app/api/auth/login/route.ts',
  'src/app/admin/page.tsx',  // Check if there's a dedicated admin page
];

filesToCheck.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found: ${file}`);
    console.log('First 30 lines:');
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').slice(0, 30);
    console.log(lines.map(l => '  ' + l).join('\n'));
    console.log('\n' + '='.repeat(80) + '\n');
  } else {
    console.log(`❌ Not found: ${file}\n`);
  }
});