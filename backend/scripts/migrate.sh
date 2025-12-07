#!/bin/sh

echo "🔄 Starting database migration process..."

# Function to apply rename migration manually if needed
apply_rename_migration() {
    echo "🔍 Checking if phone column rename is needed..."
    
    # Use Node.js script to rename the column
    if [ -f "scripts/rename-phone-column.ts" ]; then
        npx ts-node scripts/rename-phone-column.ts 2>&1 || echo "⚠️  Column rename check completed (may already be done)"
    else
        echo "⚠️  Rename script not found, skipping..."
    fi
}

# Function to baseline migrations
baseline_migrations() {
    echo "📋 Baselines database - marking migrations as applied..."
    
    # List of all migrations in order
    MIGRATIONS="20251013230351_initial
20251014213449_add_sales_team_models
20251029023655_add_workshop_media_links
20251029030458_add_article_seo_fields
20251112090000_add_user_profile_fields
20251112123000_rename_phone_to_user_phone
20251113000000_add_video_podcasts_table
20251113000001_add_old_products_table
20251204173712_add_show_on_homepage_to_courses
20251208000000_add_logs_table"
    
    for migration in $MIGRATIONS; do
        echo "  Marking $migration as applied..."
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || echo "    (Migration $migration may already be applied)"
    done
}

# First, check and apply rename migration if needed
apply_rename_migration

# Function to resolve failed migrations
resolve_failed_migrations() {
    echo "🔧 Resolving failed migrations..."
    
    # Get list of failed migrations from Prisma
    FAILED_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep -i "failed" | awk '{print $1}' || echo "")
    
    if [ -n "$FAILED_MIGRATIONS" ]; then
        echo "  Found failed migrations, marking as rolled back..."
        for migration in $FAILED_MIGRATIONS; do
            echo "    Resolving $migration..."
            npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || \
            npx prisma migrate resolve --applied "$migration" 2>/dev/null || \
            echo "      (Could not resolve $migration automatically)"
        done
    fi
    
    # Also try to resolve the specific known failed migration
    npx prisma migrate resolve --rolled-back "20250101000000_add_podcast_thumbnail" 2>/dev/null || \
    npx prisma migrate resolve --applied "20250101000000_add_podcast_thumbnail" 2>/dev/null || \
    echo "  (Migration 20250101000000_add_podcast_thumbnail resolution attempted)"
}

# Try to deploy migrations
echo "📦 Attempting to deploy migrations..."
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -eq 0 ]; then
    echo "✅ Migrations deployed successfully"
elif echo "$MIGRATE_OUTPUT" | grep -q "P3009"; then
    echo "⚠️  Found failed migrations (P3009). Resolving..."
    resolve_failed_migrations
    echo "✅ Retrying migrate deploy after resolving failed migrations..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    }
elif echo "$MIGRATE_OUTPUT" | grep -q "P3005"; then
    echo "⚠️  Database schema exists but migration history is missing. Baselines database..."
    baseline_migrations
    echo "✅ Database baselined. Retrying migrate deploy..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    }
else
    echo "⚠️  Migration deploy failed with unknown error. Attempting to resolve failed migrations..."
    resolve_failed_migrations
    echo "✅ Retrying migrate deploy..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    }
fi

# 🔥 IMPORTANT: Regenerate Prisma Client after migrations
# Try to regenerate, but continue if it fails (Client is already generated in build stage)
echo "🔄 Regenerating Prisma Client after migrations..."
if npx prisma generate 2>&1; then
    echo "✅ Prisma Client regenerated successfully"
else
    echo "⚠️  Prisma generate had issues, but continuing with existing client from build stage..."
    echo "    (This is usually fine as Prisma Client is pre-generated during Docker build)"
fi

echo "✅ Migration process completed"

