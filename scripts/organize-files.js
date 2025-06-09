// organize-files.js
// Run with: node organize-files.js

const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
const casesDir = path.join(uploadsDir, 'cases');

// Create cases directory if it doesn't exist
if (!fs.existsSync(casesDir)) {
  fs.mkdirSync(casesDir, { recursive: true });
}

// Read all files in uploads directory
fs.readdir(uploadsDir, (err, files) => {
  if (err) {
    console.error('Error reading uploads directory:', err);
    return;
  }

  files.forEach(file => {
    // Skip if it's a directory
    const filePath = path.join(uploadsDir, file);
    if (fs.statSync(filePath).isDirectory()) {
      return;
    }

    // Check if filename matches case pattern: YYMMDD-XXX_type_uuid.ext
    const match = file.match(/^(\d{6}-\d+)_(upper|lower|bite|additional)/);
    if (match) {
      const caseNumber = match[1];
      const caseDir = path.join(casesDir, caseNumber);

      // Create case directory if it doesn't exist
      if (!fs.existsSync(caseDir)) {
        fs.mkdirSync(caseDir, { recursive: true });
      }

      // Move file to case directory
      const oldPath = filePath;
      const newPath = path.join(caseDir, file);

      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.error(`Error moving ${file}:`, err);
        } else {
          console.log(`Moved ${file} to cases/${caseNumber}/`);
        }
      });
    }
  });
});