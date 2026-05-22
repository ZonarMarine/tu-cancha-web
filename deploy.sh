#!/bin/bash
set -e

VERCEL="./node_modules/.bin/vercel"
DIR="/Users/alemora/tu-cancha-web"

echo ""
echo "🚀 Deploying TuCancha..."
echo ""

# ── 1. Deploy to tu-cancha-web (vercel.app preview URL) ──
echo "▲ [1/2] Deploying to tu-cancha-web..."
$VERCEL link --project tu-cancha-web --scope zonar-marine --yes --cwd $DIR > /dev/null 2>&1
$VERCEL $DIR --prod --yes 2>&1 | tail -5
echo ""

# ── 2. Deploy to tu-cancha-cr (www.tucanchacr.com) ──
echo "▲ [2/2] Deploying to www.tucanchacr.com..."
$VERCEL link --project tu-cancha-cr --scope zonar-marine --yes --cwd $DIR > /dev/null 2>&1
$VERCEL $DIR --prod --yes 2>&1 | tail -5
echo ""

# ── Restore default link ──
$VERCEL link --project tu-cancha-web --scope zonar-marine --yes --cwd $DIR > /dev/null 2>&1

echo "✅ Done! Live at:"
echo "   https://tu-cancha-web.vercel.app"
echo "   https://www.tucanchacr.com"
echo ""
