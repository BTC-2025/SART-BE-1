const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allBookings = await prisma.booking.findMany();
  const drivers = await prisma.driverLocation.findMany();
  const activeBookings = allBookings.filter(b => b.status === 'Active' || b.status === 'Running');
  const availableVehicles = drivers.filter(d => d.status === 'available');
  const travelingVehicles = drivers.filter(d => d.status === 'busy' || d.status === 'on_trip' || d.status === 'traveling');

  console.log(JSON.stringify({
    totalBookings: allBookings.length,
    activeBookings: activeBookings.length,
    totalVehicles: drivers.length,
    availableVehicles: availableVehicles.length,
    travelingVehicles: travelingVehicles.length,
    drivers: drivers
  }, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);

