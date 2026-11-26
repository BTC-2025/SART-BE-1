import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();
const prismaAny = prisma as any;

let isTableInitialized = false;

// Ensure database tables exist for Parking Lots / Yards and Parking Bookings
async function ensureParkingTables() {
  if (isTableInitialized) return;
  try {
    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ParkingSpot (
        id TEXT PRIMARY KEY,
        spotName TEXT NOT NULL,
        partnerId TEXT DEFAULT 'partner_1',
        ownerName TEXT DEFAULT 'SART Parking Partner',
        primaryMobile TEXT,
        altMobile TEXT,
        spaceType TEXT DEFAULT 'Open Yard',
        doorNo TEXT,
        streetName TEXT,
        locality TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        pincodePlace TEXT,
        landmark TEXT,
        lat REAL,
        lng REAL,
        minHourlyRate REAL DEFAULT 20,
        dailyRate REAL DEFAULT 150,
        monthlyRate REAL DEFAULT 2500,
        pricingText TEXT,
        isAvailable INTEGER DEFAULT 1,
        totalSlots INTEGER DEFAULT 50,
        availableSlots INTEGER DEFAULT 35,
        rating REAL DEFAULT 4.8,
        reviewsCount INTEGER DEFAULT 120,
        coverPhoto TEXT,
        photos TEXT,
        vehicleTypes TEXT,
        securityFeatures TEXT,
        operatingHours TEXT DEFAULT '24/7 Open',
        gateInstructions TEXT,
        bookingMode TEXT DEFAULT 'Instant Booking',
        cancellationPolicy TEXT DEFAULT 'Free up to 1 hr before',
        bookingDetails TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await prismaAny.$executeRawUnsafe(`ALTER TABLE ParkingSpot ADD COLUMN bookingDetails TEXT;`);
    } catch (e) { }

    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ParkingBooking (
        id TEXT PRIMARY KEY,
        bookingId TEXT UNIQUE,
        spotId TEXT NOT NULL,
        spotName TEXT NOT NULL,
        spotAddress TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        customerName TEXT,
        customerPhone TEXT,
        vehicleType TEXT NOT NULL,
        vehicleNumber TEXT,
        checkInDate TEXT NOT NULL,
        checkInTime TEXT NOT NULL,
        durationHours REAL DEFAULT 1,
        totalAmount REAL DEFAULT 0,
        status TEXT DEFAULT 'CONFIRMED',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    isTableInitialized = true;
    console.log('✅ Parking tables initialized successfully');
  } catch (err: any) {
    console.error('Error ensuring parking tables:', err);
  }
}

// GET /api/parking/spots - List parking spots with filters (city, state, vehicleType, search, lat/lng)
router.get('/spots', async (req: Request, res: Response) => {
  await ensureParkingTables();
  try {
    const { city, state, vehicleType, search, lat, lng } = req.query;

    let query = `SELECT * FROM ParkingSpot WHERE 1=1`;
    const params: any[] = [];

    if (city && city !== 'All') {
      query += ` AND LOWER(city) LIKE ?`;
      params.push(`%${String(city).toLowerCase().trim()}%`);
    }

    if (state && state !== 'All') {
      query += ` AND LOWER(state) LIKE ?`;
      params.push(`%${String(state).toLowerCase().trim()}%`);
    }

    if (search) {
      query += ` AND (LOWER(spotName) LIKE ? OR LOWER(locality) LIKE ? OR LOWER(city) LIKE ? OR LOWER(pincode) LIKE ? OR LOWER(state) LIKE ?)`;
      const term = `%${String(search).toLowerCase().trim()}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY createdAt DESC`;

    const spots: any[] = await prismaAny.$queryRawUnsafe(query, ...params);

    // Format spot objects with parsed JSON
    const formatted = spots.map(s => {
      let vehicleTypesParsed = {};
      let photosParsed: any[] = [];
      let featuresParsed: any[] = [];
      let bookingDetailsParsed: any = null;
      try {
        if (s.vehicleTypes) vehicleTypesParsed = JSON.parse(s.vehicleTypes);
      } catch (e) { }
      try {
        if (s.photos) photosParsed = JSON.parse(s.photos);
      } catch (e) { }
      try {
        if (s.securityFeatures) featuresParsed = JSON.parse(s.securityFeatures);
      } catch (e) { }
      try {
        if (s.bookingDetails) bookingDetailsParsed = JSON.parse(s.bookingDetails);
      } catch (e) { }

      // Check vehicle type availability filter
      const vehicleKeyMap: Record<string, string> = {
        'bike': 'twoWheeler',
        '2-wheeler': 'twoWheeler',
        'car': 'fourWheeler',
        '4-wheeler': 'fourWheeler',
        'truck': 'heavyVehicle',
        'trucks': 'heavyVehicle',
        'bus': 'heavyVehicle'
      };

      const filterKey = vehicleType ? vehicleKeyMap[String(vehicleType).toLowerCase()] : null;
      let isVehicleSupported = true;
      if (filterKey && vehicleTypesParsed && (vehicleTypesParsed as any)[filterKey]) {
        isVehicleSupported = (vehicleTypesParsed as any)[filterKey].enabled !== false;
      }

      return {
        ...s,
        vehicleTypes: vehicleTypesParsed,
        photos: photosParsed,
        securityFeatures: featuresParsed,
        bookingDetails: bookingDetailsParsed,
        activeBooking: bookingDetailsParsed,
        bookingStatus: bookingDetailsParsed ? 'ALREADY_BOOKED' : 'AVAILABLE',
        isVehicleSupported
      };
    });

    const filtered = vehicleType ? formatted.filter(s => s.isVehicleSupported) : formatted;
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/parking/spots - Create / Add a new parking spot or yard
router.post('/spots', async (req: Request, res: Response) => {
  await ensureParkingTables();
  try {
    const data = req.body;
    const id = data.id || `PRK-${Date.now()}`;
    const spotName = data.spotName || 'Commercial Parking Yard';
    const partnerId = data.partnerId || 'partner_1';
    const ownerName = data.ownerName || 'SART Parking Partner';
    const primaryMobile = data.primaryMobile || '';
    const altMobile = data.altMobile || '';
    const spaceType = data.spaceType || 'Open Yard';
    const doorNo = data.doorNo || '';
    const streetName = data.streetName || '';
    const locality = data.locality || '';
    const city = data.city || 'Gurugram';
    const state = data.state || 'Haryana';
    const pincode = data.pincode || '';
    const pincodePlace = data.pincodePlace || locality || city;
    const landmark = data.landmark || '';
    const lat = Number(data.lat) || (data.coordinates?.lat ? Number(data.coordinates.lat) : 28.4595);
    const lng = Number(data.lng) || (data.coordinates?.lng ? Number(data.coordinates.lng) : 77.0266);

    // Calculate minimum rate
    let minHourlyRate = 20;
    let dailyRate = 150;
    let monthlyRate = 2500;
    if (data.vehicleTypes) {
      const enabled = Object.values(data.vehicleTypes).filter((v: any) => v.enabled);
      if (enabled.length > 0) {
        minHourlyRate = Math.min(...enabled.map((v: any) => Number(v.hourlyRate) || 20));
        dailyRate = Math.min(...enabled.map((v: any) => Number(v.dailyRate) || 150));
        monthlyRate = Math.min(...enabled.map((v: any) => Number(v.monthlyRate) || 2500));
      }
    }

    const pricingText = `₹${minHourlyRate}/hr • ₹${dailyRate}/day • ₹${monthlyRate.toLocaleString()}/month`;
    const coverPhoto = data.photos?.find((p: any) => p.isCover)?.url ||
      data.photos?.[0]?.url ||
      data.coverPhoto ||
      '';

    const photosJson = JSON.stringify(data.photos || []);
    const vehicleTypesJson = JSON.stringify(data.vehicleTypes || {});
    const securityFeaturesJson = JSON.stringify(data.securityFeatures || data.features || []);
    const operatingHours = data.operatingHours || '24/7 Open';
    const gateInstructions = data.gateInstructions || 'Direct entry from main road. Scan QR code or show booking OTP to guard at gate.';
    const bookingMode = data.bookingMode || 'Instant Booking';
    const cancellationPolicy = data.cancellationPolicy || 'Free up to 1 hr before';

    await prismaAny.$executeRawUnsafe(`
      INSERT OR REPLACE INTO ParkingSpot (
        id, spotName, partnerId, ownerName, primaryMobile, altMobile, spaceType,
        doorNo, streetName, locality, city, state, pincode, pincodePlace, landmark,
        lat, lng, minHourlyRate, dailyRate, monthlyRate, pricingText, isAvailable,
        totalSlots, availableSlots, rating, reviewsCount, coverPhoto, photos,
        vehicleTypes, securityFeatures, operatingHours, gateInstructions,
        bookingMode, cancellationPolicy, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      id, spotName, partnerId, ownerName, primaryMobile, altMobile, spaceType,
      doorNo, streetName, locality, city, state, pincode, pincodePlace, landmark,
      lat, lng, minHourlyRate, dailyRate, monthlyRate, pricingText, 1,
      Number(data.totalSlots) || 45, Number(data.availableSlots) || 35, 4.8, 12, coverPhoto,
      photosJson, vehicleTypesJson, securityFeaturesJson, operatingHours, gateInstructions,
      bookingMode, cancellationPolicy
    );

    res.json({ success: true, message: 'Parking spot created successfully', id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/parking/spots/:id - Update an existing parking spot
router.put('/spots/:id', async (req: Request, res: Response) => {
  await ensureParkingTables();
  try {
    const { id } = req.params;
    const data = req.body;
    const spotName = data.spotName || 'Commercial Parking Yard';
    const partnerId = data.partnerId || 'partner_1';
    const ownerName = data.ownerName || 'SART Parking Partner';
    const primaryMobile = data.primaryMobile || '';
    const altMobile = data.altMobile || '';
    const spaceType = data.spaceType || 'Open Yard';
    const doorNo = data.doorNo || '';
    const streetName = data.streetName || '';
    const locality = data.locality || '';
    const city = data.city || 'Gurugram';
    const state = data.state || 'Haryana';
    const pincode = data.pincode || '';
    const pincodePlace = data.pincodePlace || locality || city;
    const landmark = data.landmark || '';
    const lat = Number(data.lat) || (data.coordinates?.lat ? Number(data.coordinates.lat) : 28.4595);
    const lng = Number(data.lng) || (data.coordinates?.lng ? Number(data.coordinates.lng) : 77.0266);

    let minHourlyRate = 20;
    let dailyRate = 150;
    let monthlyRate = 2500;
    if (data.vehicleTypes) {
      const enabled = Object.values(data.vehicleTypes).filter((v: any) => v.enabled);
      if (enabled.length > 0) {
        minHourlyRate = Math.min(...enabled.map((v: any) => Number(v.hourlyRate) || 20));
        dailyRate = Math.min(...enabled.map((v: any) => Number(v.dailyRate) || 150));
        monthlyRate = Math.min(...enabled.map((v: any) => Number(v.monthlyRate) || 2500));
      }
    }

    const pricingText = `₹${minHourlyRate}/hr • ₹${dailyRate}/day • ₹${monthlyRate.toLocaleString()}/month`;
    const coverPhoto = data.photos?.find((p: any) => p.isCover && p.url)?.url ||
      data.photos?.[0]?.url ||
      data.coverPhoto ||
      '';

    const photosJson = JSON.stringify(data.photos || []);
    const vehicleTypesJson = JSON.stringify(data.vehicleTypes || {});
    const securityFeaturesJson = JSON.stringify(data.securityFeatures || data.features || []);
    const operatingHours = data.operatingHours || '24/7 Open';
    const gateInstructions = data.gateInstructions || 'Direct entry from main road. Scan QR code or show booking OTP to guard at gate.';
    const bookingMode = data.bookingMode || 'Instant Booking';
    const cancellationPolicy = data.cancellationPolicy || 'Free up to 1 hr before';

    await prismaAny.$executeRawUnsafe(`
      INSERT OR REPLACE INTO ParkingSpot (
        id, spotName, partnerId, ownerName, primaryMobile, altMobile, spaceType,
        doorNo, streetName, locality, city, state, pincode, pincodePlace, landmark,
        lat, lng, minHourlyRate, dailyRate, monthlyRate, pricingText, isAvailable,
        totalSlots, availableSlots, rating, reviewsCount, coverPhoto, photos,
        vehicleTypes, securityFeatures, operatingHours, gateInstructions,
        bookingMode, cancellationPolicy, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      id, spotName, partnerId, ownerName, primaryMobile, altMobile, spaceType,
      doorNo, streetName, locality, city, state, pincode, pincodePlace, landmark,
      lat, lng, minHourlyRate, dailyRate, monthlyRate, pricingText, 1,
      Number(data.totalSlots) || 45, Number(data.availableSlots) || 35, 4.8, 12, coverPhoto,
      photosJson, vehicleTypesJson, securityFeaturesJson, operatingHours, gateInstructions,
      bookingMode, cancellationPolicy
    );

    res.json({ success: true, message: 'Parking spot updated successfully', id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/parking/spots/:id/booking - Book or update booking for a parking spot
router.patch('/spots/:id/booking', async (req: Request, res: Response) => {
  await ensureParkingTables();
  try {
    const { id } = req.params;
    const body = req.body; // { isAvailable, bookingDetails, status }

    const spotRes: any[] = await prismaAny.$queryRawUnsafe(`SELECT * FROM ParkingSpot WHERE id = ?`, id);
    if (!spotRes || spotRes.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    const spot = spotRes[0];
    const isAvail = body.isAvailable !== undefined ? (body.isAvailable ? 1 : 0) : (body.bookingDetails ? 0 : 1);
    const bookingDetailsJson = body.bookingDetails ? JSON.stringify(body.bookingDetails) : (isAvail === 1 ? null : spot.bookingDetails);

    await prismaAny.$executeRawUnsafe(
      `UPDATE ParkingSpot SET isAvailable = ?, bookingDetails = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      isAvail,
      bookingDetailsJson,
      id
    );

    res.json({
      success: true,
      message: isAvail === 0 ? 'Parking spot booked successfully' : 'Parking spot released',
      spot: {
        ...spot,
        isAvailable: isAvail === 1,
        bookingDetails: bookingDetailsJson ? JSON.parse(bookingDetailsJson) : null,
        activeBooking: bookingDetailsJson ? JSON.parse(bookingDetailsJson) : null,
        bookingStatus: isAvail === 0 ? 'ALREADY_BOOKED' : 'AVAILABLE'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/parking/spots/:id
router.delete('/spots/:id', async (req: Request, res: Response) => {
  await ensureParkingTables();
  try {
    const { id } = req.params;
    await prismaAny.$executeRawUnsafe(`DELETE FROM ParkingSpot WHERE id = ?`, id);
    res.json({ success: true, message: 'Spot removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
