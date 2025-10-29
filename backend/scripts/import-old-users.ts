فimport { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldUserData {
  ID?: string;
  user_login: string;
  user_pass?: string;
  user_nicename: string;
  user_email: string;
  user_url?: string;
  user_activation_key?: string;
  user_status?: string;
  display_name?: string;
  sms?: string;
  phone?: string;
  uToken?: string;
  spam?: string;
  deleted?: string;
  user_registered?: string;
  education?: string;
  univercity?: string;
  job?: string;
  state?: string;
  gender?: string;
}

async function importOldUsers() {
  try {
    console.log('Starting import of old users...');
    
    // Try to read JSON file first, fallback to Excel if needed
    const jsonPath = path.join(__dirname, '../moc-old-data/users.json');
    const excelPath = path.join(__dirname, '../moc-old-data/5pOOisH_users.xlsx');
    
    let jsonData: OldUserData[] = [];
    
    if (fs.existsSync(jsonPath)) {
      console.log('Reading from users.json...');
      const fileContent = fs.readFileSync(jsonPath, 'utf-8');
      const parsedData = JSON.parse(fileContent);
      jsonData = parsedData.users || parsedData;
      console.log(`Found ${jsonData.length} records in JSON file`);
    } else if (fs.existsSync(excelPath)) {
      console.log('JSON file not found, trying Excel file...');
      // Fallback to Excel reading would go here if needed
      throw new Error('Excel file found but Excel reading not implemented in this version');
    } else {
      throw new Error(`Neither users.json nor 5pOOisH_users.xlsx found in moc-old-data directory`);
    }
    
    // Process each user
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const userData of jsonData) {
      try {
        // Extract user data
        const email = userData.user_email && userData.user_email.trim() !== '' ? userData.user_email.trim() : null;
        const phone = userData.phone && userData.phone.trim() !== '' ? userData.phone.trim() : null;
        const username = userData.user_login || userData.user_nicename || null;
        const displayName = userData.display_name || null;
        
        // Skip if no essential data
        if (!phone && !email) {
          console.log(`Skipping user: No phone or email provided (ID: ${userData.ID || 'N/A'})`);
          skippedCount++;
          continue;
        }
        
        // Skip if user is marked as deleted (handle string values with quotes)
        const deletedStatus = String(userData.deleted || '').replace(/"/g, '');
        const userStatus = String(userData.user_status || '').replace(/"/g, '');
        if (deletedStatus === '1' || userStatus === '1') {
          console.log(`Skipping deleted/inactive user: ${username} (ID: ${userData.ID || 'N/A'})`);
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
          console.log(`User already exists: ${email || phone}`);
          skippedCount++;
          continue;
        }
        
        // Parse display name to extract first and last name
        let firstName = null;
        let lastName = null;
        if (displayName && displayName.trim() !== '') {
          const nameParts = displayName.trim().split(/\s+/);
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
        
        console.log(`Imported user: ${newUser.username} (${newUser.email || newUser.phone})`);
        importedCount++;
        
      } catch (error) {
        console.error(`Error importing user:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\nImport completed:`);
    console.log(`- Imported: ${importedCount} users`);
    console.log(`- Skipped: ${skippedCount} users`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importOldUsers()
    .then(() => {
      console.log('Import process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import process failed:', error);
      process.exit(1);
    });
}

export { importOldUsers };
