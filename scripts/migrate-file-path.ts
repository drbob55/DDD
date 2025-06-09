// scripts/migrate-file-paths.ts
// Run this script to migrate old file paths to the new structure

import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

async function migrateFilePaths() {
  console.log('Starting file path migration...');
  
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
      }
    });
    
    console.log(`Found ${cases.length} cases to check`);
    
    for (const caseData of cases) {
      let updated = false;
      const updates: any = {};
      
      // Parse scanFileUrl if it exists
      let scanFiles: any = {};
      if (caseData.scanFileUrl) {
        try {
          scanFiles = JSON.parse(caseData.scanFileUrl);
        } catch (e) {
          console.error(`Failed to parse scanFileUrl for case ${caseData.id}`);
          continue;
        }
      }
      
      // Check and update individual file fields
      if (caseData.upperScanFile && !caseData.upperScanFile.includes('cases/')) {
        const fileName = path.basename(caseData.upperScanFile);
        if (fileName.startsWith(caseData.caseNumber)) {
          updates.upperScanFile = `cases/${caseData.caseNumber}/${fileName}`;
          scanFiles.upper = updates.upperScanFile;
          updated = true;
          
          // Move the actual file
          await moveFile(caseData.upperScanFile, updates.upperScanFile);
        }
      }
      
      if (caseData.lowerScanFile && !caseData.lowerScanFile.includes('cases/')) {
        const fileName = path.basename(caseData.lowerScanFile);
        if (fileName.startsWith(caseData.caseNumber)) {
          updates.lowerScanFile = `cases/${caseData.caseNumber}/${fileName}`;
          scanFiles.lower = updates.lowerScanFile;
          updated = true;
          
          // Move the actual file
          await moveFile(caseData.lowerScanFile, updates.lowerScanFile);
        }
      }
      
      if (caseData.bi