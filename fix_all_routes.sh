#!/usr/bin/env bash

# Fix All Routes in Migrated Files
# This script updates all routes and imports in your migrated monorepo files

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Fixing All Routes in Migrated Files${NC}"
echo -e "${PURPLE}========================================${NC}"
echo

# ==========================================
# Step 1: Check Current State
# ==========================================
echo -e "${BLUE}Step 1: Checking current migration state...${NC}"

# Check if migration was done
if [ ! -d "packages/shared/src/types" ] || [ ! -d "apps/web/src/components/features" ]; then
    echo -e "${RED}Error: Migration not complete. Please run migration scripts first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Migration structure found"

# ==========================================
# Step 2: Fix API Route Imports
# ==========================================
echo -e "${BLUE}Step 2: Fixing API route imports...${NC}"

# Create a comprehensive import fix script
cat > fix_all_imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Function to find files recursively
function findFiles(dir, pattern) {
  const results = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.startsWith('.')) {
          walk(filePath);
        }
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  }
  
  walk(dir);
  return results;
}

// Import mappings based on new structure
const importMappings = {
  // Type imports
  '@/types/case.types': '@dental/shared',
  '@/types/appointment.types': '@dental/shared',
  '@/types/activity.types': '@dental/shared',
  '@/types/clinic': '@dental/shared',
  '@/types': '@dental/shared',
  '../types': '@dental/shared',
  '../../types': '@dental/shared',
  
  // Component imports
  '@/components/shared/Modal': '@dental/ui',
  '@/components/shared/Toast': '@dental/ui',
  '@/components/shared/Pagination': '@dental/ui',
  '@/components/shared/LoadingSkeleton': '@dental/ui',
  '@/components/shared/FilePreview': '@dental/ui',
  '@/components/shared/ThreeDViewer': '@dental/ui',
  '@/components/shared/VirtualList': '@dental/ui',
  '@/components/shared/ErrorBoundary': '@dental/ui',
  '@/components/shared': '@dental/ui',
  '../shared': '@dental/ui',
  '../../shared': '@dental/ui',
  
  // Dashboard imports
  '@/components/AdminDashboard': '@/components/features/dashboards/AdminDashboard',
  '@/components/dentist/DentistDashboard': '@/components/features/dashboards/DentistDashboard',
  '@/components/PatientDashboard': '@/components/features/dashboards/PatientDashboard',
  '@/components/ReviewerDashboard': '@/components/features/dashboards/ReviewerDashboard',
  '@/components/ManufacturerDashboard': '@/components/features/dashboards/ManufacturerDashboard',
  
  // Feature component imports
  '@/components/cases': '@/components/features/cases',
  '@/components/appointments': '@/components/features/appointments',
  '@/components/admin': '@/components/features/admin',
  
  // Utils imports
  '@/utils/dateUtils': '@dental/shared',
  '@/utils/fileUtils': '@dental/shared',
  '@/utils/validation': '@dental/shared',
  '@/lib/constants': '@dental/shared',
  '../lib/constants': '@dental/shared',
  '../../lib/constants': '@dental/shared',
  
  // Service imports (these need to be updated to use cases)
  '@/services/api': '@/lib/api-client',
  '@/services/appointmentService': '@/lib/appointment-client',
  '@/sevices/api': '@/lib/api-client', // Fix typo
  '@/sevices/appointmentService': '@/lib/appointment-client',
};

function updateImports(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Track what was changed
  const changes = [];

  // Replace imports
  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    // Match various import styles
    const patterns = [
      new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
      new RegExp(`from "${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      new RegExp(`from '${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
    ];
    
    patterns.forEach(pattern => {
      if (content.match(pattern)) {
        content = content.replace(pattern, `from '${newImport}'`);
        modified = true;
        changes.push(`${oldImport} → ${newImport}`);
      }
    });
  }

  // Fix relative imports for components within features
  if (filePath.includes('components/features/')) {
    // Fix relative imports to shared components
    content = content.replace(/from ['"]\.\.\/\.\.\/shared\/(.*?)['"]/g, "from '@dental/ui'");
    
    // Fix relative imports between feature components
    content = content.replace(/from ['"]\.\.\/cases\/(.*?)['"]/g, "from '@/components/features/cases/$1'");
    content = content.replace(/from ['"]\.\.\/appointments\/(.*?)['"]/g, "from '@/components/features/appointments/$1'");
  }

  // Fix imports in dashboard components
  if (filePath.includes('dashboards/')) {
    // Update case/appointment component imports
    content = content.replace(/from ['"]\.\.\/cases['"]/g, "from '@/components/features/cases'");
    content = content.replace(/from ['"]\.\.\/appointments['"]/g, "from '@/components/features/appointments'");
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${path.basename(filePath)}: ${changes.join(', ')}`);
  }
}

// Process all TypeScript and TSX files
console.log('Scanning for files to update...\n');

const directories = [
  'apps/web/src',
  'packages/ui/src',
  'packages/core/src',
  'packages/shared/src',
  'packages/api/src'
];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Processing ${dir}...`);
    const files = findFiles(dir, /\.(ts|tsx)$/);
    files.forEach(file => {
      updateImports(file);
    });
  }
});

console.log('\nImport updates complete!');
EOF

# Run the import fix script
echo -e "${YELLOW}Running import fixes...${NC}"
node fix_all_imports.js
rm fix_all_imports.js

# ==========================================
# Step 3: Fix API Routes to Use New Structure
# ==========================================
echo -e "${BLUE}Step 3: Creating API route adapters...${NC}"

# Create API client to replace direct API calls
mkdir -p apps/web/src/lib

cat > apps/web/src/lib/api-client.ts << 'EOF'
// API Client for migrated routes
// This replaces direct /api calls with tRPC or use case calls

// Legacy API wrapper for gradual migration
export const legacyApi = {
  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  async get(url: string) {
    const response = await fetch(url);
    return response.json();
  },
  
  async put(url: string, data: any) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  async delete(url: string) {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// TODO: Add tRPC client here once configured
// export const api = createTRPCProxyClient({...});
EOF

# ==========================================
# Step 4: Update Component API Calls
# ==========================================
echo -e "${BLUE}Step 4: Updating API calls in components...${NC}"

cat > update_api_calls.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Function to find files recursively
function findFiles(dir, pattern) {
  const results = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.startsWith('.')) {
          walk(filePath);
        }
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  }
  
  walk(dir);
  return results;
}

function updateApiCalls(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add import for api client if file contains fetch calls
  if (content.includes('fetch(') && content.includes('/api/')) {
    if (!content.includes('api-client')) {
      // Add import at the top after other imports
      const importMatch = content.match(/(import .* from .*;\n)+/);
      if (importMatch) {
        const lastImport = importMatch[0];
        content = content.replace(
          lastImport,
          lastImport + "import { legacyApi } from '@/lib/api-client';\n"
        );
        modified = true;
      }
    }
    
    // Note: For now, we'll keep fetch calls as-is to avoid breaking functionality
    // Users can gradually migrate to legacyApi or tRPC
    
    if (modified) {
      console.log(`✓ Added api-client import to ${path.basename(filePath)}`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}

// Process component files
if (fs.existsSync('apps/web/src/components')) {
  const componentFiles = findFiles('apps/web/src/components', /\.(ts|tsx)$/);
  componentFiles.forEach(file => {
    updateApiCalls(file);
  });
  console.log('API call updates complete!');
}
EOF

node update_api_calls.js
rm update_api_calls.js

# ==========================================
# Step 5: Fix Hook Imports
# ==========================================
echo -e "${BLUE}Step 5: Fixing hook imports...${NC}"

cat > fix_hook_imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const results = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.startsWith('.')) {
          walk(filePath);
        }
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  }
  
  walk(dir);
  return results;
}

function updateHookImports(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Update hook imports
  const hookMappings = {
    '@/hooks/useAsync': '@/hooks/useAsync',
    '@/hooks/useDebounce': '@/hooks/useDebounce',
    '@/hooks/useToast': '@/hooks/useToast',
    '@/hooks/useLocalStorage': '@/hooks/useLocalStorage',
    '@/hooks': '@/hooks',
    '../hooks': '@/hooks',
    '../../hooks': '@/hooks',
  };
  
  for (const [oldImport, newImport] of Object.entries(hookMappings)) {
    const pattern = new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (content.match(pattern)) {
      content = content.replace(pattern, `from '${newImport}'`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated hook imports in ${path.basename(filePath)}`);
  }
}

// Process all component files
if (fs.existsSync('apps/web/src/components')) {
  const files = findFiles('apps/web/src/components', /\.(ts|tsx)$/);
  files.forEach(file => {
    updateHookImports(file);
  });
}
EOF

node fix_hook_imports.js
rm fix_hook_imports.js

# ==========================================
# Step 6: Verify and Report
# ==========================================
echo -e "${BLUE}Step 6: Verifying updates...${NC}"

cat > verify_imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const results = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!file.includes('node_modules') && !file.startsWith('.')) {
            walk(filePath);
          }
        } else if (pattern.test(file)) {
          results.push(filePath);
        }
      } catch (e) {
        // Skip files that can't be accessed
      }
    }
  }
  
  walk(dir);
  return results;
}

console.log('\nVerifying import updates...\n');

let issuesFound = false;
const patterns = [
  '@/types/', // Should be @dental/shared
  '@/components/shared/', // Should be @dental/ui
  '../shared/', // Should be @dental/ui
  '@/lib/constants', // Should be @dental/shared
  '@/sevices/', // Typo that should be fixed
];

if (fs.existsSync('apps/web/src')) {
  const files = findFiles('apps/web/src', /\.(ts|tsx)$/);

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          console.log(`⚠️  Found old import pattern "${pattern}" in ${file}`);
          issuesFound = true;
        }
      });
    } catch (e) {
      // Skip files that can't be read
    }
  });
}

if (!issuesFound) {
  console.log('✅ All imports appear to be updated correctly!');
} else {
  console.log('\n❌ Some old import patterns still exist. Please review the files above.');
}
EOF

node verify_imports.js
rm verify_imports.js

# ==========================================
# Step 7: Create Import Map Documentation
# ==========================================
echo -e "${BLUE}Creating import map documentation...${NC}"

cat > IMPORT_MAP.md << 'EOF'
# Import Map - Old vs New Structure

## Type Imports
| Old Import | New Import |
|------------|------------|
| `@/types/*` | `@dental/shared` |
| `@/types/case.types` | `@dental/shared` |
| `@/types/appointment.types` | `@dental/shared` |
| `../types` | `@dental/shared` |

## Component Imports
| Old Import | New Import |
|------------|------------|
| `@/components/shared/*` | `@dental/ui` |
| `@/components/shared/Modal` | `@dental/ui` |
| `@/components/shared/Toast` | `@dental/ui` |
| `../shared/Component` | `@dental/ui` |

## Dashboard Imports
| Old Import | New Import |
|------------|------------|
| `@/components/AdminDashboard` | `@/components/features/dashboards/AdminDashboard` |
| `@/components/dentist/DentistDashboard` | `@/components/features/dashboards/DentistDashboard` |
| `@/components/PatientDashboard` | `@/components/features/dashboards/PatientDashboard` |

## Feature Component Imports
| Old Import | New Import |
|------------|------------|
| `@/components/cases/*` | `@/components/features/cases/*` |
| `@/components/appointments/*` | `@/components/features/appointments/*` |
| `../cases/Component` | `@/components/features/cases/Component` |

## Utility Imports
| Old Import | New Import |
|------------|------------|
| `@/utils/*` | `@dental/shared` |
| `@/lib/constants` | `@dental/shared` |

## Service/API Imports
| Old Import | New Import |
|------------|------------|
| `fetch('/api/*')` | `legacyApi.*` or tRPC |
| `@/services/*` | Use cases in `@dental/core` |

## Hook Imports
| Old Import | New Import |
|------------|------------|
| `@/hooks/*` | `@/hooks/*` (stays the same) |
| `../hooks/*` | `@/hooks/*` |
EOF

# ==========================================
# Final Summary
# ==========================================
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Route & Import Fixes Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}What was updated:${NC}"
echo "✓ All type imports → @dental/shared"
echo "✓ All shared component imports → @dental/ui"
echo "✓ Dashboard component paths"
echo "✓ Feature component paths"
echo "✓ API client created for gradual migration"
echo "✓ Hook imports normalized"
echo
echo -e "${BLUE}Files updated in:${NC}"
echo "• apps/web/src/components/"
echo "• apps/web/src/app/"
echo "• packages/ui/src/"
echo "• packages/shared/src/"
echo
echo -e "${PURPLE}Next Steps:${NC}"
echo "1. Review IMPORT_MAP.md for reference"
echo "2. Install dependencies: pnpm install"
echo "3. Test the application:"
echo "   pnpm build"
echo "   cd apps/web && pnpm dev"
echo "4. Fix any remaining import errors shown in the build"
echo
echo -e "${YELLOW}Note:${NC} API routes still need to be migrated to use cases."
echo "The legacyApi wrapper allows your app to work during migration."