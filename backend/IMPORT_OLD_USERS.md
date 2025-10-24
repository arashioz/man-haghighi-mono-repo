# Import Old Users Migration

This script imports user data from the old CSV file (`moc-old-data/users.csv`) into the new database with an `isOld` flag set to `true`. The CSV file was converted from the original Excel file for better data parsing.

## Prerequisites

1. Make sure the database is running and accessible
2. Run the Prisma migration to add the `isOld` field:
   ```bash
   npx prisma migrate deploy
   ```

## Usage

### Option 1: Using npm script (CSV - Recommended)
```bash
npm run import:old-users-csv
```

### Option 2: Using npm script (Excel - Legacy)
```bash
npm run import:old-users
```

### Option 3: Direct execution (CSV)
```bash
npx ts-node import-old-users-csv.ts
```

## What the script does

1. **Reads the CSV file**: Parses the semicolon-separated data from the CSV file (converted from Excel)
2. **Validates data**: Skips users without email or phone, and deleted users
3. **Checks for duplicates**: Prevents importing users that already exist
4. **Creates users**: Imports users with:
   - `isOld: true` flag
   - Default password: `OldUser123!` (users should reset this)
   - Role: `USER`
   - Active status: `true`

## Data Mapping

The script maps the following fields from the Excel data:
- `user_email` → `email`
- `phone` → `phone`
- `user_login` → `username`
- `display_name` → `firstName` and `lastName` (parsed)

## Output

The script will show:
- Total records found in CSV (21,398 users)
- Number of users imported
- Number of users skipped (with reasons)
- Progress updates every 1000 users
- Final statistics

## Notes

- Users imported with this script will have `isOld: true` flag
- All imported users get a default password that should be changed
- The script handles duplicate prevention based on email, phone, and username
- Deleted users (marked with `deleted: "1"`) are automatically skipped
