#!/bin/bash

# ZenPay Communication Service - Environment Setup Script
# This script sets up environment files for different environments

set -e

echo "🔧 Setting up ZenPay Communication Service environment files..."

# Create .env.development from template
if [ ! -f .env.development ]; then
    cp env.development.config .env.development
    echo "✅ Created .env.development"
else
    echo "⚠️  .env.development already exists, skipping..."
fi

# Create .env.production from template
if [ ! -f .env.production ]; then
    cp env.production.config .env.production
    echo "✅ Created .env.production"
else
    echo "⚠️  .env.production already exists, skipping..."
fi

# Create .env.local for local overrides (empty by default)
if [ ! -f .env.local ]; then
    touch .env.local
    echo "✅ Created .env.local (for local overrides)"
else
    echo "⚠️  .env.local already exists, skipping..."
fi

# Update .gitignore to include environment files
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

# Add environment files to .gitignore if not already present
ENV_PATTERNS=(".env" ".env.local" ".env.development" ".env.production" ".env.*.local")

for pattern in "${ENV_PATTERNS[@]}"; do
    if ! grep -q "^${pattern}$" .gitignore 2>/dev/null; then
        echo "${pattern}" >> .gitignore
        echo "✅ Added ${pattern} to .gitignore"
    fi
done

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.development with your local development settings"
echo "2. Edit .env.production with your production settings (use environment variables for secrets)"
echo "3. Add any local overrides to .env.local"
echo ""
echo "🔒 Security Note:"
echo "- Never commit .env files with real secrets to version control"
echo "- Use environment variables in production for sensitive data"
echo "- The .env.local file is for local development overrides only"
echo ""
echo "🚀 To start the service:"
echo "   npm run start:dev    # Uses .env.development"
echo "   npm run start:prod   # Uses .env.production"
