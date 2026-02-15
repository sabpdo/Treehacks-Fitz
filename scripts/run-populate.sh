#!/bin/bash
# Helper script to populate shopping items
# Usage: ./scripts/run-populate.sh path/to/products.json

if [ -z "$1" ]; then
  echo "❌ Error: Please provide a JSON file path"
  echo ""
  echo "Usage:"
  echo "  ./scripts/run-populate.sh path/to/products.json"
  echo ""
  echo "Or:"
  echo "  SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npm run populate:shopping products.json"
  exit 1
fi

# Check if service role key is set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set"
  echo ""
  echo "Please set it:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
  echo ""
  echo "Or run with:"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your_key ./scripts/run-populate.sh $1"
  exit 1
fi

# Use VITE_SUPABASE_URL if SUPABASE_URL is not set
if [ -z "$SUPABASE_URL" ] && [ ! -z "$VITE_SUPABASE_URL" ]; then
  export SUPABASE_URL="$VITE_SUPABASE_URL"
fi

echo "🚀 Running population script..."
echo "   JSON file: $1"
echo "   Supabase URL: ${SUPABASE_URL:-$VITE_SUPABASE_URL}"
echo ""

npx tsx scripts/populate-shopping-items.ts "$1"

