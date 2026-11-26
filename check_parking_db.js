const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const spots = await prisma.$queryRawUnsafe('SELECT * FROM ParkingSpot');
  console.log('PARKING SPOTS IN DB:', JSON.stringify(spots, null, 2));
  try {
    const bookings = await prisma.$queryRawUnsafe('SELECT * FROM ParkingBooking');
    console.log('PARKING BOOKINGS IN DB:', JSON.stringify(bookings, null, 2));
  } catch (e) {
    console.log('No ParkingBooking table or query error:', e.message);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
