#!/usr/bin/env sh
set -eu

echo "[1/4] Frontend dependencies"
npm ci

echo "[2/4] Backend dependencies"
npm --prefix backend ci

echo "[3/4] Backend syntax check"
npm --prefix backend run check

echo "[4/4] Frontend production build"
npm run build

echo "Predeploy checks completed successfully."
