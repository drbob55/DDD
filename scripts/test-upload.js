// scripts/test-upload.js
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Set this to a valid session token

async function testFileUpload() {
  console.log('🧪 Testing File Upload API\n');

  // Create test files
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create dummy STL file content
  const stlContent = `solid TestCube
    facet normal 0 0 0
      outer loop
        vertex 0 0 0
        vertex 1 0 0
        vertex 1 1 0
      endloop
    endfacet
  endsolid TestCube`;

  // Create test files
  const upperFile = path.join(testDir, 'test_upper.stl');
  const lowerFile = path.join(testDir, 'test_lower.stl');
  const biteFile = path.join(testDir, 'test_bite.stl');

  fs.writeFileSync(upperFile, stlContent);
  fs.writeFileSync(lowerFile, stlContent);
  fs.writeFileSync(biteFile, stlContent);

  console.log('✅ Created test files');

  // Create form data
  const form = new FormData();
  
  // Add patient info
  form.append('patientFirstName', 'Test');
  form.append('patientLastName', 'Patient');
  form.append('patientEmail', `test${Date.now()}@example.com`);
  form.append('phone', '1234567890');
  form.append('sex', 'Male');
  form.append('dateOfBirth', '1990-01-01');
  form.append('notes', 'Test case created by diagnostic script');
  form.append('caseNumber', `TEST-${Date.now()}`);

  // Add files
  form.append('upper', fs.createReadStream(upperFile));
  form.append('lower', fs.createReadStream(lowerFile));
  form.append('bite', fs.createReadStream(biteFile));

  console.log('\n📤 Sending test upload to:', `${API_URL}/api/cases`);
  console.log('📋 Form fields:', {
    patientFirstName: 'Test',
    patientLastName: 'Patient',
    patientEmail: form._streams[6],
    sex: 'Male',
    dateOfBirth: '1990-01-01',
    files: ['upper.stl', 'lower.stl', 'bite.stl']
  });

  try {
    const headers = form.getHeaders();
    if (AUTH_TOKEN) {
      headers['Cookie'] = `next-auth.session-token=${AUTH_TOKEN}`;
    }

    const response = await fetch(`${API_URL}/api/cases`, {
      method: 'POST',
      body: form,
      headers: headers
    });

    const responseText = await response.text();
    
    console.log('\n📥 Response Status:', response.status);
    console.log('📥 Response Headers:', response.headers.raw());
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('📥 Response Text:', responseText);
    }

    if (response.ok && responseData?.success) {
      console.log('\n✅ Upload successful!');
      console.log('📋 Case Number:', responseData.caseNumber);
      console.log('🆔 Case ID:', responseData.caseId);
      
      // Check if files were saved
      const caseDir = path.join(process.cwd(), 'public', 'uploads', 'cases', responseData.caseNumber);
      if (fs.existsSync(caseDir)) {
        console.log('\n📁 Files saved to:', caseDir);
        const savedFiles = fs.readdirSync(caseDir);
        savedFiles.forEach(file => {
          console.log('   ✅', file);
        });
      }
    } else {
      console.log('\n❌ Upload failed!');
      if (responseData?.error) {
        console.log('Error:', responseData.error);
      }
    }

  } catch (error) {
    console.log('\n❌ Request failed:', error.message);
    console.log('Make sure the server is running on', API_URL);
  }

  // Cleanup
  fs.unlinkSync(upperFile);
  fs.unlinkSync(lowerFile);
  fs.unlinkSync(biteFile);
  fs.rmdirSync(testDir);
  console.log('\n🧹 Cleaned up test files');
}

// Note about authentication
console.log('⚠️  Note: This test requires authentication.');
console.log('To get an auth token:');
console.log('1. Log in to your app as a DENTIST');
console.log('2. Open DevTools > Application > Cookies');
console.log('3. Find "next-auth.session-token" and copy its value');
console.log('4. Run: AUTH_TOKEN="your-token-here" node scripts/test-upload.js\n');

if (!AUTH_TOKEN) {
  console.log('❌ No AUTH_TOKEN provided. The upload will likely fail with 401 Unauthorized.\n');
}

testFileUpload().catch(console.error);