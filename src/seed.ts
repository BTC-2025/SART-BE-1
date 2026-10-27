import { prisma } from './prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Seed or Upsert Demo User
  const user = await prisma.user.upsert({
    where: { email: 'demo@sart.com' },
    update: {},
    create: {
      id: 'user-sart-demo',
      email: 'demo@sart.com',
      name: 'Sai',
      phone: '+91 98765 43210',
      wallet: {
        create: {
          balance: 15000.0,
          points: 2450,
          cashback: 350.0
        }
      }
    }
  });
  console.log(`✅ User verified: ${user.name} (${user.email})`);

  // 2. Clear existing DriverLocation test data to re-populate fresh
  await prisma.driverLocation.deleteMany({});

  // 3. Seed Bikes, Autos, and Cars
  const vehicles = [
    // --- BIKES ---
    {
      driverName: 'Ramesh Gowda',
      serviceType: 'bike',
      lat: 12.9766,
      lng: 77.5976,
      status: 'available',
      rating: 4.9,
      vehicleModel: 'Hero Splendor Plus / EV',
      plateNumber: 'KA-01-EQ-4421',
      phone: '+91 99887 11223'
    },
    {
      driverName: 'Karthik Rao',
      serviceType: 'bike',
      lat: 12.9692,
      lng: 77.6012,
      status: 'available',
      rating: 4.8,
      vehicleModel: 'Honda Activa 6G',
      plateNumber: 'KA-05-MK-9812',
      phone: '+91 98877 66554'
    },
    {
      driverName: 'Suresh Kumar',
      serviceType: 'bike',
      lat: 12.9811,
      lng: 77.5912,
      status: 'available',
      rating: 4.7,
      vehicleModel: 'Bajaj Pulsar N160',
      plateNumber: 'KA-03-AB-1209',
      phone: '+91 97766 55443'
    },

    // --- AUTOS ---
    {
      driverName: 'Manjunath Swamy',
      serviceType: 'auto',
      lat: 12.9734,
      lng: 77.6085,
      status: 'available',
      rating: 4.9,
      vehicleModel: 'Bajaj Compact 4S Auto',
      plateNumber: 'KA-04-FA-5632',
      phone: '+91 98451 22334'
    },
    {
      driverName: 'Syed Imran',
      serviceType: 'auto',
      lat: 12.9654,
      lng: 77.5921,
      status: 'available',
      rating: 4.8,
      vehicleModel: 'Piaggio Ape City EV Auto',
      plateNumber: 'KA-02-EL-8831',
      phone: '+91 98442 33445'
    },
    {
      driverName: 'Anand Murthy',
      serviceType: 'auto',
      lat: 12.9798,
      lng: 77.6152,
      status: 'available',
      rating: 4.75,
      vehicleModel: 'TVS King Deluxe Auto',
      plateNumber: 'KA-51-AB-4491',
      phone: '+91 98456 77889'
    },

    // --- CARS ---
    {
      driverName: 'Praveen Shetty',
      serviceType: 'car',
      lat: 12.9751,
      lng: 77.6053,
      status: 'available',
      rating: 4.95,
      vehicleModel: 'Maruti Suzuki Dzire Sedan',
      plateNumber: 'KA-01-MJ-1002',
      phone: '+91 99001 88223'
    },
    {
      driverName: 'Deepak Varma',
      serviceType: 'car',
      lat: 12.9688,
      lng: 77.5899,
      status: 'available',
      rating: 4.85,
      vehicleModel: 'Tata Tigor EV Prime',
      plateNumber: 'KA-05-EV-3310',
      phone: '+91 99002 77334'
    },
    {
      driverName: 'Mohammed Zameer',
      serviceType: 'car',
      lat: 12.9842,
      lng: 77.6021,
      status: 'available',
      rating: 4.9,
      vehicleModel: 'Hyundai Aura SX',
      plateNumber: 'KA-03-NV-7744',
      phone: '+91 99003 66445'
    }
  ];

  for (const v of vehicles) {
    await prisma.driverLocation.create({ data: v });
  }

  // 4. Seed initial bookings across all categories
  await prisma.booking.deleteMany({});
  const initialBookings = [
    {
      userId: user.id,
      title: 'SIMHAPURI SF EX (12709)',
      type: 'train',
      subType: 'express',
      status: 'Active',
      cost: 650.0,
      pickupLoc: 'Nellore (NLR)',
      dropLoc: 'Secunderabad Jn (SC)',
      details: 'Coach S3 - Seat 55 (RAC). IRCTC Gateway confirmed.',
      extraData: JSON.stringify({
        pnr: '464685022212',
        bookingId: 'BK-TRN-101',
        passengerName: 'Sai',
        sourceTime: '19:00',
        destinationTime: '05:45',
        duration: '10h 45m',
        statusBadge: 'CNF',
        statusText: 'Running On Time',
        stops: [
          { name: 'Nellore (NLR)', time: '19:00', status: 'past' },
          { name: 'Ongole (OGL)', time: '20:30', status: 'current' },
          { name: 'Vijayawada (BZA)', time: '22:45', status: 'future' },
          { name: 'Secunderabad (SC)', time: '05:45', status: 'future' }
        ]
      })
    },
    {
      userId: user.id,
      title: 'Air India Express (IX-2344)',
      type: 'flight',
      subType: 'aeroplane',
      status: 'Active',
      cost: 4850.0,
      pickupLoc: 'Bengaluru Airport (BLR)',
      dropLoc: 'Hyderabad Airport (HYD)',
      details: 'Gate 14B • Web Check-in Completed • Seat 12A',
      extraData: JSON.stringify({
        pnr: 'AIE88Y',
        bookingId: 'BK-FLT-202',
        passengerName: 'Sneha Reddy',
        sourceTime: '10:00',
        destinationTime: '11:15',
        duration: '1h 15m',
        statusBadge: 'CNF',
        statusText: 'Flight On Schedule'
      })
    },
    {
      userId: user.id,
      title: 'Orange Travels AC Sleeper',
      type: 'bus',
      subType: 'sleeper',
      status: 'Active',
      cost: 1100.0,
      pickupLoc: 'Hyderabad (KPHB)',
      dropLoc: 'Bengaluru (Madiwala)',
      details: 'Seat 7A, 7B • Live GPS Tracking active',
      extraData: JSON.stringify({
        pnr: 'BUS6Q8X91',
        bookingId: 'BK-BUS-303',
        passengerName: 'Amit Patel',
        sourceTime: '22:00',
        destinationTime: '06:30',
        duration: '8h 30m',
        statusBadge: 'CNF',
        statusText: 'Bus En Route'
      })
    },
    {
      userId: user.id,
      title: 'SART Bike City Ride',
      type: 'ride',
      subType: 'bike',
      status: 'Completed',
      cost: 95.0,
      pickupLoc: 'Indiranagar 100ft Rd',
      dropLoc: 'MG Road Metro',
      details: 'Captain: Ramesh Gowda • OTP: 4421',
      extraData: JSON.stringify({
        bookingId: 'BK-RD-404',
        passengerName: 'Sai',
        statusBadge: 'CMP',
        statusText: 'Completed with 5-star rating'
      })
    }
  ];

  for (const b of initialBookings) {
    await prisma.booking.create({ data: b });
  }

  console.log(`✅ Seeded ${vehicles.length} vehicles and ${initialBookings.length} bookings successfully!`);
  console.log('🎉 Database seeding complete.');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
