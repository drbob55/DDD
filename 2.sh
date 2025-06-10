# First, let's make sure we're in the right directory
cd packages/database

# Remove the incorrect file
rm package.json

# Create the correct package.json with proper JSON content
echo '{
  "name": "@dental/database",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.9.0"
  },
  "devDependencies": {
    "prisma": "^6.9.0",
    "tsx": "^4.7.0"
  }
}' > package.json