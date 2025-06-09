#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Get directory structure for dental aligner project
 */
class DirectoryAnalyzer {
  constructor(rootPath = '.') {
    this.rootPath = path.resolve(rootPath);
    this.output = [];
  }

  // Paths to ignore
  ignorePaths = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.turbo',
    '.vercel',
    'coverage',
    '.DS_Store'
  ];

  // Key directories to highlight
  keyDirectories = [
    'public/uploads',
    'public/uploads/cases',
    'prisma',
    'src/app/api',
    'src/components/cases',
    'src/lib',
    'src/hooks',
    'src/types'
  ];

  // Important files to check
  importantFiles = [
    '.env',
    '.env.local',
    'prisma/schema.prisma',
    'prisma/dev.db',
    'src/lib/prisma.ts',
    'src/lib/auth.ts',
    'src/lib/constants.ts',
    'src/lib/fileUpload.ts',
    'src/app/api/cases/route.ts',
    'src/components/cases/NewCaseModal.tsx',
    'src/components/cases/CaseDetails.tsx',
    'src/components/cases/CaseList.tsx'
  ];

  /**
   * Check if path should be ignored
   */
  shouldIgnore(itemPath) {
    const basename = path.basename(itemPath);
    return this.ignorePaths.includes(basename) || 
           basename.startsWith('.');
  }

  /**
   * Get file/directory info
   */
  getItemInfo(itemPath) {
    try {
      const stats = fs.statSync(itemPath);
      const relativePath = path.relative(this.rootPath, itemPath);
      
      return {
        path: relativePath,
        type: stats.isDirectory() ? 'dir' : 'file',
        size: stats.isFile() ? stats.size : null,
        exists: true,
        isKey: this.keyDirectories.some(key => relativePath.includes(key)),
        isImportant: this.importantFiles.includes(relativePath)
      };
    } catch (error) {
      return {
        path: path.relative(this.rootPath, itemPath),
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Scan directory recursively
   */
  scanDirectory(dirPath, level = 0) {
    if (level > 5) return; // Max depth
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        if (this.shouldIgnore(fullPath)) continue;
        
        const info = this.getItemInfo(fullPath);
        this.output.push({ ...info, level });
        
        if (info.type === 'dir' && info.exists) {
          this.scanDirectory(fullPath, level + 1);
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dirPath}:`, error.message);
    }
  }

  /**
   * Check for required directories and files
   */
  checkRequirements() {
    console.log('\n📋 Checking Required Files and Directories:\n');
    
    // Check key directories
    console.log('📁 Key Directories:');
    for (const dir of this.keyDirectories) {
      const fullPath = path.join(this.rootPath, dir);
      const exists = fs.existsSync(fullPath);
      const icon = exists ? '✅' : '❌';
      console.log(`${icon} ${dir}`);
      
      if (!exists && dir.includes('uploads')) {
        console.log(`   ⚠️  Creating ${dir}...`);
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    
    // Check important files
    console.log('\n📄 Important Files:');
    for (const file of this.importantFiles) {
      const fullPath = path.join(this.rootPath, file);
      const exists = fs.existsSync(fullPath);
      const icon = exists ? '✅' : '❌';
      console.log(`${icon} ${file}`);
      
      if (!exists && file === '.env') {
        console.log('   ⚠️  .env file missing! Copy .env.example or create one.');
      }
    }
  }

  /**
   * Generate tree view
   */
  generateTree() {
    console.log('\n🌳 Project Structure:\n');
    
    const tree = [];
    const sortedOutput = this.output.sort((a, b) => a.path.localeCompare(b.path));
    
    for (const item of sortedOutput) {
      if (item.level <= 3) { // Show only first 3 levels
        const indent = '  '.repeat(item.level);
        const icon = item.type === 'dir' ? '📁' : '📄';
        const highlight = item.isKey || item.isImportant ? ' ⭐' : '';
        
        tree.push(`${indent}${icon} ${path.basename(item.path)}${highlight}`);
      }
    }
    
    console.log(tree.join('\n'));
  }

  /**
   * Check upload directory permissions
   */
  async checkUploadPermissions() {
    console.log('\n🔐 Checking Upload Directory Permissions:\n');
    
    const uploadDir = path.join(this.rootPath, 'public/uploads');
    
    try {
      // Try to create a test file
      const testFile = path.join(uploadDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Upload directory is writable');
    } catch (error) {
      console.log('❌ Upload directory is NOT writable:', error.message);
      console.log('   Run: chmod -R 755 public/uploads');
    }
  }

  /**
   * Generate context file
   */
  generateContextFile() {
    const contextPath = path.join(this.rootPath, 'project-context.md');
    
    let content = '# Project Context\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Add directory structure
    content += '## Directory Structure\n\n```\n';
    for (const item of this.output) {
      if (item.level <= 3 && item.exists) {
        const indent = '  '.repeat(item.level);
        const type = item.type === 'dir' ? '/' : '';
        content += `${indent}${path.basename(item.path)}${type}\n`;
      }
    }
    content += '```\n\n';
    
    // Add missing items
    const missing = this.output.filter(item => !item.exists);
    if (missing.length > 0) {
      content += '## Missing Files/Directories\n\n';
      missing.forEach(item => {
        content += `- ${item.path}\n`;
      });
      content += '\n';
    }
    
    // Add recommendations
    content += '## Recommendations\n\n';
    
    if (!fs.existsSync(path.join(this.rootPath, 'public/uploads/cases'))) {
      content += '1. Create upload directories:\n';
      content += '   ```bash\n';
      content += '   mkdir -p public/uploads/cases\n';
      content += '   chmod -R 755 public/uploads\n';
      content += '   ```\n\n';
    }
    
    if (!fs.existsSync(path.join(this.rootPath, '.env'))) {
      content += '2. Create .env file with required variables\n\n';
    }
    
    if (!fs.existsSync(path.join(this.rootPath, 'prisma/dev.db'))) {
      content += '3. Initialize database:\n';
      content += '   ```bash\n';
      content += '   npx prisma generate\n';
      content += '   npx prisma db push\n';
      content += '   ```\n\n';
    }
    
    fs.writeFileSync(contextPath, content);
    console.log(`\n📝 Context file saved to: ${contextPath}`);
  }

  /**
   * Run full analysis
   */
  analyze() {
    console.log(`\n🔍 Analyzing project at: ${this.rootPath}\n`);
    
    // Scan directory
    this.scanDirectory(this.rootPath);
    
    // Run checks
    this.checkRequirements();
    this.generateTree();
    this.checkUploadPermissions();
    this.generateContextFile();
    
    // Summary
    const dirs = this.output.filter(i => i.type === 'dir' && i.exists).length;
    const files = this.output.filter(i => i.type === 'file' && i.exists).length;
    const missing = this.output.filter(i => !i.exists).length;
    
    console.log('\n📊 Summary:');
    console.log(`   Directories: ${dirs}`);
    console.log(`   Files: ${files}`);
    console.log(`   Missing: ${missing}`);
    
    // Quick fixes
    if (missing > 0) {
      console.log('\n🔧 Quick Fixes:');
      console.log('   npm run init-project  # Run initialization script');
      console.log('   npm run check-setup   # Check setup status');
    }
  }
}

// CLI Usage
if (require.main === module) {
  const analyzer = new DirectoryAnalyzer(process.argv[2] || '.');
  analyzer.analyze();
}

module.exports = DirectoryAnalyzer;