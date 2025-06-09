// scripts/fix-all-cases.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixAllCases() {
  console.log('🔧 Comprehensive Database File Fix\n');

  try {
    // Get all cases
    const cases = await prisma.case.findMany({
      select: {
        id: true,
        caseNumber: true,
        scanFileUrl: true,
        upperScanFile: true,
        lowerScanFile: true,
        biteScanFile: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${cases.length} total cases to check\n`);

    let fixedCount = 0;
    let issues = {
      nullScanFileUrl: 0,
      inconsistentPaths: 0,
      missingPhysicalFiles: 0
    };

    for (const caseItem of cases) {
      let needsUpdate = false;
      let updates = {};
      
      console.log(`\nChecking case ${caseItem.caseNumber}...`);

      // Step 1: Parse existing scanFileUrl or create new one
      let fileData = {};
      if (caseItem.scanFileUrl) {
        try {
          fileData = JSON.parse(caseItem.scanFileUrl);
        } catch (e) {
          console.log('  ⚠️  Invalid JSON in scanFileUrl');
          if (caseItem.scanFileUrl.startsWith('[')) {
            try {
              const additionalFiles = JSON.parse(caseItem.scanFileUrl);
              fileData = { additional: additionalFiles };
            } catch (e2) {
              fileData = {};
            }
          }
        }
      }

      // Step 2: Normalize file paths (remove /uploads/ prefix if present)
      const normalizeFilePath = (filePath) => {
        if (!filePath) return null;
        // Remove /uploads/ prefix if present
        if (filePath.startsWith('/uploads/')) {
          return filePath.substring(9); // Remove '/uploads/'
        }
        return filePath;
      };

      // Step 3: Build correct fileData from individual fields
      const normalizedUpper = normalizeFilePath(caseItem.upperScanFile);
      const normalizedLower = normalizeFilePath(caseItem.lowerScanFile);
      const normalizedBite = normalizeFilePath(caseItem.biteScanFile);

      // Check if we need to update scanFileUrl
      if (!caseItem.scanFileUrl || 
          (normalizedUpper && fileData.upper !== normalizedUpper) ||
          (normalizedLower && fileData.lower !== normalizedLower) ||
          (normalizedBite && fileData.bite !== normalizedBite)) {
        
        if (!caseItem.scanFileUrl) issues.nullScanFileUrl++;
        
        // Update fileData with normalized paths
        if (normalizedUpper) fileData.upper = normalizedUpper;
        if (normalizedLower) fileData.lower = normalizedLower;
        if (normalizedBite) fileData.bite = normalizedBite;
        
        // Ensure additional is an array
        if (!fileData.additional) fileData.additional = [];
        
        updates.scanFileUrl = JSON.stringify(fileData);
        needsUpdate = true;
        console.log('  ✅ Will update scanFileUrl');
      }

      // Step 4: Update individual fields to normalized paths
      if (caseItem.upperScanFile !== normalizedUpper) {
        updates.upperScanFile = normalizedUpper;
        needsUpdate = true;
        issues.inconsistentPaths++;
        console.log('  ✅ Will normalize upperScanFile path');
      }
      if (caseItem.lowerScanFile !== normalizedLower) {
        updates.lowerScanFile = normalizedLower;
        needsUpdate = true;
        issues.inconsistentPaths++;
        console.log('  ✅ Will normalize lowerScanFile path');
      }
      if (caseItem.biteScanFile !== normalizedBite) {
        updates.biteScanFile = normalizedBite;
        needsUpdate = true;
        issues.inconsistentPaths++;
        console.log('  ✅ Will normalize biteScanFile path');
      }

      // Step 5: Check if physical files exist
      const checkPhysicalFile = (filePath) => {
        if (!filePath) return true;
        const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
        return fs.existsSync(fullPath);
      };

      const filesExist = {
        upper: checkPhysicalFile(normalizedUpper),
        lower: checkPhysicalFile(normalizedLower),
        bite: checkPhysicalFile(normalizedBite)
      };

      if (!filesExist.upper || !filesExist.lower || !filesExist.bite) {
        const missing = [];
        if (normalizedUpper && !filesExist.upper) missing.push('upper');
        if (normalizedLower && !filesExist.lower) missing.push('lower');
        if (normalizedBite && !filesExist.bite) missing.push('bite');
        
        console.log(`  ⚠️  Missing physical files: ${missing.join(', ')}`);
        issues.missingPhysicalFiles++;
      }

      // Step 6: Update the case if needed
      if (needsUpdate) {
        await prisma.case.update({
          where: { id: caseItem.id },
          data: updates
        });
        
        console.log(`  ✅ Updated case ${caseItem.caseNumber}`);
        fixedCount++;
      } else {
        console.log(`  ✅ Case ${caseItem.caseNumber} is already correct`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Fix Summary:');
    console.log('='.repeat(50));
    console.log(`Total cases processed: ${cases.length}`);
    console.log(`Cases fixed: ${fixedCount}`);
    console.log(`\nIssues found:`);
    console.log(`  - Cases with null scanFileUrl: ${issues.nullScanFileUrl}`);
    console.log(`  - Cases with path inconsistencies: ${issues.inconsistentPaths}`);
    console.log(`  - Cases with missing physical files: ${issues.missingPhysicalFiles}`);

    // Show sample of fixed data
    if (fixedCount > 0) {
      console.log('\n📋 Sample of fixed case:');
      const sampleCase = await prisma.case.findFirst({
        where: {
          scanFileUrl: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          caseNumber: true,
          scanFileUrl: true,
          upperScanFile: true,
          lowerScanFile: true,
          biteScanFile: true
        }
      });

      if (sampleCase) {
        console.log(`\nCase ${sampleCase.caseNumber}:`);
        console.log('Individual fields:');
        console.log(`  upperScanFile: ${sampleCase.upperScanFile || 'null'}`);
        console.log(`  lowerScanFile: ${sampleCase.lowerScanFile || 'null'}`);
        console.log(`  biteScanFile: ${sampleCase.biteScanFile || 'null'}`);
        console.log('\nscanFileUrl:');
        const parsed = JSON.parse(sampleCase.scanFileUrl);
        console.log(JSON.stringify(parsed, null, 2));
      }
    }

    console.log('\n✅ Database fix complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your Next.js server');
    console.log('2. Check Case Details - files should now appear');
    console.log('3. Update your API to ensure new cases save files correctly');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  This script will fix all cases in your database:');
console.log('  1. Populate scanFileUrl for cases where it\'s null');
console.log('  2. Normalize file paths (remove /uploads/ prefix)');
console.log('  3. Ensure consistency between individual fields and scanFileUrl');
console.log('\nThis is necessary for CaseDetails.tsx to display files correctly.');

rl.question('\nDo you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    fixAllCases();
  } else {
    console.log('Operation cancelled.');
    rl.close();
    process.exit(0);
  }
});