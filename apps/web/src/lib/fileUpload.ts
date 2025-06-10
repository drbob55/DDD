// src/lib/fileUpload.ts
import { promises as fs } from 'fs';
import path from 'path';

export interface FileUploadResult {
  fileName: string;
  originalName: string;
  size: number;
  path: string;
}

/**
 * Ensures the upload directory exists
 */
export async function ensureUploadDir(subDir?: string): Promise<string> {
  const baseDir = path.join(process.cwd(), 'public', 'uploads');
  const targetDir = subDir ? path.join(baseDir, subDir) : baseDir;
  
  try {
    await fs.access(targetDir);
  } catch {
    await fs.mkdir(targetDir, { recursive: true });
  }
  
  return targetDir;
}

/**
 * Generates a standardized filename for case files
 * Format: {caseNumber}_{type}_{timestamp}.{ext}
 */
export function generateCaseFileName(
  caseNumber: string,
  fileType: 'upper' | 'lower' | 'bite' | 'additional',
  originalFileName: string,
  index?: number
): string {
  const ext = path.extname(originalFileName).toLowerCase();
  const timestamp = Date.now();
  
  if (fileType === 'additional' && index !== undefined) {
    return `${caseNumber}_${fileType}_${index}_${timestamp}${ext}`;
  }
  
  return `${caseNumber}_${fileType}_${timestamp}${ext}`;
}

/**
 * Saves a file to the upload directory
 */
export async function saveFile(
  file: File,
  fileName: string,
  subDir?: string
): Promise<FileUploadResult> {
  const uploadDir = await ensureUploadDir(subDir);
  const filePath = path.join(uploadDir, fileName);
  
  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Save the file
  await fs.writeFile(filePath, buffer);
  
  // Return file info
  return {
    fileName,
    originalName: file.name,
    size: file.size,
    path: subDir ? `/uploads/${subDir}/${fileName}` : `/uploads/${fileName}`
  };
}

/**
 * Saves multiple case files with proper naming convention
 */
export async function saveCaseFiles(
  caseNumber: string,
  files: {
    upper?: File | null;
    lower?: File | null;
    bite?: File | null;
    additional?: File[];
  }
): Promise<{
  upperScanFile?: string;
  lowerScanFile?: string;
  biteScanFile?: string;
  additionalFiles?: string[];
}> {
  const results: {
    upperScanFile?: string;
    lowerScanFile?: string;
    biteScanFile?: string;
    additionalFiles?: string[];
  } = {};
  
  // Create case-specific subdirectory
  const subDir = `cases/${caseNumber}`;
  
  // Save upper scan
  if (files.upper) {
    const fileName = generateCaseFileName(caseNumber, 'upper', files.upper.name);
    const result = await saveFile(files.upper, fileName, subDir);
    results.upperScanFile = result.path;
  }
  
  // Save lower scan
  if (files.lower) {
    const fileName = generateCaseFileName(caseNumber, 'lower', files.lower.name);
    const result = await saveFile(files.lower, fileName, subDir);
    results.lowerScanFile = result.path;
  }
  
  // Save bite scan
  if (files.bite) {
    const fileName = generateCaseFileName(caseNumber, 'bite', files.bite.name);
    const result = await saveFile(files.bite, fileName, subDir);
    results.biteScanFile = result.path;
  }
  
  // Save additional files
  if (files.additional && files.additional.length > 0) {
    results.additionalFiles = [];
    for (let i = 0; i < files.additional.length; i++) {
      const file = files.additional[i];
      const fileName = generateCaseFileName(caseNumber, 'additional', file.name, i);
      const result = await saveFile(file, fileName, subDir);
      results.additionalFiles.push(result.path);
    }
  }
  
  return results;
}

/**
 * Deletes a file from the upload directory
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Validates file extension
 */
export function isValidFileType(fileName: string): boolean {
  const validExtensions = ['.stl', '.obj', '.zip', '.ply'];
  const ext = path.extname(fileName).toLowerCase();
  return validExtensions.includes(ext);
}

/**
 * Validates file size (max 100MB)
 */
export function isValidFileSize(size: number): boolean {
  const maxSize = 100 * 1024 * 1024; // 100MB
  return size <= maxSize;
}