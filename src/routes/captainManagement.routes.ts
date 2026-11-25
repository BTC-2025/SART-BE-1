import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { redis } from '../redis';
import { AuthenticatedRequest, signCaptainToken } from '../middleware/auth';

const router = Router();

// GET /api/rides/captain-earnings - Returns stored today's earnings and completed ride stats from DB filtered per registered captain
router.get(
  '/captain-earnings',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queryPhone = req.query.phone ? String(req.query.phone).replace(/\D/g, '') : '';
      const queryCaptainId = req.query.captainId ? String(req.query.captainId) : '';
      const queryName = req.query.name ? String(req.query.name).trim().toLowerCase() : '';

      // Find all completed ride bookings
      const completedBookings = await prisma.booking.findMany({
        where: {
          type: 'ride',
          status: 'Completed'
        },
        orderBy: { updatedAt: 'desc' }
      });

      let todayEarnings = 0;
      const todayDateStr = new Date().toISOString().split('T')[0];

      // Filter bookings specific to this registered captain if phone/id/name provided
      const filteredBookings = completedBookings.filter((b) => {
        // If no captain identifier provided, return 0 / empty to avoid showing another captain's earnings
        if (!queryPhone && !queryCaptainId && !queryName) return false;
        let extra: any = {};
        try {
          if (b.extraData) extra = JSON.parse(b.extraData);
        } catch (e) { }

        const bPhone = extra.captainPhone ? String(extra.captainPhone).replace(/\D/g, '') : '';
        const bId = extra.captainId ? String(extra.captainId) : '';
        const bName = extra.captainName ? String(extra.captainName).trim().toLowerCase() : '';

        if (queryPhone && bPhone) {
          if (bPhone.includes(queryPhone) || queryPhone.includes(bPhone)) return true;
        }
        if (queryCaptainId && bId && bId === queryCaptainId) return true;
        if (queryName && bName && bName.includes(queryName)) return true;

        return false;
      });

      // Group rides by date for daily breakdown
      const dailyBreakdown: Record<string, { date: string; rideCount: number; totalAmount: number; rides: any[] }> = {};

      const completedList = filteredBookings.map((b) => {
        let extra: any = {};
        try {
          if (b.extraData) extra = JSON.parse(b.extraData);
        } catch (e) { }

        const earned = extra.earnedAmount || (b.cost + (extra.bonus || 10));
        const bookingDate = (extra.completedAt || b.updatedAt.toISOString()).split('T')[0];
        if (bookingDate === todayDateStr) {
          todayEarnings += earned;
        }

        if (!dailyBreakdown[bookingDate]) {
          dailyBreakdown[bookingDate] = {
            date: bookingDate,
            rideCount: 0,
            totalAmount: 0,
            rides: []
          };
        }
        dailyBreakdown[bookingDate].rideCount += 1;
        dailyBreakdown[bookingDate].totalAmount += earned;

        const rideItem = {
          id: b.id,
          pickupLoc: b.pickupLoc,
          dropLoc: b.dropLoc,
          fare: b.cost,
          bonus: extra.bonus || 10,
          totalEarned: earned,
          completedAt: extra.completedAt || b.updatedAt,
          date: bookingDate
        };
        dailyBreakdown[bookingDate].rides.push(rideItem);
        return rideItem;
      });

      const dailyHistory = Object.values(dailyBreakdown).sort((a, b) => b.date.localeCompare(a.date));

      res.json({
        success: true,
        todayEarnings,
        totalCompletedRides: filteredBookings.length,
        completedList,
        dailyHistory
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// POST /api/rides/register-partner - Driver registers with vehicle to join SART (returns JWT token)
router.post('/register-partner', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      driverName,
      phone,
      serviceType, // bike, auto, car
      vehicleModel,
      plateNumber,
      licenseNumber,
      city = 'Bengaluru',
      lat = 12.9716,
      lng = 77.5946
    } = req.body;

    if (!driverName || !phone || !serviceType || !vehicleModel || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required partner fields: driverName, phone, serviceType, vehicleModel, plateNumber'
      });
    }

    // 1. Create or ensure User record exists with driver role
    let driverUser = await prisma.user.findFirst({ where: { phone } });
    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          name: driverName,
          phone,
          role: 'driver',
          wallet: {
            create: {
              balance: 500.0,
              points: 100,
              cashback: 0
            }
          }
        }
      });
    }

    // 2. Add Driver Location / Fleet entry so they show up on live map
    const driverEntry = await prisma.driverLocation.create({
      data: {
        driverName,
        serviceType: serviceType.toLowerCase(),
        lat: Number(lat),
        lng: Number(lng),
        status: 'available',
        rating: 5.0,
        vehicleModel,
        plateNumber,
        phone
      }
    });

    // 3. Issue signed JWT Token for Captain
    const token = signCaptainToken({
      id: driverUser.id,
      role: 'driver',
      phone,
      name: driverName
    });

    res.status(201).json({
      success: true,
      message: 'Driver and vehicle registered successfully with SART Partner Network!',
      token,
      data: {
        driverUser,
        fleetMarker: driverEntry
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 🚀 CAPTAIN FULL CRUD (GET, POST, PUT, DELETE) FOR BIKE, AUTO, CAR
// ==========================================

// 1. GET /api/rides/captains - List all captains (supports ?category=bike|auto|car&search=location_or_name)
router.get('/captains', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, type, search } = req.query;
    const serviceType = (category || type) as string;

    const where: any = {};
    if (serviceType && ['bike', 'auto', 'car'].includes(serviceType.toLowerCase())) {
      where.serviceType = serviceType.toLowerCase();
    }

    if (search) {
      where.OR = [
        { driverName: { contains: String(search) } },
        { vehicleModel: { contains: String(search) } },
        { plateNumber: { contains: String(search) } }
      ];
    }

    const captains = await prisma.driverLocation.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      count: captains.length,
      category: serviceType || 'all',
      data: captains
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/rides/captains/:id - Get single captain details
router.get('/captains/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const captain = await prisma.driverLocation.findUnique({
      where: { id }
    });

    if (!captain) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    res.json({ success: true, data: captain });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/rides/captains - Register a new captain with live location
router.post('/captains', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      driverName,
      phone,
      serviceType, // bike, auto, car
      vehicleModel,
      plateNumber,
      lat = 12.9716,
      lng = 77.5946,
      status = 'available'
    } = req.body;

    if (!driverName || !phone || !serviceType || !vehicleModel || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: driverName, phone, serviceType (bike|auto|car), vehicleModel, plateNumber'
      });
    }

    const newCaptain = await prisma.driverLocation.create({
      data: {
        driverName,
        serviceType: serviceType.toLowerCase(),
        vehicleModel,
        plateNumber,
        phone,
        lat: Number(lat),
        lng: Number(lng),
        status,
        rating: 5.0
      }
    });

    // Invalidate Redis cache for this vehicle category
    try {
      await redis.del(`nearby_rides_${serviceType.toLowerCase()}`);
    } catch (e) { }

    res.status(201).json({
      success: true,
      message: `${serviceType.toUpperCase()} Captain successfully registered!`,
      data: newCaptain
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PUT /api/rides/captains/:id - Update captain status, vehicle or live location
router.put('/captains/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { driverName, phone, status, lat, lng, vehicleModel, plateNumber, rating } = req.body;

    const dataToUpdate: any = {};
    if (driverName !== undefined) dataToUpdate.driverName = driverName;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (status !== undefined) dataToUpdate.status = status;
    if (lat !== undefined) dataToUpdate.lat = Number(lat);
    if (lng !== undefined) dataToUpdate.lng = Number(lng);
    if (vehicleModel !== undefined) dataToUpdate.vehicleModel = vehicleModel;
    if (plateNumber !== undefined) dataToUpdate.plateNumber = plateNumber;
    if (rating !== undefined) dataToUpdate.rating = Number(rating);

    const updated = await prisma.driverLocation.update({
      where: { id },
      data: dataToUpdate
    });

    // Invalidate cache
    try {
      await redis.del(`nearby_rides_${updated.serviceType}`);
    } catch (e) { }

    res.json({
      success: true,
      message: 'Captain details updated successfully',
      data: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DELETE /api/rides/captains/:id - Remove captain from fleet
router.delete('/captains/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await prisma.driverLocation.delete({
      where: { id }
    });

    try {
      await redis.del(`nearby_rides_${deleted.serviceType}`);
    } catch (e) { }

    res.json({
      success: true,
      message: 'Captain removed successfully',
      data: deleted
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// City-specific live daily fuel prices (Petrol, Diesel, CNG)
const CITY_FUEL_RATES: Record<string, { petrol: number; diesel: number; cng: number; state: string }> = {
  chennai: { petrol: 107.76, diesel: 99.55, cng: 99.50, state: 'Tamil Nadu' },
  coimbatore: { petrol: 108.45, diesel: 100.45, cng: 96.90, state: 'Tamil Nadu' },
  madurai: { petrol: 108.62, diesel: 100.60, cng: 97.40, state: 'Tamil Nadu' },
  tiruchirappalli: { petrol: 108.15, diesel: 99.95, cng: 96.80, state: 'Tamil Nadu' },
  salem: { petrol: 108.38, diesel: 100.25, cng: 97.10, state: 'Tamil Nadu' },
  bengaluru: { petrol: 110.82, diesel: 99.56, cng: 98.00, state: 'Karnataka' },
  bangalore: { petrol: 110.82, diesel: 99.56, cng: 98.00, state: 'Karnataka' },
  mysuru: { petrol: 110.45, diesel: 99.20, cng: 97.80, state: 'Karnataka' },
  mangaluru: { petrol: 109.80, diesel: 98.90, cng: 97.20, state: 'Karnataka' },
  hyderabad: { petrol: 115.69, diesel: 104.23, cng: 97.00, state: 'Telangana' },
  mumbai: { petrol: 111.21, diesel: 97.28, cng: 89.50, state: 'Maharashtra' },
  pune: { petrol: 110.95, diesel: 96.90, cng: 92.00, state: 'Maharashtra' },
  'new delhi': { petrol: 94.72, diesel: 87.62, cng: 79.70, state: 'Delhi NCR' },
  delhi: { petrol: 94.72, diesel: 87.62, cng: 79.70, state: 'Delhi NCR' },
  noida: { petrol: 96.65, diesel: 89.82, cng: 82.20, state: 'Delhi NCR' },
  gurugram: { petrol: 95.25, diesel: 88.10, cng: 81.60, state: 'Delhi NCR' },
  kochi: { petrol: 108.80, diesel: 97.75, cng: 94.50, state: 'Kerala' },
  ahmedabad: { petrol: 96.44, diesel: 92.11, cng: 84.40, state: 'Gujarat' },
  kolkata: { petrol: 104.95, diesel: 91.76, cng: 89.00, state: 'West Bengal' }
};

// Helper to match city from query or address string
function getCityFuelRate(cityName?: string) {
  if (!cityName) return { petrol: 107.76, diesel: 99.55, cng: 99.50, cityName: 'Chennai' };
  const lower = cityName.toLowerCase();
  for (const [key, rate] of Object.entries(CITY_FUEL_RATES)) {
    if (lower.includes(key)) {
      return { ...rate, cityName: key.charAt(0).toUpperCase() + key.slice(1) };
    }
  }
  return { petrol: 107.76, diesel: 99.55, cng: 99.50, cityName: cityName.split(',')[0].trim() || 'Local' };
}

// ==========================================
// ⛽ FUEL, DURATION & DISTANCE CALCULATOR FOR BIKE, AUTO, CAR
// ==========================================
router.post('/calculate-fuel-fare', (req: AuthenticatedRequest, res: Response) => {
  const { rideType = 'bike', distanceKm = 1, city = 'Chennai' } = req.body;
  const dist = Math.max(0.1, Number(distanceKm) || 1);

  // Look up location's exact daily fuel price
  const locationFuel = getCityFuelRate(city);

  // Vehicle fuel benchmarks & speed parameters
  // Time per 1 kilometer:
  // - Bike: 3 to 4 minutes per km (avg 3.5 min/km)
  // - Auto: 2 to 3 minutes per km (avg 2.5 min/km)
  // - Car: 2 to 4 minutes per km (avg 3.0 min/km)
  const vehicleMetrics: Record<string, {
    mileageKm: number;
    fuelType: string;
    fuelPricePerUnit: number;
    unitName: string;
    minMinutesPerKm: number;
    maxMinutesPerKm: number;
    baseFare: number;
    perKmRate: number;
    driverAllowance: number;
  }> = {
    bike: {
      mileageKm: 45, // 45 km per liter petrol
      fuelType: 'Petrol',
      fuelPricePerUnit: locationFuel.petrol,
      unitName: 'Liter',
      minMinutesPerKm: 3.0,
      maxMinutesPerKm: 4.0,
      baseFare: 25,
      perKmRate: 9,
      driverAllowance: 15
    },
    auto: {
      mileageKm: 28, // 28 km per kg CNG
      fuelType: 'CNG',
      fuelPricePerUnit: locationFuel.cng,
      unitName: 'Kg',
      minMinutesPerKm: 2.0,
      maxMinutesPerKm: 3.0,
      baseFare: 35,
      perKmRate: 14,
      driverAllowance: 20
    },
    car: {
      mileageKm: 18, // 18 km per liter petrol
      fuelType: 'Petrol',
      fuelPricePerUnit: locationFuel.petrol,
      unitName: 'Liter',
      minMinutesPerKm: 2.0,
      maxMinutesPerKm: 4.0,
      baseFare: 75,
      perKmRate: 18,
      driverAllowance: 40
    }
  };

  const metric = vehicleMetrics[rideType] || vehicleMetrics.bike;
  const fuelConsumed = parseFloat((dist / metric.mileageKm).toFixed(2));
  const estimatedFuelCost = parseFloat((fuelConsumed * metric.fuelPricePerUnit).toFixed(2));
  const estimatedFare = Math.round(metric.baseFare + (dist * metric.perKmRate) + metric.driverAllowance);

  // Compute calculated duration based on user specification
  const minTimeMinutes = Math.max(1, Math.round(dist * metric.minMinutesPerKm));
  const maxTimeMinutes = Math.max(minTimeMinutes, Math.round(dist * metric.maxMinutesPerKm));
  const avgDurationMinutes = Math.round((minTimeMinutes + maxTimeMinutes) / 2);

  res.json({
    success: true,
    data: {
      rideType,
      city: locationFuel.cityName,
      distanceKm: dist,
      duration: {
        minMinutes: minTimeMinutes,
        maxMinutes: maxTimeMinutes,
        avgMinutes: avgDurationMinutes,
        formatted: `${minTimeMinutes}-${maxTimeMinutes} mins`
      },
      fuelSpecs: {
        fuelType: metric.fuelType,
        fuelConsumed: `${fuelConsumed} ${metric.unitName}s`,
        fuelPricePerUnit: metric.fuelPricePerUnit,
        fuelCostEstimate: `₹${estimatedFuelCost}`,
        fuelEconomy: `${metric.mileageKm} km/L (${metric.fuelType})`
      },
      pricing: {
        baseFare: metric.baseFare,
        perKmRate: metric.perKmRate,
        driverAllowance: metric.driverAllowance,
        totalCustomerFare: Math.max(estimatedFare, metric.baseFare)
      }
    }
  });
});

// In-memory / file persistent store for requested custom categories
interface CustomCategoryItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  count: string;
  requestedBy?: string;
  createdAt: string;
}

let customCategoriesStore: CustomCategoryItem[] = [
  {
    id: 'refrigerated_van',
    name: 'Refrigerated Van',
    category: 'carrier',
    icon: 'fa-snowflake',
    count: '8+ available',
    createdAt: new Date().toISOString()
  }
];

// GET /api/rides/custom-categories - Get all requested custom vehicle categories
router.get('/custom-categories', (req, res) => {
  const { category, query } = req.query;
  let results = customCategoriesStore;
  if (category) {
    results = results.filter(c => c.category.toLowerCase() === String(category).toLowerCase());
  }
  if (query) {
    const q = String(query).toLowerCase().trim();
    results = results.filter(c => c.name.toLowerCase().includes(q));
  }
  res.json({
    success: true,
    data: results
  });
});

// POST /api/rides/custom-categories - Save a newly requested custom vehicle category
router.post('/custom-categories', (req, res) => {
  try {
    const { name, category, icon, count, requestedBy } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vehicle name is required' });
    }

    const trimmedName = name.trim();
    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existingIndex = customCategoriesStore.findIndex(c => c.id === id && c.category === (category || 'rides'));

    const newItem: CustomCategoryItem = {
      id,
      name: trimmedName,
      category: category || 'rides',
      icon: icon || 'fa-truck-ramp-box',
      count: count || 'Requested',
      requestedBy: requestedBy || 'User',
      createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      customCategoriesStore[existingIndex] = newItem;
    } else {
      customCategoriesStore.push(newItem);
    }

    res.json({
      success: true,
      message: 'Custom vehicle category registered successfully',
      data: newItem
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
