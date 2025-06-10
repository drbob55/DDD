#!/usr/bin/env bash

# Automated File Migration Script
# This script helps move files from backup to new structure

set -e

BACKUP_DIR="$1"
if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "Starting file migration from $BACKUP_DIR"

# Create directories if they don't exist
mkdir -p packages/shared/src/types
mkdir -p packages/core/src/{domain,application,infrastructure}
mkdir -p packages/ui/src/components
mkdir -p packages/api/src/routers
mkdir -p apps/web/src/components/features

# Function to copy with backup
copy_file() {
    local src=$1
    local dest=$2
    
    if [ -f "$src" ]; then
        # Create destination directory
        mkdir -p "$(dirname "$dest")"
        
        # Backup if destination exists
        if [ -f "$dest" ]; then
            mv "$dest" "${dest}.backup"
        fi
        
        cp "$src" "$dest"
        echo "✓ Copied: $src → $dest"
    fi
}

# Migrate Types
echo -e "\n📁 Migrating Types..."
if [ -d "$BACKUP_DIR/src/types" ]; then
    find "$BACKUP_DIR/src/types" -name "*.ts" -not -name "*.d.ts" | while read -r file; do
        filename=$(basename "$file")
        copy_file "$file" "packages/shared/src/types/${filename}"
    done
fi

# Migrate Services
echo -e "\n📁 Migrating Services..."
if [ -d "$BACKUP_DIR/src/services" ]; then
    find "$BACKUP_DIR/src/services" -name "*.ts" | while read -r file; do
        filename=$(basename "$file")
        # Services need to be refactored into use cases
        copy_file "$file" "packages/core/src/application/services/${filename}.todo"
    done
fi

# Migrate Components
echo -e "\n📁 Migrating Components..."
if [ -d "$BACKUP_DIR/src/components" ]; then
    # Identify shared vs feature components
    find "$BACKUP_DIR/src/components" -name "*.tsx" -o -name "*.jsx" | while read -r file; do
        filename=$(basename "$file")
        
        # Check if it's a UI component (Button, Card, etc.) or feature component
        if [[ "$filename" =~ ^(Button|Card|Input|Modal|Table|Form) ]]; then
            copy_file "$file" "packages/ui/src/components/${filename}"
        else
            # Feature component - need to determine which feature
            copy_file "$file" "apps/web/src/components/features/temp/${filename}"
        fi
    done
fi

# Migrate API Routes
echo -e "\n📁 Migrating API Routes..."
if [ -d "$BACKUP_DIR/src/app/api" ] || [ -d "$BACKUP_DIR/app/api" ]; then
    # These need significant refactoring
    mkdir -p migration_workspace/api_routes
    find "$BACKUP_DIR" -path "*/api/*" -name "route.ts" -o -name "route.js" | while read -r file; do
        # Extract route name from path
        route_path=$(echo "$file" | grep -o "api/.*" | sed 's/\/route\.[tj]s$//')
        route_name=$(echo "$route_path" | tr '/' '_')
        copy_file "$file" "migration_workspace/api_routes/${route_name}.todo"
    done
fi

# Migrate Prisma Schema
echo -e "\n📁 Migrating Database Schema..."
if [ -f "$BACKUP_DIR/prisma/schema.prisma" ]; then
    copy_file "$BACKUP_DIR/prisma/schema.prisma" "prisma/schema/base.prisma.todo"
fi

# Copy environment files
echo -e "\n📁 Copying Environment Files..."
if [ -f "$BACKUP_DIR/.env.local" ]; then
    copy_file "$BACKUP_DIR/.env.local" ".env.local"
fi

echo -e "\n✅ File migration complete!"
echo -e "\n📋 Next steps:"
echo "1. Review files marked with .todo extension"
echo "2. Refactor API routes into use cases"
echo "3. Split services into domain and application layers"
echo "4. Update import paths"
echo "5. Run 'pnpm install' to install dependencies"

