import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();
const prismaAny = prisma as any;

let isDriverTableInitialized = false;

// Ensure database tables exist for Driver Fleet & Verifications
async function ensureDriverTables() {
  if (isDriverTableInitialized) return;
  try {
    await prismaAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS FleetDriver (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        dob TEXT,
        gender TEXT,
        address TEXT,
        pincode TEXT,
        image TEXT,
        photoFileName TEXT,
        eligibleVehicles TEXT,
        cannotDriveList TEXT,
        drivingExperienceYears TEXT,
        dlNumber TEXT,
        dlUploadName TEXT,
        aadhaarNumber TEXT,
        aadhaarUploadName TEXT,
        panNumber TEXT,
        panUploadName TEXT,
        pccUploadName TEXT,
        emergencyContact TEXT,
        status TEXT DEFAULT 'Verified',
        rating REAL DEFAULT 4.9,
        isAvailable INTEGER DEFAULT 1,
        mode TEXT DEFAULT 'truck',
        hourlyRate REAL DEFAULT 150,
        dailyRate REAL DEFAULT 1000,
        ratePerKm REAL DEFAULT 14,
        baseCharge REAL DEFAULT 120,
        advancePercent REAL DEFAULT 25,
        hub TEXT,
        location TEXT,
        plate TEXT,
        regId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isDriverTableInitialized = true;
    console.log('✅ FleetDriver table initialized successfully');
  } catch (err: any) {
    console.error('Error ensuring FleetDriver table:', err);
  }
}

// 1. GET /api/drivers - Fetch all fleet drivers (with filters)
router.get('/', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const { category, search, availableOnly } = req.query;

    let query = `SELECT * FROM FleetDriver WHERE 1=1`;
    const params: any[] = [];

    if (availableOnly === 'true' || availableOnly === '1') {
      query += ` AND isAvailable = 1`;
    }

    if (category && category !== 'All') {
      query += ` AND (LOWER(mode) = ? OR LOWER(eligibleVehicles) LIKE ?)`;
      params.push(String(category).toLowerCase(), `%${String(category).toLowerCase()}%`);
    }

    if (search) {
      query += ` AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(dlNumber) LIKE ? OR LOWER(address) LIKE ?)`;
      const term = `%${String(search).toLowerCase().trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY createdAt DESC`;

    const drivers: any[] = await prismaAny.$queryRawUnsafe(query, ...params);

    const formatted = drivers.map(d => {
      let eligibleList: any[] = [];
      let cannotList: any[] = [];
      try {
        if (d.eligibleVehicles) eligibleList = JSON.parse(d.eligibleVehicles);
      } catch (e) {
        if (typeof d.eligibleVehicles === 'string') {
          eligibleList = d.eligibleVehicles.split(',').map((s: string) => s.trim());
        }
      }
      try {
        if (d.cannotDriveList) cannotList = JSON.parse(d.cannotDriveList);
      } catch (e) { }

      return {
        ...d,
        eligibleVehicles: eligibleList,
        cannotDriveList: cannotList,
        isAvailable: Boolean(d.isAvailable)
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      drivers: formatted
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/drivers/:id - Fetch single driver by ID
router.get('/:id', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const { id } = req.params;
    const result: any[] = await prismaAny.$queryRawUnsafe(`SELECT * FROM FleetDriver WHERE id = ?`, id);
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    const d = result[0];
    let eligibleList = [];
    try {
      if (d.eligibleVehicles) eligibleList = JSON.parse(d.eligibleVehicles);
    } catch (e) { }

    res.json({
      success: true,
      driver: {
        ...d,
        eligibleVehicles: eligibleList,
        isAvailable: Boolean(d.isAvailable)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/drivers - Register / Add new Fleet Driver
router.post('/', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const data = req.body;
    const id = data.id || `DRV-${Date.now()}`;
    const name = data.name || data.fullName || 'Verified Driver';
    const phone = data.phone || data.mobileNumber || '';
    const dob = data.dob || '';
    const gender = data.gender || 'Male';
    const address = data.address || '';
    const pincode = data.pincode || '';
    const image = data.image || data.passportPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
    const photoFileName = data.photoFileName || '';

    const eligibleList = Array.isArray(data.eligibleVehicles) ? data.eligibleVehicles : [];
    const cannotList = Array.isArray(data.cannotDriveList) ? data.cannotDriveList : [];
    const eligibleVehiclesJson = JSON.stringify(eligibleList);
    const cannotDriveListJson = JSON.stringify(cannotList);

    const drivingExperienceYears = data.drivingExperienceYears || '5';
    const dlNumber = data.dlNumber || `DL-${Date.now().toString().slice(-6)}`;
    const dlUploadName = data.dlUploadName || '';
    const aadhaarNumber = data.aadhaarNumber || '';
    const aadhaarUploadName = data.aadhaarUploadName || '';
    const panNumber = data.panNumber || '';
    const panUploadName = data.panUploadName || '';
    const pccUploadName = data.pccUploadName || '';
    const emergencyContact = data.emergencyContact || '';
    const status = data.status || 'Verified';
    const rating = Number(data.rating) || 4.9;
    const isAvailable = data.isAvailable !== false ? 1 : 0;

    // Determine default mode / category
    let mode = 'truck';
    if (eligibleList.some((v: string) => v.toLowerCase().includes('bike') || v.toLowerCase().includes('two-wheeler'))) {
      mode = 'bike';
    } else if (eligibleList.some((v: string) => v.toLowerCase().includes('car') || v.toLowerCase().includes('sedan'))) {
      mode = 'truck';
    } else if (eligibleList.some((v: string) => v.toLowerCase().includes('ship') || v.toLowerCase().includes('maritime'))) {
      mode = 'ship';
    } else if (eligibleList.some((v: string) => v.toLowerCase().includes('flight') || v.toLowerCase().includes('aircraft'))) {
      mode = 'flight';
    }

    const hourlyRate = mode === 'bike' ? 120 : mode === 'ship' ? 1200 : 200;
    const dailyRate = mode === 'bike' ? 800 : mode === 'ship' ? 8000 : 1500;
    const ratePerKm = mode === 'bike' ? 14 : mode === 'ship' ? 649 : 48;
    const baseCharge = mode === 'bike' ? 120 : mode === 'ship' ? 180000 : 1800;
    const advancePercent = mode === 'bike' ? 25 : mode === 'ship' ? 35 : 30;

    const hub = address || 'Chennai / Vellore Logistics Hub';
    const location = address || 'Chennai / Vellore Logistics Hub';
    const plate = dlNumber;
    const regId = dlNumber;

    await prismaAny.$executeRawUnsafe(`
      INSERT OR REPLACE INTO FleetDriver (
        id, name, phone, dob, gender, address, pincode, image, photoFileName,
        eligibleVehicles, cannotDriveList, drivingExperienceYears, dlNumber, dlUploadName,
        aadhaarNumber, aadhaarUploadName, panNumber, panUploadName, pccUploadName,
        emergencyContact, status, rating, isAvailable, mode, hourlyRate, dailyRate,
        ratePerKm, baseCharge, advancePercent, hub, location, plate, regId, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      id, name, phone, dob, gender, address, pincode, image, photoFileName,
      eligibleVehiclesJson, cannotDriveListJson, drivingExperienceYears, dlNumber, dlUploadName,
      aadhaarNumber, aadhaarUploadName, panNumber, panUploadName, pccUploadName,
      emergencyContact, status, rating, isAvailable, mode, hourlyRate, dailyRate,
      ratePerKm, baseCharge, advancePercent, hub, location, plate, regId
    );

    res.json({
      success: true,
      message: 'Driver verified and added to fleet successfully',
      driver: {
        id,
        name,
        phone,
        mode,
        eligibleVehicles: eligibleList,
        dlNumber,
        isAvailable: Boolean(isAvailable)
      }
    });
  } catch (error: any) {
    console.error('Error saving driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PUT /api/drivers/:id - Update driver profile / details
router.put('/:id', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const { id } = req.params;
    const d = req.body;

    const eligibleVehiclesJson = d.eligibleVehicles ? JSON.stringify(d.eligibleVehicles) : undefined;
    const cannotDriveListJson = d.cannotDriveList ? JSON.stringify(d.cannotDriveList) : undefined;

    await prismaAny.$executeRawUnsafe(`
      UPDATE FleetDriver SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        pincode = COALESCE(?, pincode),
        image = COALESCE(?, image),
        eligibleVehicles = COALESCE(?, eligibleVehicles),
        cannotDriveList = COALESCE(?, cannotDriveList),
        dlNumber = COALESCE(?, dlNumber),
        aadhaarNumber = COALESCE(?, aadhaarNumber),
        panNumber = COALESCE(?, panNumber),
        emergencyContact = COALESCE(?, emergencyContact),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      d.name || null,
      d.phone || null,
      d.address || null,
      d.pincode || null,
      d.image || null,
      eligibleVehiclesJson || null,
      cannotDriveListJson || null,
      d.dlNumber || null,
      d.aadhaarNumber || null,
      d.panNumber || null,
      d.emergencyContact || null,
      id
    );

    res.json({ success: true, message: 'Driver details updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PATCH /api/drivers/:id/availability - Toggle driver active status
router.patch('/:id/availability', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const { id } = req.params;
    const current: any[] = await prismaAny.$queryRawUnsafe(`SELECT isAvailable FROM FleetDriver WHERE id = ?`, id);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const nextVal = current[0].isAvailable === 1 ? 0 : 1;
    await prismaAny.$executeRawUnsafe(`UPDATE FleetDriver SET isAvailable = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, nextVal, id);

    res.json({ success: true, isAvailable: Boolean(nextVal) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE /api/drivers/:id - Delete driver from fleet
router.delete('/:id', async (req: Request, res: Response) => {
  await ensureDriverTables();
  try {
    const { id } = req.params;
    await prismaAny.$executeRawUnsafe(`DELETE FROM FleetDriver WHERE id = ?`, id);
    res.json({ success: true, message: 'Driver deleted from fleet' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
