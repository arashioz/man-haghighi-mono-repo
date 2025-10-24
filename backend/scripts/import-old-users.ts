import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

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
    const fields = rawData.split(';');
    if (fields.length < 20) {
      console.log(`Invalid data format: ${rawData}`);
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

async function importOldUsers() {
  try {
    console.log('Starting import of old users...');
    
    // Read the Excel file
    const excelPath = path.join(__dirname, '../moc-old-data/5pOOisH_users.xlsx');
    const workbook = XLSX.readFile(excelPath);
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jsonData.length} records in Excel file`);
    
    // Process each user
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const row of jsonData) {
      try {
        // Get the raw data string
        const rawDataKey = Object.keys(row)[0];
        const rawData = row[rawDataKey];
        
        if (!rawData || typeof rawData !== 'string') {
          console.log('Skipping invalid row');
          skippedCount++;
          continue;
        }
        
        // Parse the semicolon-separated data
        const userData = parseUserData(rawData);
        if (!userData) {
          skippedCount++;
          continue;
        }
        
        // Extract user data
        const email = userData.user_email && userData.user_email !== '""' ? userData.user_email.replace(/"/g, '') : null;
        const phone = userData.phone && userData.phone !== '""' ? userData.phone.replace(/"/g, '') : null;
        const username = userData.user_login || userData.user_nicename;
        const displayName = userData.display_name;
        
        // Skip if no essential data
        if (!phone && !email) {
          console.log(`Skipping user: No phone or email provided (ID: ${userData.id})`);
          skippedCount++;
          continue;
        }
        
        // Skip if user is marked as deleted
        if (userData.deleted === '"1"' || userData.deleted === '1') {
          console.log(`Skipping deleted user: ${username} (ID: ${userData.id})`);
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
        if (displayName && displayName !== '""') {
          const nameParts = displayName.replace(/"/g, '').trim().split(' ');
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
