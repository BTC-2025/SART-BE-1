const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('--- SYNCING RENTAL VEHICLES IN SQLITE DATABASE ---');

    await prisma.$executeRawUnsafe(`DELETE FROM RentalVehicle;`);

    // Insert Bike
    await prisma.$executeRawUnsafe(`
      INSERT INTO RentalVehicle (
        id, partnerId, ownerName, ownerPhone, name, brand, type, category,
        fuel, transmission, seats, plate, city, location, hourlyRate, dailyRate,
        monthlyRate, pricingText, isAvailable, image, images, verified, rating,
        year, kms, badge, bookingStatus, createdAt, updatedAt
      ) VALUES (
        'VH-ROYAL-ENFIELD-CLASSIC', 'partner_1', 'SART Partner Fleet', '+91 98765 43210',
        'ROYAL ENFIELD CLASSIC 350 XZ+', 'Royal Enfield', 'bike', 'Cruiser (350cc+)',
        'Petrol', 'Manual', '2-Seater', 'MH 12 AB 1234', 'Katpadi',
        'Ranipet - Chittoor Trunk Road, Thiruvalam, Katpadi, Vellore, Tamil Nadu, 632106, India',
        150, 1800, 32000, '₹150/hr | ₹1,800/day | ₹32,000/month', 1,
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
        '["https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600"]',
        1, 4.8, 2024, '500 Kms Included', 'Verified Owner', 'READY_FOR_BOOKING',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
    `);

    // Insert Car
    await prisma.$executeRawUnsafe(`
      INSERT INTO RentalVehicle (
        id, partnerId, ownerName, ownerPhone, name, brand, type, category,
        fuel, transmission, seats, plate, city, location, hourlyRate, dailyRate,
        monthlyRate, pricingText, isAvailable, image, images, verified, rating,
        year, kms, badge, bookingStatus, createdAt, updatedAt
      ) VALUES (
        'VH-HYUNDAI-VERNA', 'partner_1', 'SART Partner Fleet', '+91 98765 43210',
        'HYUNDAI VERNA SX', 'Hyundai', 'car', 'Sedan',
        'Petrol', 'Manual', '5-Seater', 'TN 23 BK 4567', 'Katpadi',
        'Ranipet - Chittoor Trunk Road, Thiruvalam, Katpadi, Vellore, Tamil Nadu, 632106, India',
        220, 2400, 45000, '₹220/hr | ₹2,400/day | ₹45,000/month', 1,
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
        '["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600"]',
        1, 4.9, 2024, '500 Kms Included', 'Verified Owner', 'READY_FOR_BOOKING',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
    `);

    const list = await prisma.$queryRawUnsafe('SELECT id, type, name, plate, city, location, isAvailable, dailyRate FROM RentalVehicle');
    console.log('UPDATED VEHICLES IN DB:');
    console.table(list);
  } catch (err) {
    console.error('Error seeding vehicles:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
