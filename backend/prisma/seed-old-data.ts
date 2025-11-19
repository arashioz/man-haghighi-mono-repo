import { importOldUsers } from '../scripts/import-old-users';

interface LegacySeedOptions {
  reset: boolean;
  dryRun: boolean;
}

function parseFlags(): LegacySeedOptions {
  const args = process.argv.slice(2);
  return {
    reset: args.includes('--reset'),
    dryRun: args.includes('--dry-run'),
  };
}

async function main() {
  const options = parseFlags();

  console.log('🌱 Running legacy seed (delegating to scripts/import-old-users.ts)');
  console.log(`   • reset: ${options.reset ? 'enabled' : 'disabled'}`);
  console.log(`   • dry-run: ${options.dryRun ? 'enabled' : 'disabled'}`);

  await importOldUsers(options);
    }

main().catch(error => {
  console.error('❌ Legacy seed failed:', error);
    process.exit(1);
  });