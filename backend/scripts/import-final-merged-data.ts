import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { normalizePhone } from '../src/common/utils/phone.utils';

const prisma = new PrismaClient();

async function importUsersWithCourses() {
  try {
    // Try different possible file paths
    const possibleFiles = [
      path.join(__dirname, '../moc-old-data/final_merged_data_cleaned.json'),
      path.join(__dirname, '../../moc-old-data/final_merged_data_cleaned.json'),
      path.join(__dirname, '../final_merged_data_cleaned.json'),
      path.join(__dirname, '../../final_merged_data_cleaned.json'),
    ];

    let filePath = '';
    let rawData = '';
    
    // Find the first existing file
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        filePath = file;
        rawData = fs.readFileSync(filePath, 'utf-8');
        console.log(`Found data file: ${filePath}`);
        break;
      }
    }

    if (!filePath) {
      throw new Error(`No data file found. Tried: ${possibleFiles.join(', ')}`);
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawData);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON file: ${parseError.message}`);
    }

    let usersData: any[] = [];

    // Handle different data formats
    if (Array.isArray(parsedData)) {
      // If it's an array, use it directly
      usersData = parsedData;
    } else if (parsedData.users && typeof parsedData.users === 'object') {
      // If it has a users object, extract from there
      usersData = Object.values(parsedData.users);
    } else if (parsedData.data && Array.isArray(parsedData.data)) {
      // If it has a data array
      usersData = parsedData.data;
    } else {
      // Try to extract users from the root object
      usersData = Object.values(parsedData);
    }

    console.log(`Raw usersData length: ${usersData.length}`);
    console.log(`First few entries:`, JSON.stringify(usersData.slice(0, 3), null, 2));

    // Filter out metadata and other non-user entries
    usersData = usersData.filter(user => 
      user && 
      typeof user === 'object' && 
      (user.user_info || user.user_login)
    );

    console.log(`Filtered usersData length: ${usersData.length}`);

    if (usersData.length === 0) {
      throw new Error('No valid user data found in the file');
    }

    console.log(`Found ${usersData.length} users to process`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userEntry of usersData) {
      try {
        // Extract user info and products from the entry
        const userAny = userEntry.user_info || userEntry;
        const products = userEntry.products || [];
        
        const rawPhone = userAny.user_login || userAny.phone || userAny.username;
        const phone = rawPhone ? normalizePhone(String(rawPhone).trim()) : null;
        const email = userAny.user_email || userAny.email;
        const password = userAny.user_pass || userAny.password;
        
        if (!phone) {
          console.log(`Skipping user without valid phone (raw: ${rawPhone}): ${JSON.stringify(userAny)}`);
          skippedCount++;
          continue;
        }

        // Check if user exists by phone or email
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: phone },
              ...(email ? [{ email: email }] : [])
            ]
          }
        });

        if (existingUser) {
          console.log(`User exists - Phone: ${phone}, Email: ${email}`);
          skippedCount++;
          continue;
        }

        // Create new user with only valid fields (phone normalized like rest of app)
        const userData: any = {
          phone: phone,
          username: phone, // Use normalized phone as username
          isOld: true, // Mark as imported user
        };

        // Only add email if it exists and is valid
        if (email && email.includes('@')) {
          userData.email = email;
        }

        // Add password if it exists
        if (password) {
          userData.password = password;
        }

        // Add other fields that exist in your Prisma schema
        if (userAny.display_name) {
          userData.firstName = userAny.display_name;
        }
        
        if (userAny.user_nicename) {
          userData.lastName = userAny.user_nicename;
        }

        // Create the user
        const newUser = await prisma.user.create({
          data: userData
        });

        // Process products and create purchases
        for (const product of products) {
          try {
            const productAny = product as any;
            const productId = productAny.product_id;
            const productName = productAny.product_name;
            const productCategory = productAny.product_category;

            // Find the corresponding course in our database
            let course = null;
            
            // Try to find by name first
            if (productName) {
              course = await prisma.course.findFirst({
                where: {
                  title: {
                    contains: productName,
                    mode: 'insensitive'
                  }
                }
              });
            }

            // If not found by name, try to find by product_id if it exists
            if (!course && productId) {
              course = await prisma.course.findFirst({
                where: {
                  OR: [
                    { id: productId }
                  ]
                }
              });
            }

            if (course) {
              // Create course enrollment record
              await prisma.courseEnrollment.create({
                data: {
                  userId: newUser.id,
                  courseId: course.id,
                  enrolledAt: new Date()
                }
              });

              console.log(`Created purchase for user ${phone} - Course: ${course.title}`);
            } else {
              console.log(`Course not found for product: ${productName} (${productId})`);
            }
          } catch (productError) {
            console.error(`Error processing product for user ${phone}: ${productError.message}`);
          }
        }

        importedCount++;
        console.log(`Imported user: ${phone} with ${products.length} products`);
      } catch (userError) {
        console.error(`Error importing user: ${userError.message}`);
        errorCount++;
      }
    }

    console.log(`\nImport completed:`);
    console.log(`- Imported: ${importedCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed: ${usersData.length}`);

  } catch (error) {
    console.error('Error importing users with courses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importUsersWithCourses();
