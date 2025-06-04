// test-registration-direct.js
const fetch = require('node-fetch');

async function testRegistration() {
  const testData = {
    firstName: "Test",
    lastName: "User",
    email: `test${Date.now()}@example.com`,
    phone: "+1234567890",
    password: "password123",
    role: "PATIENT",
    verificationMethod: "email"
  };

  console.log('Testing registration with data:', testData);

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (!response.ok) {
      console.error('Registration failed:', result.error);
      if (result.details) {
        console.error('Error details:', result.details);
      }
    } else {
      console.log('✅ Registration successful!');
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// First, let's test if the registration route exists
async function checkRoute() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'GET'
    });
    console.log('Route check - Status:', response.status);
    if (response.status === 405) {
      console.log('✅ Route exists (Method not allowed for GET is expected)');
    } else if (response.status === 404) {
      console.log('❌ Route not found - check file location');
    }
  } catch (error) {
    console.error('Cannot connect to server:', error.message);
  }
}

async function run() {
  console.log('1. Checking if route exists...');
  await checkRoute();
  
  console.log('\n2. Testing registration...');
  await testRegistration();
}

run();