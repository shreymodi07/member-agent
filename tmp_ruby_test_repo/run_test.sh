#!/usr/bin/env bash
set -euo pipefail
ROOT=$(pwd)
echo "Initializing test repo at $ROOT"
git init -q
git config user.email "test@example.com"
git config user.name "Test Runner"
git add .
git commit -m "Initial" -q || true

# Make a change to the ruby file to create diff
echo "\n# change for test" >> app/serializers/teladoc_registration/registration_serializer.rb

git add app/serializers/teladoc_registration/registration_serializer.rb

export PATH="$ROOT/fake_bin:$PATH"

echo "Running teladoc-agent rubocop-fix-diff --rubocop-only"
node ../dist/cli.js rubocop-fix-diff --path "$ROOT" --rubocop-only

echo "Showing file after run:"
sed -n '1,120p' app/serializers/teladoc_registration/registration_serializer.rb
