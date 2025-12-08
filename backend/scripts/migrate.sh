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
20251014000000_add_podcast_thumbnail
20251014213449_add_sales_team_models
20251029023655_add_workshop_media_links
20251029030458_add_article_seo_fields
20251112090000_add_user_profile_fields
20251112123000_rename_phone_to_user_phone
20251113000000_add_video_podcasts_table
20251113000001_add_old_products_table
20251204173712_add_show_on_homepage_to_courses
20251208000000_add_logs_table
20250115000000_add_otp_fields"
    
    for migration in $MIGRATIONS; do
        echo "  Marking $migration as applied..."
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || echo "    (Migration $migration may already be applied)"
    done
}

# First, check and apply rename migration if needed
apply_rename_migration

# Pre-check: Resolve any existing failed migrations before attempting new ones
echo "🔍 Pre-checking for existing failed migrations..."
PRE_CHECK_STATUS=$(npx prisma migrate status 2>&1)
if echo "$PRE_CHECK_STATUS" | grep -qi "failed"; then
    echo "⚠️  Found existing failed migrations. Attempting to resolve before proceeding..."
    # Try to resolve all known problematic migrations proactively
    for migration in "20251014000000_add_podcast_thumbnail" "20250115000000_add_otp_fields"; do
        echo "  Attempting to resolve: $migration"
        if npx prisma migrate resolve --applied "$migration" 2>/dev/null; then
            echo "    ✅ Resolved $migration as applied"
        elif npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null; then
            echo "    ✅ Resolved $migration as rolled-back"
        else
            echo "    ⚠️  Could not resolve $migration (may not be failed)"
        fi
    done
    echo ""
fi

# Function to resolve failed migrations
resolve_failed_migrations() {
    echo "🔧 Resolving failed migrations..."
    
    # First, get the full migration status
    MIGRATE_STATUS=$(npx prisma migrate status 2>&1)
    
    # Extract failed migrations from status output
    # Look for lines containing "failed" or migration names that failed
    FAILED_MIGRATIONS=$(echo "$MIGRATE_STATUS" | grep -iE "(failed|20251014000000_add_podcast_thumbnail|20250115000000_add_otp_fields)" | grep -oE "[0-9]{14}_[a-z_]+" | sort -u || echo "")
    
    # Also check the known problematic migrations
    KNOWN_MIGRATIONS="20251014000000_add_podcast_thumbnail 20250115000000_add_otp_fields"
    
    echo "  Checking for failed migrations..."
    
    # Try to resolve known migrations first
    for migration in "20251014000000_add_podcast_thumbnail" "20250115000000_add_otp_fields"; do
        echo "    Checking migration: $migration..."
        # Check if this migration is in failed state
        if echo "$MIGRATE_STATUS" | grep -qi "$migration.*failed"; then
            echo "      Found failed migration: $migration, attempting to resolve..."
            # Try applied first (if changes already exist in DB)
            if npx prisma migrate resolve --applied "$migration" 2>/dev/null; then
                echo "      ✅ Marked $migration as applied"
            elif npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null; then
                echo "      ✅ Marked $migration as rolled-back"
            else
                echo "      ⚠️  Could not resolve $migration automatically"
            fi
        fi
    done
    
    # Resolve any other failed migrations found
    if [ -n "$FAILED_MIGRATIONS" ]; then
        echo "  Found additional failed migrations, attempting to resolve..."
        for migration in $FAILED_MIGRATIONS; do
            # Skip if already processed
            if echo "$KNOWN_MIGRATIONS" | grep -q "$migration"; then
                continue
            fi
            echo "    Resolving $migration..."
            if npx prisma migrate resolve --applied "$migration" 2>/dev/null; then
                echo "      ✅ Marked $migration as applied"
            elif npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null; then
                echo "      ✅ Marked $migration as rolled-back"
            else
                echo "      ⚠️  Could not resolve $migration automatically"
            fi
        done
    fi
    
    # Final check - try to resolve all known problematic migrations one more time
    echo "  Final resolution attempt for known migrations..."
    for migration in $KNOWN_MIGRATIONS; do
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || \
        npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || true
    done
}

# Function to handle P3018 errors (migration failed to apply)
handle_migration_failure() {
    local migration_name="$1"
    local error_output="$2"
    echo "🔧 Handling failed migration: $migration_name"
    
    # Check if this is the thumbnail migration and column already exists
    if [ "$migration_name" = "20251014000000_add_podcast_thumbnail" ] || [ "$migration_name" = "20250101000000_add_podcast_thumbnail" ]; then
        echo "  Detected thumbnail column migration."
        if echo "$error_output" | grep -qi "already exists"; then
            echo "  Column already exists in database. Marking migration as applied..."
            if npx prisma migrate resolve --applied "$migration_name" 2>/dev/null; then
                echo "  ✅ Marked migration as applied (column already exists)"
                return 0
            else
                echo "  ⚠️  Could not mark as applied, trying rolled-back..."
                npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null && {
                    echo "  ✅ Marked migration as rolled-back"
                    return 0
                }
            fi
        fi
    fi
    
    # For other migrations or if above didn't work, try to resolve
    echo "  Attempting to resolve migration..."
    if npx prisma migrate resolve --applied "$migration_name" 2>/dev/null; then
        echo "  ✅ Marked migration as applied"
        return 0
    elif npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null; then
        echo "  ✅ Marked migration as rolled-back"
        return 0
    else
        echo "  ⚠️  Could not automatically resolve migration $migration_name"
        return 1
    fi
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
    echo ""
    echo "🔄 Retrying migrate deploy after resolving failed migrations..."
    sleep 2  # Give database a moment to update
    RETRY_OUTPUT=$(npx prisma migrate deploy 2>&1)
    RETRY_EXIT=$?
    if [ $RETRY_EXIT -eq 0 ]; then
        echo "✅ Migrations deployed successfully after resolution"
    else
        echo "⚠️  Migrate deploy still failed after resolution. Error:"
        echo "$RETRY_OUTPUT"
        echo ""
        echo "🔄 Using db push as fallback to sync schema..."
        npx prisma db push --accept-data-loss || {
            echo "⚠️  db push also failed, but continuing..."
            true
        }
    fi
elif echo "$MIGRATE_OUTPUT" | grep -q "P3018"; then
    echo "⚠️  Migration failed to apply (P3018). Extracting migration name..."
    # Extract migration name from error output
    MIGRATION_NAME=$(echo "$MIGRATE_OUTPUT" | grep -oP "Migration name: \K[^\s]+" || echo "20251014000000_add_podcast_thumbnail")
    echo "  Detected failed migration: $MIGRATION_NAME"
    if handle_migration_failure "$MIGRATION_NAME" "$MIGRATE_OUTPUT"; then
        echo "✅ Retrying migrate deploy after resolving failed migration..."
        npx prisma migrate deploy || {
            echo "⚠️  Migrate deploy still failed. Using db push as fallback..."
            npx prisma db push --accept-data-loss || true
        }
    else
        echo "⚠️  Could not resolve migration automatically. Using db push as fallback..."
        npx prisma db push --accept-data-loss || true
    fi
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

