#!/bin/bash

echo "Installing teladoc-member-agents..."

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .

echo "Installation complete! You can now use 'teladoc-agent' command."