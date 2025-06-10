#!/bin/bash

echo "🛠️ Fixing all build issues in the monorepo..."

# Step 1: Fix TypeScript configuration for core package
echo "📝 Fixing core package tsconfig..."
cat > packages/core/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": false,
    "tsBuildInfoFile": null
  },
  "include": [
    "src/**/*",
    "../shared/src/**/*"
  ],
  "exclude": ["node_modules", "dist"]
}
EOF

# Step 2: Update core package tsup config to handle external dependencies
echo "⚙️ Updating core tsup config..."
cat > packages/core/tsup.config.ts << 'EOF'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@dental/shared']
})
EOF

# Step 3: Fix UI package tsconfig
echo "📝 Fixing UI tsconfig..."
cat > packages/ui/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": false,
    "tsBuildInfoFile": null
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Step 4: Create missing UI components that are being imported
echo "🎨 Creating missing UI components..."

# Create Table component
mkdir -p packages/ui/src/components/Table
cat > packages/ui/src/components/Table/index.tsx << 'EOF'
import React from 'react'
import { cn } from '../../lib/utils'

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"
EOF

# Create layout components
mkdir -p packages/ui/src/components/layouts/DashboardLayout
cat > packages/ui/src/components/layouts/DashboardLayout/index.tsx << 'EOF'
import React from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  sidebar, 
  header 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {header && (
        <header className="bg-white shadow-sm border-b">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="w-64 bg-white shadow-sm min-h-screen">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
EOF

mkdir -p packages/ui/src/components/layouts/AuthLayout
cat > packages/ui/src/components/layouts/AuthLayout/index.tsx << 'EOF'
import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {(title || subtitle) && (
          <div className="text-center">
            {title && (
              <h2 className="text-3xl font-extrabold text-gray-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  )
}
EOF

# Step 5: Update UI index.ts with all exports
echo "📄 Updating UI index.ts..."
cat > packages/ui/src/index.ts << 'EOF'
// Components
export * from './components/Button'
export * from './components/Input'
export * from './components/Card'
export * from './components/Badge'
export * from './components/Table'
export * from './components/Modal'
export * from './components/LoadingSkeleton'
export * from './components/Pagination'
export * from './components/FilePreview'
export * from './components/ThreeDViewer'

// Layouts
export * from './components/layouts/DashboardLayout'
export * from './components/layouts/AuthLayout'

// Hooks
export * from './hooks/useModal'
export * from './hooks/useToast'

// Utils
export * from './lib/utils'
EOF

# Step 6: Update UI tsup config with all external dependencies
echo "⚙️ Updating UI tsup config with externals..."
cat > packages/ui/tsup.config.ts << 'EOF'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next-auth',
    'next-auth/react',
    'three',
    'three/examples/jsm/controls/OrbitControls',
    'three/examples/jsm/loaders/STLLoader',
    'three/examples/jsm/loaders/OBJLoader',
    'three/examples/jsm/loaders/PLYLoader',
    '@dental/shared'
  ]
})
EOF

# Step 7: Install peer dependencies for UI package
echo "📦 Installing UI peer dependencies..."
cd packages/ui
pnpm add -D react react-dom @types/react @types/react-dom
cd ../..

# Step 8: Update shared package tsconfig
echo "📝 Fixing shared package tsconfig..."
cat > packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": false,
    "tsBuildInfoFile": null
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Step 9: Update root tsconfig.json
echo "📝 Updating root tsconfig..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@dental/core": ["./packages/core/src"],
      "@dental/core/*": ["./packages/core/src/*"],
      "@dental/shared": ["./packages/shared/src"],
      "@dental/shared/*": ["./packages/shared/src/*"],
      "@dental/ui": ["./packages/ui/src"],
      "@dental/ui/*": ["./packages/ui/src/*"]
    }
  },
  "exclude": ["node_modules", "**/dist"]
}
EOF

# Step 10: Clean all build artifacts
echo "🧹 Cleaning all build artifacts..."
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true

# Step 11: Update turbo.json to handle dependencies correctly
echo "⚙️ Updating turbo.json..."
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "outputs": [],
      "cache": true
    }
  }
}
EOF

echo "✅ All fixes completed!"
echo ""
echo "📋 Summary of fixes:"
echo "  ✅ Fixed TypeScript rootDir issues in all packages"
echo "  ✅ Created missing UI components (Table, Layouts)"
echo "  ✅ Added all external dependencies to tsup configs"
echo "  ✅ Fixed incremental compilation issues"
echo "  ✅ Updated turbo.json for proper caching"
echo "  ✅ Cleaned all build artifacts"
echo ""
echo "🚀 Now try building again:"
echo "  pnpm turbo build"
echo ""
echo "If build succeeds, you can run:"
echo "  pnpm turbo dev"