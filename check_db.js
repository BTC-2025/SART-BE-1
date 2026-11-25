const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const vehicles = await prisma.$queryRawUnsafe('SELECT * FROM RentalVehicle');
    console.log('VEHICLE COUNT:', vehicles.length);
    vehicles.forEach(v => {
      console.log(`[${v.type}] ID: ${v.id} | Plate: ${v.plate} | Name: ${v.name} | City: ${v.city} | Location: ${v.location} | isAvailable: ${v.isAvailable}`);
    });
  } catch (e) {
    console.error('Error querying table:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
