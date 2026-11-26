const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const drivers = await prisma.$queryRawUnsafe('SELECT id, name, isAvailable, status, bookingDetails FROM FleetDriver');
  console.log('DRIVERS IN DB:', JSON.stringify(drivers, null, 2));
  const carriers = await prisma.$queryRawUnsafe('SELECT id, name, isAvailable FROM CarrierVehicle');
  console.log('CARRIERS IN DB:', JSON.stringify(carriers, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
