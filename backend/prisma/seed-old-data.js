require('ts-node/register');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌱 Running legacy seed (delegating to scripts/import-old-users.ts)');

try {
  // Run the TypeScript file directly using ts-node
  const scriptPath = path.join(__dirname, '../scripts/import-old-users.ts');
  execSync(`npx ts-node "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Legacy seed failed');
  process.exit(1);
}
