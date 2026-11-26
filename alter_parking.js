const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE ParkingSpot ADD COLUMN bookingDetails TEXT;');
    console.log('Added bookingDetails to ParkingSpot');
  } catch (e) {
    console.log('bookingDetails might already exist:', e.message);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
