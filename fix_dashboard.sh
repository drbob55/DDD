#!/bin/bash

# Quick Dashboard Fix Script
set -e

echo "🔧 Fixing dashboard structure..."

# Create necessary directories
mkdir -p apps/web/src/app/dashboard
mkdir -p apps/web/src/components/features/dashboards
mkdir -p apps/web/src/components/shared
mkdir -p apps/web/src/hooks
mkdir -p apps/web/src/lib

# Copy dashboard page
if [ -f "backup_20250608_184327/src/app/dashboard/page.tsx" ]; then
    cp backup_20250608_184327/src/app/dashboard/page.tsx apps/web/src/app/dashboard/
    echo "✅ Dashboard page copied"
fi

# Copy dashboard components
dashboard_components=(
    "AdminDashboard.tsx"
    "PatientDashboard.tsx"
    "ReviewerDashboard.tsx"
    "ManufacturerDashboard.tsx"
)

for component in "${dashboard_components[@]}"; do
    source_file=$(find backup_20250608_184327/src/components -name "$component" 2>/dev/null | head -1)
    if [ -n "$source_file" ]; then
        cp "$source_file" "apps/web/src/components/features/dashboards/"
        echo "✅ Copied $component"
    fi
done

# Copy DentistDashboard from subdirectory
if [ -f "backup_20250608_184327/src/components/dentist/DentistDashboard.tsx" ]; then
    cp backup_20250608_184327/src/components/dentist/DentistDashboard.tsx apps/web/src/components/features/dashboards/
    echo "✅ Copied DentistDashboard.tsx"
fi

# Copy shared components
if [ -d "backup_20250608_184327/src/components/shared" ]; then
    cp -r backup_20250608_184327/src/components/shared/* apps/web/src/components/shared/ 2>/dev/null || true
    echo "✅ Copied shared components"
fi

# Copy hooks
if [ -d "backup_20250608_184327/src/hooks" ]; then
    cp -r backup_20250608_184327/src/hooks/* apps/web/src/hooks/ 2>/dev/null || true
    echo "✅ Copied hooks"
fi

# Copy lib files
if [ -d "backup_20250608_184327/src/lib" ]; then
    cp -r backup_20250608_184327/src/lib/* apps/web/src/lib/ 2>/dev/null || true
    echo "✅ Copied lib files"
fi

echo "🎉 Dashboard fix complete!"
echo "📝 Next: Update import paths and test at http://localhost:3000/dashboard"
