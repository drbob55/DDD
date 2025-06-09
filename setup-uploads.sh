#!/bin/bash
# setup-uploads.sh - Script to set up the uploads directory structure

echo "=== Setting Up Upload Directory Structure ==="

# Create the upload directory structure
echo "Creating directories..."
mkdir -p public/uploads/cases

# Create .gitkeep files to maintain directory structure in git
echo "Creating .gitkeep files..."
touch public/uploads/.gitkeep
touch public/uploads/cases/.gitkeep

# Set appropriate permissions
echo "Setting permissions..."
chmod -R 755 public/uploads

# Add to .gitignore if not already present
if ! grep -q "/public/uploads/\*" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# Upload directories" >> .gitignore
  echo "/public/uploads/*" >> .gitignore
  echo "!/public/uploads/.gitkeep" >> .gitignore
  echo "" >> .gitignore
  echo "# Keep the directory structure but ignore the files" >> .gitignore
  echo "/public/uploads/cases/*" >> .gitignore
  echo "!/public/uploads/cases/.gitkeep" >> .gitignore
  echo "Added upload directories to .gitignore"
fi

echo ""
echo "=== Directory Structure Created ==="
echo "public/"
echo "└── uploads/"
echo "    └── cases/"
echo ""
echo "Setup complete! The upload directory is ready for use."