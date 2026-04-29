#!/bin/bash
set -e

if [ -f package.json ]; then
  npm install --no-audit --no-fund --prefer-offline
fi

if [ -f requirements.txt ]; then
  python -m pip install --quiet --disable-pip-version-check -r requirements.txt || true
fi

echo "Post-merge setup complete."
