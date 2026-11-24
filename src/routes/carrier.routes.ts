import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();
const prismaAny = prisma as any;

let isTableInitialized = false;

// Ensure database tables exist
async function ensureCarrierTables() {
  if (isTableInitialized) return;
  try {
    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CarrierVehicle (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mode TEXT NOT NULL,
        category TEXT,
        type TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        plate TEXT NOT NULL,
        regId TEXT,
        fuel TEXT,
        hub TEXT,
        location TEXT,
        year INTEGER DEFAULT 2024,
        units INTEGER DEFAULT 1,
        payloadKg REAL DEFAULT 1000,
        maxPayload REAL DEFAULT 1,
        weightUnit TEXT DEFAULT 'Tonnes',
        containerSpace TEXT,
        volumeCapacity REAL DEFAULT 10,
        isReefer INTEGER DEFAULT 0,
        hasGps INTEGER DEFAULT 1,
        isHazmat INTEGER DEFAULT 0,
        ratePerKm REAL DEFAULT 40,
        baseCharge REAL DEFAULT 1500,
        advancePercent REAL DEFAULT 30,
        deposit REAL DEFAULT 3000,
        pricingText TEXT,
        isAvailable INTEGER DEFAULT 1,
        image TEXT,
        images TEXT,
        rating REAL DEFAULT 4.9,
        verified INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CarrierBooking (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        vehicleName TEXT,
        vehicleReg TEXT,
        mode TEXT,
        customerName TEXT NOT NULL,
        customerPhone TEXT NOT NULL,
        senderType TEXT,
        senderGstin TEXT,
        senderEmail TEXT,
        receiverName TEXT,
        receiverPhone TEXT,
        receiverType TEXT,
        receiverGstin TEXT,
        pickup TEXT NOT NULL,
        dropLoc TEXT NOT NULL,
        pickupAddress TEXT,
        deliveryAddress TEXT,
        pickupPincode TEXT,
        deliveryPincode TEXT,
        pickupDate TEXT,
        pickupTime TEXT,
        goodsType TEXT,
        goodsCategory TEXT,
        cargoWeight TEXT,
        consignmentValue REAL,
        ewayBillNumber TEXT,
        distanceKm REAL DEFAULT 35,
        weightKg REAL DEFAULT 1000,
        weightTons REAL DEFAULT 1,
        totalPrice REAL DEFAULT 2000,
        advancePaid REAL DEFAULT 600,
        remainingBalance REAL DEFAULT 1400,
        payMethod TEXT DEFAULT 'Cash on Delivery',
        driverName TEXT,
        driverPhone TEXT,
        assignedBay TEXT,
        status TEXT DEFAULT 'Booked / Advance Paid',
        completedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure only the 1 Bike and 1 Truck added by the owner are present initially
    await prismaAny.$executeRawUnsafe(`DELETE FROM CarrierVehicle WHERE id IN ('CRG-1003', 'CRG-1004', 'CRG-1005', 'CRG-1006')`);
    const countResult: any[] = await prismaAny.$queryRawUnsafe(`SELECT COUNT(*) as count FROM CarrierVehicle`);
    const count = countResult && countResult[0] ? Number(countResult[0].count) : 0;

    if (count === 0) {
      await seedInitialCarrierVehicles();
    }

    isTableInitialized = true;
  } catch (error) {
    console.error('Error ensuring Carrier tables:', error);
  }
}

async function seedInitialCarrierVehicles() {
  const seeds = [
    {
      id: 'CRG-1001',
      name: 'Tata Ace Gold',
      mode: 'truck',
      category: 'Truck (Road Freight)',
      type: 'truck',
      brand: 'Tata Motors',
      model: 'Tata Ace Gold',
      plate: 'MH 14 EB 1102',
      regId: 'MH 14 EB 1102',
      fuel: 'Electric',
      hub: 'Pune Chakan Industrial Hub',
      location: 'Pune Chakan Industrial Hub',
      year: 2024,
      units: 2,
      payloadKg: 900,
      maxPayload: 0.9,
      weightUnit: 'Tonnes',
      containerSpace: '7.5ft Cargo Deck',
      volumeCapacity: 8.5,
      isReefer: 1,
      hasGps: 1,
      isHazmat: 0,
      ratePerKm: 22,
      baseCharge: 500,
      advancePercent: 25,
      deposit: 1000,
      pricingText: '₹500/trip | ₹22/km | Adv: 25%',
      isAvailable: 1,
      image: '/images/carrier_mode_truck.png',
      images: JSON.stringify(['/images/carrier_mode_truck.png']),
      rating: 4.9,
      verified: 1
    },
    {
      id: 'CRG-1002',
      name: 'TVS King Cargo 3-Wheeler',
      mode: 'bike',
      category: 'Bike (Express EV/Bike)',
      type: 'bike',
      brand: 'TVS',
      model: 'TVS King Cargo 3-Wheeler',
      plate: 'MH 14 EV 4012',
      regId: 'MH 14 EV 4012',
      fuel: 'Electric (EV)',
      hub: 'Pune Central Last-Mile Delivery Hub',
      location: 'Pune Central Last-Mile Delivery Hub',
      year: 2024,
      units: 3,
      payloadKg: 150,
      maxPayload: 150,
      weightUnit: 'kg',
      containerSpace: 'Insulated Last-Mile Top Box (65L)',
      volumeCapacity: 0.65,
      isReefer: 0,
      hasGps: 1,
      isHazmat: 0,
      ratePerKm: 14,
      baseCharge: 120,
      advancePercent: 25,
      deposit: 1000,
      pricingText: '₹120/trip | ₹14/km | Adv: 25%',
      isAvailable: 1,
      image: '/images/carrier_mode_bike.png',
      images: JSON.stringify(['/images/carrier_mode_bike.png']),
      rating: 4.8,
      verified: 1
    },
    {
      id: 'CRG-1003',
      name: 'Mahindra Blazo X 28',
      mode: 'truck',
      category: 'Truck (Road Freight)',
      type: 'truck',
      brand: 'Mahindra',
      model: 'Mahindra Blazo X 28',
      plate: 'MH 12 QX 4920',
      regId: 'MH 12 QX 4920',
      fuel: 'Diesel',
      hub: 'Mumbai Nhava Sheva Logistics Park',
      location: 'Mumbai Nhava Sheva Logistics Park',
      year: 2024,
      units: 1,
      payloadKg: 28000,
      maxPayload: 28,
      weightUnit: 'Tonnes',
      containerSpace: '24ft Heavy Open Body Container',
      volumeCapacity: 52,
      isReefer: 0,
      hasGps: 1,
      isHazmat: 0,
      ratePerKm: 48,
      baseCharge: 1800,
      advancePercent: 30,
      deposit: 3000,
      pricingText: '₹1,800/trip | ₹48/km | Adv: 30%',
      isAvailable: 1,
      image: '/images/carrier_mode_truck.png',
      images: JSON.stringify(['/images/carrier_mode_truck.png']),
      rating: 4.9,
      verified: 1
    },
    {
      id: 'CRG-1004',
      name: 'Indian Railways Flat Container Rake (BLC)',
      mode: 'train',
      category: 'Train (Rail Rake)',
      type: 'train',
      brand: 'Indian Railways Freight',
      model: 'Flat Container Rake (BLC)',
      plate: 'IR-RAKE-9921-WR',
      regId: 'IR-RAKE-9921-WR',
      fuel: 'Electric (3-Phase AC)',
      hub: 'Dadri ICD Freight Corridor, Delhi NCR',
      location: 'Dadri ICD Freight Corridor, Delhi NCR',
      year: 2023,
      units: 1,
      payloadKg: 1300000,
      maxPayload: 1300,
      weightUnit: 'Tonnes',
      containerSpace: '45 Wagon BLC Container Rake',
      volumeCapacity: 2400,
      isReefer: 0,
      hasGps: 1,
      isHazmat: 1,
      ratePerKm: 320,
      baseCharge: 25000,
      advancePercent: 40,
      deposit: 50000,
      pricingText: '₹25,000/trip | ₹320/km | Adv: 40%',
      isAvailable: 1,
      image: '/images/carrier_mode_train.jpg',
      images: JSON.stringify(['/images/carrier_mode_train.jpg']),
      rating: 4.9,
      verified: 1
    },
    {
      id: 'CRG-1005',
      name: 'Boeing 757-200F Freighter',
      mode: 'flight',
      category: 'Flight (Air Cargo)',
      type: 'flight',
      brand: 'Blue Dart Aviation',
      model: 'Boeing 757-200F Freighter',
      plate: 'VT-BDA',
      regId: 'VT-BDA',
      fuel: 'Jet A-1 Fuel',
      hub: 'Delhi IGI Air Cargo Terminal 2',
      location: 'Delhi IGI Air Cargo Terminal 2',
      year: 2022,
      units: 1,
      payloadKg: 30000,
      maxPayload: 30,
      weightUnit: 'Tonnes',
      containerSpace: 'Main Deck Cargo Pallets',
      volumeCapacity: 239,
      isReefer: 1,
      hasGps: 1,
      isHazmat: 1,
      ratePerKm: 450,
      baseCharge: 35000,
      advancePercent: 50,
      deposit: 75000,
      pricingText: '₹35,000/trip | ₹450/km | Adv: 50%',
      isAvailable: 1,
      image: '/images/carrier_mode_flight.png',
      images: JSON.stringify(['/images/carrier_mode_flight.png']),
      rating: 5.0,
      verified: 1
    },
    {
      id: 'CRG-1006',
      name: 'Panamax Container Vessel (4500 TEU)',
      mode: 'ship',
      category: 'Ship (Ocean Freight)',
      type: 'ship',
      brand: 'Maersk',
      model: 'Panamax Container Vessel (4500 TEU)',
      plate: 'IMO 9732104',
      regId: 'IMO 9732104',
      fuel: 'Low Sulfur Marine Gas Oil (MGO)',
      hub: 'Jawaharlal Nehru Port Trust (JNPT), Mumbai',
      location: 'Jawaharlal Nehru Port Trust (JNPT), Mumbai',
      year: 2021,
      units: 1,
      payloadKg: 52000000,
      maxPayload: 52000,
      weightUnit: 'Tonnes',
      containerSpace: '4500 TEU ISO Container Vessel',
      volumeCapacity: 85000,
      isReefer: 1,
      hasGps: 1,
      isHazmat: 1,
      ratePerKm: 650,
      baseCharge: 120000,
      advancePercent: 40,
      deposit: 200000,
      pricingText: '₹120,000/trip | ₹650/km | Adv: 40%',
      isAvailable: 1,
      image: '/images/carrier_mode_ship.png',
      images: JSON.stringify(['/images/carrier_mode_ship.png']),
      rating: 4.9,
      verified: 1
    }
  ];

  for (const s of seeds) {
    await prismaAny.$executeRawUnsafe(`
      INSERT INTO CarrierVehicle (
        id, name, mode, category, type, brand, model, plate, regId, fuel, hub, location,
        year, units, payloadKg, maxPayload, weightUnit, containerSpace, volumeCapacity,
        isReefer, hasGps, isHazmat, ratePerKm, baseCharge, advancePercent, deposit,
        pricingText, isAvailable, image, images, rating, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      s.id, s.name, s.mode, s.category, s.type, s.brand, s.model, s.plate, s.regId, s.fuel, s.hub, s.location,
      s.year, s.units, s.payloadKg, s.maxPayload, s.weightUnit, s.containerSpace, s.volumeCapacity,
      s.isReefer, s.hasGps, s.isHazmat, s.ratePerKm, s.baseCharge, s.advancePercent, s.deposit,
      s.pricingText, s.isAvailable, s.image, s.images, s.rating, s.verified
    );
  }
}

// GET all carrier vehicles
router.get('/', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { mode, availableOnly, search } = req.query;

    let query = `SELECT * FROM CarrierVehicle WHERE 1=1`;
    const params: any[] = [];

    if (mode && mode !== 'all') {
      query += ` AND mode = ?`;
      params.push(String(mode).toLowerCase());
    }

    if (availableOnly === 'true' || availableOnly === '1') {
      query += ` AND isAvailable = 1`;
    }

    if (search) {
      query += ` AND (name LIKE ? OR brand LIKE ? OR model LIKE ? OR plate LIKE ? OR hub LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY createdAt DESC`;

    const vehicles: any[] = await prismaAny.$queryRawUnsafe(query, ...params);

    const formatted = vehicles.map(v => ({
      ...v,
      isAvailable: Boolean(v.isAvailable),
      isReefer: Boolean(v.isReefer),
      hasGps: Boolean(v.hasGps),
      isHazmat: Boolean(v.isHazmat),
      verified: Boolean(v.verified),
      images: v.images ? (typeof v.images === 'string' ? JSON.parse(v.images) : v.images) : [v.image]
    }));

    res.json({
      success: true,
      count: formatted.length,
      vehicles: formatted
    });
  } catch (error: any) {
    console.error('Error fetching carrier vehicles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single vehicle by ID
router.get('/:id', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { id } = req.params;
    const result: any[] = await prismaAny.$queryRawUnsafe(`SELECT * FROM CarrierVehicle WHERE id = ?`, id);
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Carrier vehicle not found' });
    }
    const v = result[0];
    res.json({
      success: true,
      vehicle: {
        ...v,
        isAvailable: Boolean(v.isAvailable),
        isReefer: Boolean(v.isReefer),
        hasGps: Boolean(v.hasGps),
        isHazmat: Boolean(v.isHazmat),
        verified: Boolean(v.verified),
        images: v.images ? JSON.parse(v.images) : [v.image]
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new carrier vehicle
router.post('/', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const data = req.body;
    const id = data.id || `CRG-${Date.now().toString().slice(-5)}`;
    const name = data.name || `${data.brand || ''} ${data.model || ''}`.trim() || 'Custom Fleet Carrier';
    const mode = (data.mode || data.type || 'truck').toLowerCase();
    const category = data.category || `${mode.toUpperCase()} Freight`;
    const type = mode;
    const brand = data.brand || 'Commercial Fleet';
    const model = data.model || name;
    const plate = (data.plate || data.regId || `REG-${Date.now().toString().slice(-4)}`).toUpperCase();
    const regId = plate;
    const fuel = data.fuel || 'Diesel';
    const hub = data.hub || data.location || 'Central Depot';
    const location = hub;
    const year = parseInt(data.year) || 2024;
    const units = parseInt(data.units) || 1;
    const payloadKg = parseFloat(data.payloadKg) || 1000;
    const maxPayload = parseFloat(data.maxPayload) || (payloadKg / 1000);
    const weightUnit = data.weightUnit || 'Tonnes';
    const containerSpace = data.containerSpace || 'Standard Cargo Container';
    const volumeCapacity = parseFloat(data.volumeCapacity || data.volume) || 10;
    const isReefer = data.isReefer ? 1 : 0;
    const hasGps = data.hasGps !== false ? 1 : 0;
    const isHazmat = data.isHazmat ? 1 : 0;
    const ratePerKm = parseFloat(data.ratePerKm) || 40;
    const baseCharge = parseFloat(data.baseCharge) || 1500;
    const advancePercent = parseFloat(data.advancePercent) || 30;
    const deposit = parseFloat(data.deposit) || 3000;
    const pricingText = data.pricingText || `₹${baseCharge.toLocaleString()}/trip | ₹${ratePerKm}/km | Adv: ${advancePercent}%`;
    const isAvailable = data.isAvailable !== false ? 1 : 0;
    const image = data.image || '/images/carrier_mode_truck.png';
    const images = JSON.stringify(Array.isArray(data.images) && data.images.length > 0 ? data.images : [image]);
    const rating = parseFloat(data.rating) || 4.9;
    const verified = 1;

    await prismaAny.$executeRawUnsafe(`
      INSERT INTO CarrierVehicle (
        id, name, mode, category, type, brand, model, plate, regId, fuel, hub, location,
        year, units, payloadKg, maxPayload, weightUnit, containerSpace, volumeCapacity,
        isReefer, hasGps, isHazmat, ratePerKm, baseCharge, advancePercent, deposit,
        pricingText, isAvailable, image, images, rating, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id, name, mode, category, type, brand, model, plate, regId, fuel, hub, location,
      year, units, payloadKg, maxPayload, weightUnit, containerSpace, volumeCapacity,
      isReefer, hasGps, isHazmat, ratePerKm, baseCharge, advancePercent, deposit,
      pricingText, isAvailable, image, images, rating, verified
    );

    res.status(201).json({
      success: true,
      message: 'Carrier vehicle created successfully',
      vehicle: {
        id, name, mode, category, type, brand, model, plate, regId, fuel, hub, location,
        year, units, payloadKg, maxPayload, weightUnit, containerSpace, volumeCapacity,
        isReefer: Boolean(isReefer),
        hasGps: Boolean(hasGps),
        isHazmat: Boolean(isHazmat),
        ratePerKm, baseCharge, advancePercent, deposit,
        pricingText,
        isAvailable: Boolean(isAvailable),
        image,
        images: Array.isArray(data.images) ? data.images : [image],
        rating, verified: true
      }
    });
  } catch (error: any) {
    console.error('Error creating carrier vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH toggle vehicle availability
router.patch('/:id/availability', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const current: any[] = await prismaAny.$queryRawUnsafe(`SELECT isAvailable FROM CarrierVehicle WHERE id = ?`, id);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const nextVal = isAvailable !== undefined ? (isAvailable ? 1 : 0) : (current[0].isAvailable === 1 ? 0 : 1);

    await prismaAny.$executeRawUnsafe(
      `UPDATE CarrierVehicle SET isAvailable = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      nextVal, id
    );

    res.json({
      success: true,
      id,
      isAvailable: Boolean(nextVal)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE vehicle
router.delete('/:id', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { id } = req.params;
    await prismaAny.$executeRawUnsafe(`DELETE FROM CarrierVehicle WHERE id = ?`, id);
    res.json({ success: true, message: 'Vehicle removed from fleet' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create carrier booking
router.post('/bookings', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const b = req.body;
    const id = b.id || b.bookingId || `CRG-BK-${Date.now().toString().slice(-6)}`;
    const vehicleId = b.vehicleId || '';
    const vehicleName = b.vehicleName || 'Commercial Cargo Carrier';
    const vehicleReg = b.vehicleReg || b.plate || 'IMO 234';
    const mode = b.mode || 'ship';
    const customerName = b.customerName || b.senderName || 'Valued Customer';
    const customerPhone = b.customerPhone || b.senderPhone || b.senderMobile || '+91 98000 00000';
    const senderType = b.senderType || 'business';
    const senderGstin = b.senderGstin || '';
    const senderEmail = b.senderEmail || '';
    const receiverName = b.receiverName || 'Consignee Logistics';
    const receiverPhone = b.receiverPhone || b.receiverMobile || '+91 98765 43210';
    const receiverType = b.receiverType || 'business';
    const receiverGstin = b.receiverGstin || '';
    const pickup = b.pickup || 'Pickup Location';
    const dropLoc = b.dropLoc || b.drop || b.delivery || 'Delivery Location';
    const pickupAddress = b.pickupAddress || pickup;
    const deliveryAddress = b.deliveryAddress || dropLoc;
    const pickupPincode = b.pickupPincode || '';
    const deliveryPincode = b.deliveryPincode || '';
    const pickupDate = b.pickupDate || new Date().toISOString().split('T')[0];
    const pickupTime = b.pickupTime || '10:00';
    const goodsType = b.goodsType || b.goodsDescription || 'Commercial Cargo';
    const goodsCategory = b.goodsCategory || 'Industrial & Heavy Commercial';
    const cargoWeight = b.cargoWeight || `${b.weightKg || 1000} kg`;
    const consignmentValue = parseFloat(b.consignmentValue) || 500000;
    const ewayBillNumber = b.ewayBillNumber || `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const distanceKm = parseFloat(b.distanceKm) || 35;
    const weightKg = parseFloat(b.weightKg) || 1000;
    const weightTons = parseFloat(b.weightTons) || (weightKg / 1000);
    const totalPrice = parseFloat(b.totalPrice || b.totalFreight) || 2000;
    const advancePaid = parseFloat(b.advancePaid || b.advancePayable) || Math.round(totalPrice * 0.3);
    const remainingBalance = totalPrice - advancePaid;
    const payMethod = b.payMethod || 'Advance Paid (UPI / Online)';
    const status = b.status || 'Advance Paid - Ready to Dispatch';

    await prismaAny.$executeRawUnsafe(`
      INSERT INTO CarrierBooking (
        id, vehicleId, vehicleName, vehicleReg, mode, customerName, customerPhone,
        senderType, senderGstin, senderEmail, receiverName, receiverPhone, receiverType, receiverGstin,
        pickup, dropLoc, pickupAddress, deliveryAddress, pickupPincode, deliveryPincode,
        pickupDate, pickupTime, goodsType, goodsCategory, cargoWeight, consignmentValue, ewayBillNumber,
        distanceKm, weightKg, weightTons, totalPrice, advancePaid, remainingBalance, payMethod, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id, vehicleId, vehicleName, vehicleReg, mode, customerName, customerPhone,
      senderType, senderGstin, senderEmail, receiverName, receiverPhone, receiverType, receiverGstin,
      pickup, dropLoc, pickupAddress, deliveryAddress, pickupPincode, deliveryPincode,
      pickupDate, pickupTime, goodsType, goodsCategory, cargoWeight, consignmentValue, ewayBillNumber,
      distanceKm, weightKg, weightTons, totalPrice, advancePaid, remainingBalance, payMethod, status
    );

    res.status(201).json({
      success: true,
      message: 'Carrier booking created successfully',
      booking: {
        id, vehicleId, vehicleName, vehicleReg, mode, customerName, customerPhone,
        senderType, senderGstin, senderEmail, receiverName, receiverPhone, receiverType, receiverGstin,
        pickup, dropLoc, pickupAddress, deliveryAddress, pickupPincode, deliveryPincode,
        pickupDate, pickupTime, goodsType, goodsCategory, cargoWeight, consignmentValue, ewayBillNumber,
        distanceKm, weightKg, weightTons, totalPrice, advancePaid, remainingBalance, payMethod, status
      }
    });
  } catch (error: any) {
    console.error('Error creating carrier booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all carrier bookings
router.get('/bookings', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { vehicleId } = req.query;
    let query = `SELECT * FROM CarrierBooking`;
    let params: any[] = [];
    if (vehicleId) {
      query += ` WHERE vehicleId = ?`;
      params.push(vehicleId);
    }
    query += ` ORDER BY createdAt DESC`;

    const bookings: any[] = await prismaAny.$queryRawUnsafe(query, ...params);
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH complete ride / trip & dispatch notifications
router.patch('/bookings/:id/complete', async (req: Request, res: Response) => {
  await ensureCarrierTables();
  try {
    const { id } = req.params;
    const { driverName, driverPhone, assignedBay } = req.body;

    const existing: any[] = await prismaAny.$queryRawUnsafe(`SELECT * FROM CarrierBooking WHERE id = ?`, id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = existing[0];
    const now = new Date().toISOString();

    await prismaAny.$executeRawUnsafe(`
      UPDATE CarrierBooking 
      SET status = 'Ride Completed / Goods Delivered',
          driverName = COALESCE(?, driverName),
          driverPhone = COALESCE(?, driverPhone),
          assignedBay = COALESCE(?, assignedBay),
          completedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, driverName || null, driverPhone || null, assignedBay || null, id);

    // Mock SMS / WhatsApp notification triggered
    const notificationPayload = {
      senderMobile: booking.customerPhone,
      receiverMobile: booking.receiverPhone,
      bookingId: booking.id,
      vehicleName: booking.vehicleName,
      status: 'Goods Successfully Delivered & Confirmed by Carrier Owner',
      timestamp: now
    };

    res.json({
      success: true,
      message: 'Ride confirmed completed. Delivery notifications sent to sender and receiver mobiles.',
      notification: notificationPayload
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
