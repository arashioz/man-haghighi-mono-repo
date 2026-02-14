import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

interface UserData {
  user_login: string;
  user_email: string;
  user_pass: string;
  // Add other fields from your JSON
}

const prisma = new PrismaClient();

async function importUsers() {
  try {
    // Read the JSON file
    const filePath = path.join(__dirname, 'final_merged_data_cleaned.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const usersData: UserData[] = JSON.parse(rawData);

    let importedCount = 0;
    let skippedCount = 0;

    for (const user of usersData) {
      // Check if user exists by phone or email
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: user.user_login },
            { email: user.user_email }
          ]
        }
      });

      if (existingUser) {
        console.log(`User exists - Phone: ${user.user_login}, Email: ${user.user_email}`);
        skippedCount++;
        continue;
      }

      // Create new user with only valid fields
      const userData: any = {
        phone: user.user_login,
        password: user.user_pass
      };

      // Only add email if it exists
      if (user.user_email) {
        userData.email = user.user_email;
      }

      // Add other fields that exist in your Prisma schema
      if ('displayName' in user) {
        userData.name = user.displayName;
      }

      await prisma.user.create({
        data: userData
      });

      importedCount++;
      console.log(`Imported user: ${user.user_login}`);
    }

    console.log(`\nImport completed:`);
    console.log(`- Imported: ${importedCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Total processed: ${usersData.length}`);

  } catch (error) {
    console.error('Error importing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importUsers();