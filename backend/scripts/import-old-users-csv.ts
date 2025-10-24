import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface OldUserData {
  id: string;
  user_login: string;
  user_pass: string;
  user_nicename: string;
  user_email: string;
  user_url: string;
  user_activation_key: string;
  user_status: string;
  display_name: string;
  sms: string;
  phone: string;
  uToken: string;
  spam: string;
  deleted: string;
  user_registered: string;
  education: string;
  univercity: string;
  job: string;
  state: string;
  gender: string;
}

function parseUserData(rawData: string): OldUserData | null {
  try {
    // Remove quotes and split by semicolon
    const cleanData = rawData.replace(/^"|"$/g, '').replace(/""/g, '"');
    const fields = cleanData.split(';');
    
    if (fields.length < 20) {
      console.log(`Invalid data format: ${rawData.substring(0, 100)}...`);
      return null;
    }
    
    return {
      id: fields[0] || '',
      user_login: fields[1] || '',
      user_pass: fields[2] || '',
      user_nicename: fields[3] || '',
      user_email: fields[4] || '',
      user_url: fields[5] || '',
      user_activation_key: fields[6] || '',
      user_status: fields[7] || '',
      display_name: fields[8] || '',
      sms: fields[9] || '',
      phone: fields[10] || '',
      uToken: fields[11] || '',
      spam: fields[12] || '',
      deleted: fields[13] || '',
      user_registered: fields[14] || '',
      education: fields[15] || '',
      univercity: fields[16] || '',
      job: fields[17] || '',
      state: fields[18] || '',
      gender: fields[19] || '',
    };
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

function cleanValue(value: string): string | null {
  if (!value || value === '""' || value === '' || value.trim() === '') {
    return null;
  }
  return value.replace(/"/g, '').trim();
}

async function importOldUsersFromCSV() {
  try {
    console.log('Starting import of old users from CSV...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../moc-old-data/users.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Split into lines and skip header
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const dataLines = lines.slice(1); // Skip header row
    
    console.log(`Found ${dataLines.length} records in CSV file`);
    
    // Process each user
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        
        // Extract the data part (before the trailing commas)
        const dataPart = line.split(',')[0];
        
        if (!dataPart || typeof dataPart !== 'string') {
          console.log(`Row ${i + 2}: Invalid data format`);
          skippedCount++;
          continue;
        }
        
        // Parse the semicolon-separated data
        const userData = parseUserData(dataPart);
        if (!userData) {
          skippedCount++;
          continue;
        }
        
        // Extract and clean user data
        const email = cleanValue(userData.user_email);
        const phone = cleanValue(userData.phone);
        const username = cleanValue(userData.user_login) || cleanValue(userData.user_nicename);
        const displayName = cleanValue(userData.display_name);
        
        // Skip if no essential data
        if (!phone && !email) {
          console.log(`Row ${i + 2}: Skipping user - No phone or email provided (ID: ${userData.id})`);
          skippedCount++;
          continue;
        }
        
        // Skip if user is marked as deleted
        if (userData.deleted === '1' || userData.deleted === '"1"') {
          console.log(`Row ${i + 2}: Skipping deleted user: ${username} (ID: ${userData.id})`);
          skippedCount++;
          continue;
        }
        
        // Generate username if not provided
        const finalUsername = username || 
          (phone ? `user_${phone}` : `user_${email?.split('@')[0]}`) ||
          `old_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : []),
              { username: finalUsername }
            ],
          },
        });
        
        if (existingUser) {
          console.log(`Row ${i + 2}: User already exists: ${email || phone}`);
          skippedCount++;
          continue;
        }
        
        // Parse display name to extract first and last name
        let firstName = null;
        let lastName = null;
        if (displayName) {
          const nameParts = displayName.trim().split(' ');
          firstName = nameParts[0] || null;
          lastName = nameParts.slice(1).join(' ') || null;
        }
        
        // Generate a default password (users will need to reset it)
        const defaultPassword = 'OldUser123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Create user with isOld flag set to true
        const newUser = await prisma.user.create({
          data: {
            email,
            phone,
            username: finalUsername,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'USER',
            isActive: true,
            isOld: true, // Mark as old user
          },
        });
        
        console.log(`Row ${i + 2}: Imported user: ${newUser.username} (${newUser.email || newUser.phone})`);
        importedCount++;
        
        // Log progress every 1000 users
        if ((i + 1) % 1000 === 0) {
          console.log(`Progress: ${i + 1}/${dataLines.length} processed`);
        }
        
      } catch (error) {
        console.error(`Row ${i + 2}: Error importing user:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nImport completed:`);
    console.log(`- Imported: ${importedCount} users`);
    console.log(`- Skipped: ${skippedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    console.log(`- Total processed: ${importedCount + skippedCount + errorCount}`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importOldUsersFromCSV()
    .then(() => {
      console.log('Import process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import process failed:', error);
      process.exit(1);
    });
}

export { importOldUsersFromCSV };
