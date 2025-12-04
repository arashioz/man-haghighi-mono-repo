#!/bin/sh

# Detect if we're in a Docker container or on the host
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
  # We're inside a Docker container
  NPX_CMD="npx"
  NPM_CMD="npm"
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "haghighi_backend"; then
  # We're on the host and Docker container exists
  echo "🐳 Running inside Docker container..."
  docker exec haghighi_backend sh -c "
    echo '🔄 Running migrations before seed...'
    npx prisma migrate deploy || {
      echo '⚠️  Migration deploy failed, trying db push as fallback...'
      npx prisma db push --accept-data-loss || true
    }
    echo '🔄 Regenerating Prisma Client...'
    npx prisma generate
    echo '🌱 Running seed...'
    npm run prisma:seed
  "
  exit $?
else
  # Try to find npx/npm in PATH or common locations
  if command -v npx >/dev/null 2>&1; then
    NPX_CMD="npx"
  elif [ -f "/usr/local/bin/npx" ]; then
    NPX_CMD="/usr/local/bin/npx"
  elif [ -f "/usr/bin/npx" ]; then
    NPX_CMD="/usr/bin/npx"
  else
    echo "❌ Error: npx not found. Please run this script inside the Docker container:"
    echo "   docker exec haghighi_backend sh /app/scripts/seed-with-migration.sh"
    exit 1
  fi
  
  if command -v npm >/dev/null 2>&1; then
    NPM_CMD="npm"
  elif [ -f "/usr/local/bin/npm" ]; then
    NPM_CMD="/usr/local/bin/npm"
  elif [ -f "/usr/bin/npm" ]; then
    NPM_CMD="/usr/bin/npm"
  else
    echo "❌ Error: npm not found. Please run this script inside the Docker container:"
    echo "   docker exec haghighi_backend sh /app/scripts/seed-with-migration.sh"
    exit 1
  fi
fi

echo "🔄 Running migrations before seed..."
$NPX_CMD prisma migrate deploy || {
  echo "⚠️  Migration deploy failed, trying db push as fallback..."
  $NPX_CMD prisma db push --accept-data-loss || true
}

echo "🔄 Regenerating Prisma Client..."
$NPX_CMD prisma generate

echo "🌱 Running seed..."
$NPM_CMD run prisma:seed

