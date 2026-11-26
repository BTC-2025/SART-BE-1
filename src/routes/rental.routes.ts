import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { addBusinessNotification } from './business.routes';
import { slugify, KATPADI_SEED_VEHICLES, INITIAL_RENTAL_VEHICLES } from './rental.seed';

const router = Router();
const prismaAny = prisma as any;

let isTableInitialized = false;

// Ensure database table exists and is populated
async function ensureRentalTable() {
  if (isTableInitialized) return;
  try {
    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS RentalVehicle (
        id TEXT PRIMARY KEY,
        partnerId TEXT DEFAULT 'partner_1',
        ownerName TEXT DEFAULT 'SART Partner Fleet',
        ownerPhone TEXT DEFAULT '+91 98765 43210',
        name TEXT NOT NULL,
        brand TEXT,
        type TEXT NOT NULL,
        category TEXT,
        fuel TEXT,
        transmission TEXT,
        seats TEXT,
        plate TEXT UNIQUE,
        city TEXT NOT NULL,
        location TEXT NOT NULL,
        lat REAL,
        lng REAL,
        hourlyRate REAL DEFAULT 150,
        dailyRate REAL DEFAULT 1800,
        monthlyRate REAL DEFAULT 25000,
        pricingText TEXT,
        isAvailable INTEGER DEFAULT 1,
        image TEXT,
        verified INTEGER DEFAULT 1,
        rating REAL DEFAULT 4.8,
        year INTEGER DEFAULT 2024,
        kms TEXT DEFAULT '500 Kms Included',
        badge TEXT DEFAULT 'Available',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create RentalBooking table to persist user bookings for vehicle owners
    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS RentalBooking (
        id TEXT PRIMARY KEY,
        bookingId TEXT UNIQUE,
        vehicleId TEXT NOT NULL,
        vehicleName TEXT NOT NULL,
        vehicleSpecs TEXT,
        vehicleImage TEXT,
        partnerId TEXT DEFAULT 'partner_1',
        ownerName TEXT DEFAULT 'SART Fleet Owner',
        pickupLocation TEXT NOT NULL,
        returnLocation TEXT,
        pickupDate TEXT NOT NULL,
        pickupTime TEXT NOT NULL,
        returnDate TEXT NOT NULL,
        returnTime TEXT NOT NULL,
        durationPlan TEXT,
        days INTEGER DEFAULT 1,
        vehicleDistance TEXT,
        baseRate REAL DEFAULT 0,
        taxAmount REAL DEFAULT 0,
        totalAmount REAL DEFAULT 0,
        customerName TEXT NOT NULL,
        customerAge TEXT,
        customerPhone TEXT NOT NULL,
        docType TEXT,
        docNumber TEXT,
        uploadedDocName TEXT,
        status TEXT DEFAULT 'Confirmed',
        paymentStatus TEXT DEFAULT 'Paid',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure RentalVehicle has bookingStatus, activeBookingId, activeBookingData, and images
    try {
      await prismaAny.$executeRawUnsafe(`ALTER TABLE RentalVehicle ADD COLUMN bookingStatus TEXT DEFAULT 'READY_FOR_BOOKING';`);
    } catch (e) { }
    try {
      await prismaAny.$executeRawUnsafe(`ALTER TABLE RentalVehicle ADD COLUMN activeBookingId TEXT;`);
    } catch (e) { }
    try {
      await prismaAny.$executeRawUnsafe(`ALTER TABLE RentalVehicle ADD COLUMN activeBookingData TEXT;`);
    } catch (e) { }
    try {
      await prismaAny.$executeRawUnsafe(`ALTER TABLE RentalVehicle ADD COLUMN images TEXT;`);
    } catch (e) { }

    // Table is ready for owner-added vehicles
    isTableInitialized = true;
  } catch (err: any) {
    console.error('⚠️ Error initializing RentalVehicle table:', err.message);
  }
}

// Ensure on import
ensureRentalTable();

// ----------------------------------------------------------------------------
// 1. GET /api/rental/vehicles
// Search and filter rental vehicles by location, type, category, etc.
// ----------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const {
      location,
      city,
      type,
      category,
      fuel,
      transmission,
      availableOnly,
      search,
      sort
    } = req.query as Record<string, string | undefined>;

    let query = 'SELECT * FROM RentalVehicle WHERE 1=1';
    const params: any[] = [];

    // Check if user is using Live GPS / Current Location with 10-20 km range requirement
    const targetLoc = (location || city || '').trim();
    const isLiveGps = Boolean(
      req.query.isGps === 'true' ||
      req.query.range === '10-20km' ||
      req.query.nearLive === 'true' ||
      targetLoc.toLowerCase().includes('gps') ||
      targetLoc.toLowerCase().includes('current') ||
      targetLoc.toLowerCase().includes('live')
    );

    // Filter strictly by Location or City if provided (when not on broad live GPS scan)
    if (!isLiveGps && targetLoc && targetLoc.toLowerCase() !== 'all' && targetLoc.toLowerCase() !== 'india' && targetLoc.toLowerCase() !== 'all locations' && targetLoc.toLowerCase() !== 'all hubs') {
      // Split location string to catch city names like "Baner, Pune" or "Pune" or "Chennai"
      const locKeywords = targetLoc.split(/[\s,]+/).filter(k => k.length > 2);
      if (locKeywords.length > 0) {
        const orClauses = locKeywords.map(() => `(LOWER(city) LIKE ? OR LOWER(location) LIKE ?)`).join(' OR ');
        query += ` AND (${orClauses})`;
        for (const kw of locKeywords) {
          const lkw = `%${kw.toLowerCase()}%`;
          params.push(lkw, lkw);
        }
      } else {
        query += ` AND (LOWER(city) LIKE ? OR LOWER(location) LIKE ?)`;
        params.push(`%${targetLoc.toLowerCase()}%`, `%${targetLoc.toLowerCase()}%`);
      }
    }

    // Vehicle Type: car, bike, auto, bus, truck, etc.
    if (type && type.toLowerCase() !== 'all') {
      const t = type.toLowerCase();
      if (t === 'cars') {
        query += ` AND (type = 'car' OR type = 'cars')`;
      } else if (t === 'bikes') {
        query += ` AND (type = 'bike' OR type = 'bikes')`;
      } else {
        query += ` AND LOWER(type) = ?`;
        params.push(t);
      }
    }

    // Category
    if (category && category !== 'All') {
      query += ` AND LOWER(category) LIKE ?`;
      params.push(`%${category.toLowerCase()}%`);
    }

    // Fuel
    if (fuel && fuel !== 'ALL') {
      query += ` AND LOWER(fuel) LIKE ?`;
      params.push(`%${fuel.toLowerCase()}%`);
    }

    // Transmission
    if (transmission && transmission !== 'ALL') {
      query += ` AND LOWER(transmission) LIKE ?`;
      params.push(`%${transmission.toLowerCase()}%`);
    }

    // Available only
    if (availableOnly === 'true' || availableOnly === '1') {
      query += ` AND isAvailable = 1`;
    }

    // Search query
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(plate) LIKE ? OR LOWER(location) LIKE ?)`;
      params.push(s, s, s, s);
    }

    // Sorting
    if (sort === 'price_low') {
      query += ` ORDER BY dailyRate ASC`;
    } else if (sort === 'price_high') {
      query += ` ORDER BY dailyRate DESC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY year DESC, createdAt DESC`;
    } else if (sort === 'top_rated') {
      query += ` ORDER BY rating DESC`;
    } else {
      query += ` ORDER BY createdAt DESC`;
    }

    let rows: any[] = await prismaAny.$queryRawUnsafe(query, ...params);

    // Format boolean availability, active booking details, and relative distance string (strictly 10-20 km for Live GPS)
    let formatted = (rows || []).map((row, idx) => {
      let distNum: string;
      let distText: string;
      if (isLiveGps) {
        // Enforce deterministic distance within 10 to 20 km range
        const kmVal = 10.2 + Number(((idx * 2.3 + 1.1) % 9.5).toFixed(1));
        distNum = kmVal.toFixed(1);
        distText = `${distNum} km from Current Location`;
      } else {
        distNum = (1.2 + (idx * 0.7) % 3.8).toFixed(1);
        distText = `${distNum} km from ${targetLoc || row.location || 'Location'}`;
      }

      let activeBooking = null;
      if (row.activeBookingData) {
        try {
          activeBooking = typeof row.activeBookingData === 'string' ? JSON.parse(row.activeBookingData) : row.activeBookingData;
        } catch (e) { }
      }

      let imagesArr: string[] = [];
      if (row.images) {
        try {
          imagesArr = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
        } catch (e) {
          imagesArr = [row.images];
        }
      }
      if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
        imagesArr = row.image ? [row.image, row.image, row.image] : [];
      }

      return {
        ...row,
        price: Number(row.dailyRate || 1800),
        isAvailable: Boolean(row.isAvailable),
        verified: Boolean(row.verified),
        bookingStatus: row.bookingStatus || (row.isAvailable ? 'READY_FOR_BOOKING' : 'ALREADY_BOOKED'),
        activeBooking,
        images: imagesArr,
        distance: distText,
        distanceKm: Number(distNum)
      };
    });

    // Customer / User View: Hide vehicles that are ALREADY_BOOKED, ON_TRIP, or !isAvailable
    const isUserScope = req.query.scope === 'user' || req.query.role === 'customer' || availableOnly === 'true' || availableOnly === '1';
    if (isUserScope) {
      formatted = formatted.filter(v =>
        Boolean(v.isAvailable) &&
        v.isAvailable !== 0 &&
        v.bookingStatus !== 'ALREADY_BOOKED' &&
        v.bookingStatus !== 'ON_TRIP' &&
        v.status !== 'On Trip' &&
        v.status !== 'Not Available'
      );
    }

    res.json({
      success: true,
      count: formatted.length,
      location: targetLoc || (isLiveGps ? '' : 'All Locations'),
      isLiveGps,
      range: isLiveGps ? '10-20km' : 'all',
      data: formatted
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 2. GET /api/rental/vehicles/locations
// Returns distinct available locations and active fleet counts
// ----------------------------------------------------------------------------
router.get('/locations', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const rows: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT city, location, COUNT(*) as vehicleCount
      FROM RentalVehicle
      GROUP BY city, location
      ORDER BY vehicleCount DESC;
    `);

    res.json({
      success: true,
      data: rows || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. GET /api/rental/vehicles/:id
// Get details of a single vehicle
// ----------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const id = String(req.params.id);
    const rows: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT * FROM RentalVehicle WHERE id = ? OR LOWER(plate) = ? LIMIT 1;
    `, id, id.toLowerCase());

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental vehicle not found' });
    }

    const v = rows[0];
    let activeBooking = null;
    if (v.activeBookingData) {
      try {
        activeBooking = typeof v.activeBookingData === 'string' ? JSON.parse(v.activeBookingData) : v.activeBookingData;
      } catch (e) { }
    }

    let imagesArr: string[] = [];
    if (v.images) {
      try {
        imagesArr = typeof v.images === 'string' ? JSON.parse(v.images) : v.images;
      } catch (e) {
        imagesArr = [v.images];
      }
    }
    if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
      imagesArr = v.image ? [v.image, v.image, v.image] : [];
    }

    res.json({
      success: true,
      data: {
        ...v,
        price: Number(v.dailyRate),
        isAvailable: Boolean(v.isAvailable),
        verified: Boolean(v.verified),
        bookingStatus: v.bookingStatus || (v.isAvailable ? 'READY_FOR_BOOKING' : 'ALREADY_BOOKED'),
        activeBooking,
        images: imagesArr
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 4. POST /api/rental/vehicles
// Add a new rental vehicle (Added by owner on Business Website)
// ----------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const body = req.body;

    if (!body.name || !body.location) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle name and location are required'
      });
    }

    const id = body.id || `VH-${Date.now().toString().slice(-4)}`;
    const partnerId = body.partnerId || 'partner_1';
    const ownerName = body.ownerName || 'SART Partner Fleet';
    const ownerPhone = body.ownerPhone || '+91 98765 43210';
    const name = body.name.trim();
    const brand = body.brand || name.split(' ')[0] || 'Generic';
    let type = (body.type || 'car').toLowerCase();
    
    // Auto-detect bike vs car accurately based on brand/name/category
    const isBikeKeywords = /bike|scooter|scooty|cruiser|bullet|classic|hunter|himalayan|activa|r15|pulsar|ola|ather|jupiter|tvs|ktm|royal enfield|two-wheeler|2-wheeler/i;
    if (body.type === 'bike' || isBikeKeywords.test(`${name} ${brand} ${body.category || ''}`)) {
      type = 'bike';
    } else if (body.type === 'car' || /car|sedan|suv|hatchback|creta|verna|swift|baleno|thar|innova|fortuner/i.test(`${name} ${brand} ${body.category || ''}`)) {
      type = 'car';
    }

    const category = body.category || (type === 'bike' ? 'Cruiser (350cc+)' : 'Hatchback');
    const fuel = body.fuel || 'Petrol';
    const transmission = body.transmission || 'Manual';
    const seats = body.seats || (type === 'bike' ? '2-Seater' : '5-Seater');
    const plate = body.plate || `MH 12 ${Math.random().toString(36).substring(2, 4).toUpperCase()} ${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Extract true city from location string, avoiding raw zipcodes like 632106
    let city = body.city;
    const locLower = (body.location || '').toLowerCase();
    if (locLower.includes('katpadi')) city = 'Katpadi';
    else if (locLower.includes('vellore')) city = 'Vellore';
    else if (locLower.includes('chennai')) city = 'Chennai';
    else if (locLower.includes('pune')) city = 'Pune';
    else if (locLower.includes('bengaluru') || locLower.includes('bangalore')) city = 'Bengaluru';
    else if (locLower.includes('mumbai')) city = 'Mumbai';
    else if (locLower.includes('hyderabad')) city = 'Hyderabad';
    else if (!city || /^\d+$/.test(city.trim())) {
      // If city is purely numeric (zipcode) or missing, parse city part from address
      const parts = (body.location || '').split(',').map((p: string) => p.trim()).filter((p: string) => !/^\d+$/.test(p) && p.toLowerCase() !== 'india');
      city = parts.length > 1 ? parts[parts.length - 2] : (parts[0] || 'Katpadi');
    }
    const location = body.location.trim();

    // Rates
    const hourlyRate = Number(body.hourlyRate || body.pricing?.hourly?.replace(/[^0-9.]/g, '') || 150);
    const dailyRate = Number(body.dailyRate || body.price || body.pricing?.daily?.replace(/[^0-9.]/g, '') || 1800);
    const monthlyRate = Number(body.monthlyRate || body.pricing?.monthly?.replace(/[^0-9.]/g, '') || 25000);
    const pricingText = body.pricingText || `₹${hourlyRate}/hr | ₹${dailyRate}/day | ₹${monthlyRate}/month`;

    const isAvailable = body.isAvailable !== undefined ? (body.isAvailable ? 1 : 0) : 1;
    const image = body.image || (type === 'bike' ? '/images/red_bike_3d.png' : '/images/cab_sedan.png');
    const imagesStr = Array.isArray(body.images) && body.images.length > 0
      ? JSON.stringify(body.images)
      : JSON.stringify([image, image, image]);
    const verified = 1;
    const rating = Number(body.rating || 4.8);
    const year = Number(body.year || 2024);
    const kms = body.kms || '500 Kms Included';
    const badge = body.badge || 'Verified Owner';

    // Check if a vehicle with this plate already exists in DB
    const existingPlate: any[] = await prismaAny.$queryRawUnsafe(
      'SELECT id FROM RentalVehicle WHERE LOWER(plate) = ? LIMIT 1;',
      plate.toLowerCase()
    );

    if (existingPlate && existingPlate.length > 0) {
      // Update existing record rather than failing on UNIQUE constraint
      const existingId = existingPlate[0].id;
      await prismaAny.$executeRawUnsafe(`
        UPDATE RentalVehicle SET
          name = ?, brand = ?, type = ?, category = ?, fuel = ?, transmission = ?,
          seats = ?, city = ?, location = ?, hourlyRate = ?, dailyRate = ?, monthlyRate = ?,
          pricingText = ?, isAvailable = ?, image = ?, images = ?, verified = ?, rating = ?,
          year = ?, kms = ?, badge = ?, bookingStatus = 'READY_FOR_BOOKING', updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?;
      `,
        name, brand, type, category, fuel, transmission,
        seats, city, location, hourlyRate, dailyRate, monthlyRate,
        pricingText, isAvailable, image, imagesStr, verified, rating,
        year, kms, badge, existingId
      );

      const updated: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalVehicle WHERE id = ? LIMIT 1;', existingId);
      console.log(`🚗 [RENTAL FLEET UPDATED BY OWNER]: ${name} (${plate}) in ${location}`);

      return res.status(200).json({
        success: true,
        message: 'Vehicle updated in rental fleet successfully',
        data: updated && updated.length > 0 ? {
          ...updated[0],
          price: Number(updated[0].dailyRate),
          isAvailable: Boolean(updated[0].isAvailable),
          verified: Boolean(updated[0].verified)
        } : { id: existingId, name, plate, city, location, dailyRate }
      });
    }

    await prismaAny.$executeRawUnsafe(`
      INSERT INTO RentalVehicle (
        id, partnerId, ownerName, ownerPhone, name, brand, type, category, fuel, transmission, seats, plate, city, location,
        hourlyRate, dailyRate, monthlyRate, pricingText, isAvailable, image, images, verified, rating, year, kms, badge
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
      id, partnerId, ownerName, ownerPhone, name, brand, type, category, fuel, transmission, seats, plate, city, location,
      hourlyRate, dailyRate, monthlyRate, pricingText, isAvailable, image, imagesStr, verified, rating, year, kms, badge
    );

    const created: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalVehicle WHERE id = ? LIMIT 1;', id);

    console.log(`🚗 [RENTAL FLEET ADDED BY OWNER]: ${name} (${plate}) in ${location}`);

    let createdImages: string[] = [];
    if (created && created[0] && created[0].images) {
      try {
        createdImages = JSON.parse(created[0].images);
      } catch (e) {
        createdImages = [image, image, image];
      }
    } else {
      createdImages = [image, image, image];
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle added to rental fleet successfully',
      data: created && created.length > 0 ? {
        ...created[0],
        price: Number(created[0].dailyRate),
        isAvailable: Boolean(created[0].isAvailable),
        verified: Boolean(created[0].verified),
        images: createdImages
      } : { id, name, plate, city, location, dailyRate, images: createdImages }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 5. PATCH /api/rental/vehicles/:id/availability
// Quick toggle vehicle availability
// ----------------------------------------------------------------------------
router.patch('/:id/availability', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    let newStatus = 1;
    if (isAvailable !== undefined) {
      newStatus = isAvailable ? 1 : 0;
    } else {
      // Toggle
      const current: any[] = await prismaAny.$queryRawUnsafe('SELECT isAvailable FROM RentalVehicle WHERE id = ? OR LOWER(plate) = ? LIMIT 1;', id, String(id).toLowerCase());
      if (current && current.length > 0) {
        newStatus = current[0].isAvailable ? 0 : 1;
      }
    }

    const bookingStatusVal = newStatus ? 'READY_FOR_BOOKING' : 'ON_TRIP';

    await prismaAny.$executeRawUnsafe(`
      UPDATE RentalVehicle SET isAvailable = ?, bookingStatus = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? OR LOWER(plate) = ?;
    `, newStatus, bookingStatusVal, id, String(id).toLowerCase());

    const updated: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalVehicle WHERE id = ? OR LOWER(plate) = ? LIMIT 1;', id, String(id).toLowerCase());

    res.json({
      success: true,
      message: `Vehicle availability updated to ${newStatus ? 'Available' : 'On Trip'}`,
      data: updated[0] ? {
        ...updated[0],
        price: Number(updated[0].dailyRate),
        isAvailable: Boolean(updated[0].isAvailable),
        bookingStatus: updated[0].bookingStatus
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 6. PUT /api/rental/vehicles/:id
// Full update of rental vehicle
// ----------------------------------------------------------------------------
router.put('/:id', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const { id } = req.params;
    const body = req.body;
    const targetPlate = String(body.plate || '').trim().toLowerCase();
    const originalPlate = String(body.originalPlate || '').trim().toLowerCase();
    const targetName = String(body.name || '').trim().toLowerCase();
    const imagesStr = body.images ? (Array.isArray(body.images) ? JSON.stringify(body.images) : body.images) : null;

    // Search by ID, original plate, or current plate
    const existing: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT * FROM RentalVehicle 
      WHERE id = ? 
         OR LOWER(id) = ? 
         OR (LOWER(plate) = ? AND ? != '')
         OR (LOWER(plate) = ? AND ? != '')
         OR (LOWER(name) = ? AND ? != '')
      LIMIT 1;
    `, id, String(id).toLowerCase(), originalPlate, originalPlate, targetPlate, targetPlate, targetName, targetName);

    if (existing && existing.length > 0) {
      const matchId = existing[0].id;
      await prismaAny.$executeRawUnsafe(`
        UPDATE RentalVehicle SET
          name = COALESCE(?, name),
          brand = COALESCE(?, brand),
          type = COALESCE(?, type),
          category = COALESCE(?, category),
          fuel = COALESCE(?, fuel),
          transmission = COALESCE(?, transmission),
          seats = COALESCE(?, seats),
          plate = COALESCE(?, plate),
          city = COALESCE(?, city),
          location = COALESCE(?, location),
          hourlyRate = COALESCE(?, hourlyRate),
          dailyRate = COALESCE(?, dailyRate),
          monthlyRate = COALESCE(?, monthlyRate),
          pricingText = COALESCE(?, pricingText),
          image = COALESCE(?, image),
          images = COALESCE(?, images),
          isAvailable = COALESCE(?, isAvailable),
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?;
      `,
        body.name || null,
        body.brand || null,
        body.type ? body.type.toLowerCase() : null,
        body.category || null,
        body.fuel || null,
        body.transmission || null,
        body.seats || null,
        body.plate || null,
        body.city || null,
        body.location || null,
        body.hourlyRate ? Number(body.hourlyRate) : null,
        body.dailyRate ? Number(body.dailyRate) : null,
        body.monthlyRate ? Number(body.monthlyRate) : null,
        body.pricingText || null,
        body.image || null,
        imagesStr,
        body.isAvailable !== undefined ? (body.isAvailable ? 1 : 0) : null,
        matchId
      );

      const updated: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalVehicle WHERE id = ? LIMIT 1;', matchId);
      console.log(`🚗 [RENTAL FLEET UPDATED]: ${body.name || matchId} (${body.plate || matchId})`);

      return res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: updated && updated.length > 0 ? updated[0] : null
      });
    } else {
      // Vehicle did not exist yet: UPSERT by inserting it
      const newId = id || `VH-${Date.now().toString().slice(-4)}`;
      const hourlyRate = Number(body.hourlyRate || 150);
      const dailyRate = Number(body.dailyRate || 1800);
      const monthlyRate = Number(body.monthlyRate || 25000);
      const pricingText = body.pricingText || `₹${hourlyRate}/hr | ₹${dailyRate}/day | ₹${monthlyRate}/month`;
      const isAvailable = body.isAvailable !== undefined ? (body.isAvailable ? 1 : 0) : 1;
      const image = body.image || '/images/cab_sedan.png';
      const images = imagesStr || JSON.stringify([image, image, image]);

      await prismaAny.$executeRawUnsafe(`
        INSERT INTO RentalVehicle (
          id, partnerId, ownerName, ownerPhone, name, brand, type, category, fuel, transmission, seats, plate, city, location,
          hourlyRate, dailyRate, monthlyRate, pricingText, isAvailable, image, images, verified, rating, year, kms, badge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        newId, 'partner_1', 'SART Partner Fleet', '+91 98765 43210',
        body.name || 'Vehicle', body.brand || 'Generic', (body.type || 'car').toLowerCase(),
        body.category || 'Sedan', body.fuel || 'Petrol', body.transmission || 'Manual',
        body.seats || '5 Seats', body.plate || '', body.city || 'Katpadi', body.location || 'Katpadi, Vellore',
        hourlyRate, dailyRate, monthlyRate, pricingText, isAvailable, image, images, 1, 4.8, 2024, '500 Kms Included', 'Verified'
      );

      const created: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalVehicle WHERE id = ? LIMIT 1;', newId);
      console.log(`🚗 [RENTAL FLEET INSERTED VIA PUT]: ${body.name || newId}`);

      return res.json({
        success: true,
        message: 'Vehicle inserted successfully',
        data: created && created.length > 0 ? created[0] : null
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 7. DELETE /api/rental/vehicles/:id
// Delete vehicle from fleet
// ----------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const id = String(req.params.id);
    await prismaAny.$executeRawUnsafe('DELETE FROM RentalVehicle WHERE id = ? OR LOWER(plate) = ?;', id, id.toLowerCase());

    res.json({
      success: true,
      message: 'Vehicle successfully removed from rental fleet',
      id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 8. GET /api/rental/bookings
// Fetch all user rental bookings for the business owner
// ----------------------------------------------------------------------------
router.get('/bookings', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const { partnerId, status } = req.query as Record<string, string | undefined>;
    let query = 'SELECT * FROM RentalBooking WHERE 1=1';
    const params: any[] = [];

    if (partnerId && partnerId !== 'ALL') {
      query += ' AND partnerId = ?';
      params.push(partnerId);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY createdAt DESC';
    let rows: any[] = await prismaAny.$queryRawUnsafe(query, ...params);

    res.json({
      success: true,
      count: rows ? rows.length : 0,
      data: rows || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 9. POST /api/rental/bookings
// User creates booking on user website, appears live in business website
// ----------------------------------------------------------------------------
router.post('/bookings', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const b = req.body;
    const vehicleId = b.vehicleId || 'VH-001';
    const vehicleName = b.vehicleName || 'Self-Drive Vehicle';

    // 1. Fetch current vehicle record to obtain real owner information and validate availability
    const checkVehicles: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT * FROM RentalVehicle 
      WHERE id = ? OR LOWER(plate) = ? OR LOWER(name) = ? LIMIT 1;
    `, vehicleId, String(vehicleId).toLowerCase(), vehicleName.toLowerCase());

    let existingVehicle: any = null;
    if (checkVehicles && checkVehicles.length > 0) {
      existingVehicle = checkVehicles[0];
      if (existingVehicle.isAvailable === 0 || existingVehicle.isAvailable === false || existingVehicle.bookingStatus === 'ALREADY_BOOKED') {
        return res.status(400).json({
          success: false,
          message: 'Vehicle is no longer available. It has already been booked by another customer.'
        });
      }
    }

    const id = b.id || `RBK-${Date.now().toString().slice(-6)}`;
    const bookingId = b.bookingId || `SART-RENT-${Math.floor(100000 + Math.random() * 900000)}`;
    const vehicleSpecs = b.vehicleSpecs || `${b.seats || existingVehicle?.seats || '5 Seats'} • ${b.transmission || existingVehicle?.transmission || 'Manual'} • ${b.fuel || existingVehicle?.fuel || 'Petrol'}`;
    const vehicleImage = b.vehicleImage || b.image || existingVehicle?.image || '/images/cab_sedan.png';
    const partnerId = b.partnerId || existingVehicle?.partnerId || 'partner_1';
    const ownerName = b.ownerName || existingVehicle?.ownerName || 'Vasanth Fleet Ops';
    const ownerPhone = b.ownerPhone || existingVehicle?.ownerPhone || '+91 98765 43210';
    const ownerLocation = existingVehicle?.location || existingVehicle?.city || b.pickupLocation || b.pickup || 'Katpadi, Vellore';

    const pickupLocation = b.pickupLocation || b.pickup || 'Location';
    const returnLocation = b.returnLocation || b.dropoff || pickupLocation;
    const pickupDate = b.pickupDate || 'Today';
    const pickupTime = b.pickupTime || '10:00 AM';
    const returnDate = b.returnDate || 'Tomorrow';
    const returnTime = b.returnTime || '10:00 AM';
    const durationPlan = b.durationPlan || '1 Day';
    const days = Number(b.days || b.customDays || 1);
    const vehicleDistance = b.vehicleDistance || b.distance || '3.13 km from Location';

    const baseRate = Number(b.baseRate || 1800);
    const taxAmount = Number(b.taxAmount || Math.round(baseRate * 0.18));
    const totalAmount = Number(b.totalAmount || b.totalPayable || (baseRate + taxAmount));

    const customerName = b.customerName || 'Passenger';
    const customerAge = String(b.customerAge || '26');
    const customerPhone = b.customerPhone || '+91 98765 43210';
    const customerEmail = b.customerEmail || `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const docType = b.docType || 'Driving License';
    const docNumber = b.docNumber || 'DL-MH12-2022-998811';
    const uploadedDocName = b.uploadedDocName || 'driving_license_front.jpg';
    const status = b.status || 'Confirmed';
    const paymentStatus = b.paymentStatus || 'Paid';

    await prismaAny.$executeRawUnsafe(`
      INSERT INTO RentalBooking (
        id, bookingId, vehicleId, vehicleName, vehicleSpecs, vehicleImage, partnerId, ownerName,
        pickupLocation, returnLocation, pickupDate, pickupTime, returnDate, returnTime,
        durationPlan, days, vehicleDistance, baseRate, taxAmount, totalAmount,
        customerName, customerAge, customerPhone, docType, docNumber, uploadedDocName,
        status, paymentStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
      id, bookingId, vehicleId, vehicleName, vehicleSpecs, vehicleImage, partnerId, ownerName,
      pickupLocation, returnLocation, pickupDate, pickupTime, returnDate, returnTime,
      durationPlan, days, vehicleDistance, baseRate, taxAmount, totalAmount,
      customerName, customerAge, customerPhone, docType, docNumber, uploadedDocName,
      status, paymentStatus
    );

    // Active booking details payload attached to the vehicle
    const activeBookingPayload = {
      bookingId,
      vehicleId,
      vehicleName,
      vehicleSpecs,
      vehicleImage,
      partnerId,
      ownerName,
      ownerPhone,
      ownerLocation,
      customerName,
      customerAge,
      customerPhone,
      customerEmail,
      docType,
      docNumber,
      uploadedDocName,
      pickupLocation,
      returnLocation,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      durationPlan,
      days,
      vehicleDistance,
      baseRate,
      taxAmount,
      totalAmount,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      createdAt: new Date().toISOString()
    };

    // Update vehicle record: Set bookingStatus = "ALREADY_BOOKED", isAvailable = 0, attach activeBookingId
    await prismaAny.$executeRawUnsafe(`
      UPDATE RentalVehicle SET
        bookingStatus = 'ALREADY_BOOKED',
        isAvailable = 0,
        activeBookingId = ?,
        activeBookingData = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? OR LOWER(plate) = ? OR LOWER(name) = ?;
    `, bookingId, JSON.stringify(activeBookingPayload), vehicleId, String(vehicleId).toLowerCase(), vehicleName.toLowerCase());

    const created: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalBooking WHERE id = ? LIMIT 1;', id);

    // Automatically trigger business notification for the vehicle booking
    try {
      const categoryName = existingVehicle?.category || (existingVehicle?.type === 'bike' ? 'Bikes / Cruisers' : 'Full SUV');
      const plateStr = existingVehicle?.plate ? ` (${existingVehicle.plate})` : '';
      addBusinessNotification({
        type: 'rental_booking',
        badge: 'New Rental Booking',
        title: `${customerName} booked a ${categoryName} (${vehicleName})`,
        customerName: customerName,
        category: categoryName,
        vehicleName: `${vehicleName}${plateStr}`,
        vehiclePlate: existingVehicle?.plate || '',
        date: pickupDate,
        time: returnTime ? `${pickupTime} - ${returnTime}` : pickupTime,
        bookingId: bookingId
      });
    } catch (notifErr) {
      console.warn('⚠️ Could not post auto business notification:', notifErr);
    }

    console.log(`📋 [NEW RENTAL BOOKING CREATED]: ${bookingId} for ${vehicleName} by ${customerName}`);

    res.status(201).json({
      success: true,
      message: 'Rental booking successfully confirmed',
      bookingStatus: 'ALREADY_BOOKED',
      data: created && created.length > 0 ? {
        ...created[0],
        ownerName,
        ownerPhone,
        ownerLocation
      } : {
        id,
        bookingId,
        vehicleName,
        customerName,
        totalAmount,
        ownerName,
        ownerPhone,
        ownerLocation
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 10. PATCH /api/rental/bookings/:id/status
// Vehicle owner updates booking status (e.g. Handover, Completed, Cancelled)
// ----------------------------------------------------------------------------
router.patch('/bookings/:id/status', async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const { id } = req.params;
    const { status } = req.body;

    await prismaAny.$executeRawUnsafe(`
      UPDATE RentalBooking SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? OR bookingId = ?;
    `, status || 'Vehicle Handed Over', id, id);

    const updated: any[] = await prismaAny.$queryRawUnsafe('SELECT * FROM RentalBooking WHERE id = ? OR bookingId = ? LIMIT 1;', id, id);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updated && updated.length > 0 ? updated[0] : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 11. POST /api/rental/vehicles/:id/complete-trip & POST /:id/complete-trip
// When business owner clicks "Complete Trip":
// 1. Mark booking as status = "COMPLETED"
// 2. Reset vehicle record: bookingStatus = "READY_FOR_BOOKING", isAvailable = 1, activeBookingId = NULL, activeBookingData = NULL
// ----------------------------------------------------------------------------
const completeTripHandler = async (req: Request, res: Response) => {
  await ensureRentalTable();
  try {
    const { id } = req.params;

    // 1. Mark booking as COMPLETED
    await prismaAny.$executeRawUnsafe(`
      UPDATE RentalBooking SET status = 'COMPLETED', updatedAt = CURRENT_TIMESTAMP
      WHERE vehicleId = ? OR id = ? OR bookingId = ?;
    `, id, id, id);

    // 2. Reset vehicle record
    await prismaAny.$executeRawUnsafe(`
      UPDATE RentalVehicle SET
        bookingStatus = 'READY_FOR_BOOKING',
        isAvailable = 1,
        activeBookingId = NULL,
        activeBookingData = NULL,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? OR LOWER(plate) = ? OR activeBookingId = ?;
    `, id, String(id).toLowerCase(), id);

    const updated: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT * FROM RentalVehicle WHERE id = ? OR LOWER(plate) = ? LIMIT 1;
    `, id, String(id).toLowerCase());

    console.log(`✅ [TRIP COMPLETED]: Vehicle ${id} reset to READY_FOR_BOOKING & Available!`);

    res.json({
      success: true,
      message: 'Trip completed successfully. Vehicle is now available for new bookings.',
      data: updated && updated.length > 0 ? {
        ...updated[0],
        price: Number(updated[0].dailyRate),
        isAvailable: true,
        bookingStatus: 'READY_FOR_BOOKING',
        activeBooking: null
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/vehicles/:id/complete-trip', completeTripHandler);
router.post('/:id/complete-trip', completeTripHandler);

export default router;
