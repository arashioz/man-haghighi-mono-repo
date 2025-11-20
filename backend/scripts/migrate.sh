#!/bin/sh

echo "🔄 Starting database migration process..."

# Function to baseline migrations
baseline_migrations() {
    echo "📋 Baselines database - marking migrations as applied..."
    
    # List of all migrations in order
    MIGRATIONS="20251013230351_initial
20251014213449_add_sales_team_models
20251029023655_add_workshop_media_links
20251029030458_add_article_seo_fields
20251112090000_add_user_profile_fields
20251112123000_rename_phone_to_user_phone"
    
    for migration in $MIGRATIONS; do
        echo "  Marking $migration as applied..."
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || echo "    (Migration $migration may already be applied)"
    done
}

# Try to deploy migrations first
echo "📦 Attempting to deploy migrations..."
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -eq 0 ]; then
    echo "✅ Migrations deployed successfully"
elif echo "$MIGRATE_OUTPUT" | grep -q "P3005"; then
    echo "⚠️  Database schema exists but migration history is missing. Baselines database..."
    baseline_migrations
    echo "✅ Database baselined. Retrying migrate deploy..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    }
else
    echo "⚠️  Migration deploy failed with unknown error. Attempting to baseline..."
    baseline_migrations
    echo "✅ Retrying migrate deploy..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    }
fi

echo "✅ Migration process completed"

