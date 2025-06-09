// scripts/check-db-files.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkDatabaseFiles() {
  console.log('🔍 Checking Database File Storage\n');

  try {
    // Get recent cases
    const cases = await prisma.case.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caseNumber: true,
        scanFileUrl: true,
        upperScanFile: true,
        lowerScanFile: true,
        biteScanFile: true,
        createdAt: true,
      }
    });

    console.log(`Found ${cases.length} recent cases\n`);

    cases.forEach((caseItem, index) => {
      console.log(`\n${index + 1}. Case ${caseItem.caseNumber}:`);
      console.log(`   Created: ${caseItem.createdAt.toISOString()}`);
      
      // Check individual file fields
      console.log('   Individual fields:');
      console.log(`     upperScanFile: ${caseItem.upperScanFile || 'null'}`);
      console.log(`     lowerScanFile: ${caseItem.lowerScanFile || 'null'}`);
      console.log(`     biteScanFile: ${caseItem.biteScanFile || 'null'}`);
      
      // Check scanFileUrl
      console.log('   scanFileUrl:');
      if (caseItem.scanFileUrl) {
        try {
          const parsed = JSON.parse(caseItem.scanFileUrl);
          console.log(`     Parsed successfully: ${JSON.stringify(parsed, null, 6)}`);
        } catch (e) {
          console.log(`     Raw value: ${caseItem.scanFileUrl}`);
          console.log(`     ❌ Failed to parse as JSON`);
        }
      } else {
        console.log('     null');
      }
      
      // Check if physical files exist
      const caseDir = path.join(process.cwd(), 'public', 'uploads', 'cases', caseItem.caseNumber);
      if (fs.existsSync(caseDir)) {
        const files = fs.readdirSync(caseDir);
        console.log(`   Physical files: ${files.length} file(s) found`);
        files.forEach(f => console.log(`     - ${f}`));
      } else {
        console.log('   Physical files: Directory not found');
      }
    });

    // Summary
    console.log('\n📊 Summary:');
    const casesWithScanFileUrl = cases.filter(c => c.scanFileUrl).length;
    const casesWithIndividualFiles = cases.filter(c => c.upperScanFile || c.lowerScanFile || c.biteScanFile).length;
    
    console.log(`Cases with scanFileUrl: ${casesWithScanFileUrl}/${cases.length}`);
    console.log(`Cases with individual file fields: ${casesWithIndividualFiles}/${cases.length}`);
    
    // Check if scanFileUrl contains all files or just additional
    const scanFileUrlContents = cases
      .filter(c => c.scanFileUrl)
      .map(c => {
        try {
          return JSON.parse(c.scanFileUrl);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    
    const hasMainFiles = scanFileUrlContents.filter(content => 
      content.upper || content.lower || content.bite
    ).length;
    
    console.log(`\nscanFileUrl contains main files (upper/lower/bite): ${hasMainFiles}/${scanFileUrlContents.length}`);
    
    if (hasMainFiles === 0 && scanFileUrlContents.length > 0) {
      console.log('\n⚠️  WARNING: scanFileUrl only contains additional files!');
      console.log('CaseDetails.tsx expects ALL files to be in scanFileUrl as JSON.');
      console.log('You need to update your API to store all files in scanFileUrl.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseFiles();