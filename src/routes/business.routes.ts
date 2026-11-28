import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// ----------------------------------------------------------------------------
// Custom Vehicle Types (e.g. Minivan, Sport, Convertible, Compact SUV, etc.)
// ----------------------------------------------------------------------------
let customVehicleTypes = [
  'Minivan', 'Sport', 'Convertible', 'Compact SUV', 'Full SUV', 'Bikes / Cruisers', 'Refrigerated Van'
];

router.get('/vehicle-types', (req: Request, res: Response) => {
  res.json({ success: true, types: customVehicleTypes });
});

router.post('/vehicle-types', (req: Request, res: Response) => {
  const { newType } = req.body;
  if (newType && !customVehicleTypes.includes(newType)) {
    customVehicleTypes.push(newType);
  }
  res.status(201).json({ success: true, types: customVehicleTypes });
});

// ----------------------------------------------------------------------------
// Partner Profile & Account Settings
// ----------------------------------------------------------------------------
let partnerProfileData = {
  name: '',
  email: '',
  recoveryEmail: '',
  phone: '+918866442211',
  birthday: '',
  gender: 'Rather not say',
  photo: '',
  password: '',
  role: 'Fleet Partner',
  city: 'Chennai'
};

// ----------------------------------------------------------------------------
// In-Memory & Database Notifications Store for Business Website
// ----------------------------------------------------------------------------
export interface BusinessNotification {
  id: string;
  type: 'rental_booking' | 'carrier_booking' | 'driver_booking' | 'parking_booking' | 'system';
  badge: string;
  title: string;
  customerName: string;
  category: string;
  vehicleName: string;
  vehiclePlate?: string;
  date: string;
  time: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

let businessNotifications: BusinessNotification[] = [];

export function addBusinessNotification(notif: Omit<BusinessNotification, 'id' | 'read' | 'createdAt'>) {
  const newNotif: BusinessNotification = {
    ...notif,
    id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    read: false,
    createdAt: new Date().toISOString()
  };
  businessNotifications.unshift(newNotif);
  if (businessNotifications.length > 50) {
    businessNotifications = businessNotifications.slice(0, 50);
  }
  return newNotif;
}

// GET /api/business/notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const prismaAny = prisma as any;
    const carrierBookings: any[] = await prismaAny.$queryRawUnsafe(`
      SELECT id, vehicleName, vehicleReg, customerName, customerPhone, pickupDate, pickupTime, goodsCategory, createdAt 
      FROM CarrierBooking ORDER BY createdAt DESC LIMIT 15
    `).catch(() => []);

    for (const cb of carrierBookings) {
      const alreadyExists = businessNotifications.some(n => n.bookingId === cb.id || n.id === cb.id || n.id === `NOTIF-${cb.id}`);
      if (!alreadyExists) {
        businessNotifications.push({
          id: `NOTIF-${cb.id}`,
          bookingId: cb.id,
          type: 'carrier_booking',
          badge: 'New Carrier Booking',
          title: `${cb.customerName || 'Customer'} booked ${cb.vehicleName || 'Freight Carrier'}`,
          customerName: cb.customerName || 'Customer',
          category: 'Commercial Freight',
          vehicleName: cb.vehicleName || 'Freight Carrier',
          vehiclePlate: cb.vehicleReg || '',
          date: cb.pickupDate || new Date(cb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: cb.pickupTime || new Date(cb.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          read: false,
          createdAt: new Date(cb.createdAt).toISOString()
        });
      }
    }
  } catch (e) { }

  const unreadCount = businessNotifications.filter(n => !n.read).length;
  res.json({
    success: true,
    count: businessNotifications.length,
    unreadCount,
    data: businessNotifications
  });
});

// POST /api/business/notifications
router.post('/notifications', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.title && !b.vehicleName && !b.customerName) {
    return res.status(400).json({ success: false, message: 'Notification details required' });
  }

  const isDriver = b.type === 'driver_booking' || b.type === 'driver';
  const isCarrier = b.type === 'carrier_booking' || b.type === 'carrier';
  const isParking = b.type === 'parking_booking' || b.type === 'parking';

  let badge = 'New Rental Booking';
  if (isDriver) badge = 'New Driver Booking';
  else if (isCarrier) badge = 'New Carrier Booking';
  else if (isParking) badge = 'New Parking Reservation';

  let category = b.category || 'Rental Vehicle';
  if (isDriver) category = 'Chauffeur / Driver';
  else if (isCarrier) category = 'Commercial Freight';
  else if (isParking) category = b.category || 'Parking Slot';

  let defaultTitle = `${b.customerName || 'Customer'} booked a ${category} (${b.vehicleName || ''})`;
  if (isDriver) defaultTitle = `${b.customerName || 'Customer'} booked Captain: ${b.vehicleName || 'Driver'}`;
  else if (isParking) defaultTitle = `${b.customerName || 'Customer'} reserved parking at ${b.vehicleName || 'Yard'}`;
  else if (isCarrier) defaultTitle = `${b.customerName || 'Customer'} booked ${b.vehicleName || 'Carrier Vehicle'}`;

  const notif = addBusinessNotification({
    type: b.type || (isDriver ? 'driver_booking' : isCarrier ? 'carrier_booking' : isParking ? 'parking_booking' : 'rental_booking'),
    badge: b.badge || badge,
    title: b.title || defaultTitle,
    customerName: b.customerName || 'Customer',
    category: category,
    vehicleName: b.vehicleName || 'Vehicle',
    vehiclePlate: b.vehiclePlate || b.vehicleReg || '',
    date: b.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: b.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    bookingId: b.bookingId || ''
  });

  res.status(201).json({
    success: true,
    data: notif
  });
});

// PATCH /api/business/notifications/mark-all-read
router.patch('/notifications/mark-all-read', (req: Request, res: Response) => {
  businessNotifications = businessNotifications.map(n => ({ ...n, read: true }));
  res.json({
    success: true,
    message: 'All notifications marked as read',
    unreadCount: 0
  });
});

// PATCH /api/business/notifications/:id/read
router.patch('/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  businessNotifications = businessNotifications.map(n => n.id === id ? { ...n, read: true } : n);
  const unreadCount = businessNotifications.filter(n => !n.read).length;
  res.json({
    success: true,
    message: 'Notification marked as read',
    unreadCount
  });
});

// DELETE /api/business/notifications
router.delete('/notifications', (req: Request, res: Response) => {
  businessNotifications = [];
  res.json({ success: true, message: 'All notifications cleared', unreadCount: 0 });
});

router.get('/profile', (req: Request, res: Response) => {
  const { password, ...safeData } = partnerProfileData;
  res.json({
    success: true,
    data: {
      ...safeData,
      hasPassword: true
    }
  });
});

router.put('/profile', (req: Request, res: Response) => {
  const { name, phone, birthday, gender, recoveryEmail, password } = req.body;
  if (name !== undefined) partnerProfileData.name = name;
  if (phone !== undefined) partnerProfileData.phone = phone;
  if (birthday !== undefined) partnerProfileData.birthday = birthday;
  if (gender !== undefined) partnerProfileData.gender = gender;
  if (recoveryEmail !== undefined) partnerProfileData.recoveryEmail = recoveryEmail;
  if (password) partnerProfileData.password = password;

  const { password: pw, ...safeData } = partnerProfileData;
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: safeData
  });
});

router.post('/profile/photo', (req: Request, res: Response) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: 'Image base64 data required' });
  }
  partnerProfileData.photo = image;
  res.json({
    success: true,
    message: 'Profile photo updated successfully',
    photo: partnerProfileData.photo
  });
});

router.delete('/profile/photo', (req: Request, res: Response) => {
  partnerProfileData.photo = '';
  res.json({
    success: true,
    message: 'Profile photo removed',
    photo: ''
  });
});

// ----------------------------------------------------------------------------
// Branch Management Endpoints (http://localhost:3007/ManageBranches)
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

const BRANCHES_FILE = path.join(process.cwd(), '.business_branches.json');

interface StoredBranch {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
  status: string;
  owner: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  image: string;
  fleetSummary: string;
}

interface StoredBranchVehicle {
  id: string;
  branchId: string;
  name: string;
  category: string;
  regNumber: string;
  loadCapacity: string;
  rate: string;
  status: string;
  image: string;
}

let storedBranches: StoredBranch[] = [
  {
    id: 'branch-1',
    code: 'BR-01',
    name: 'Main Branch - Chennai',
    isPrimary: true,
    status: 'Active',
    owner: 'Rajesh Kumar',
    email: 'rajesh@sart.com',
    phone: '+91 98401 55555',
    location: '42, Mount Road, Chennai, Tamil Nadu',
    city: 'Chennai',
    image: '/images/branch_chennai.jpg',
    fleetSummary: '12 Vehicles (Auto, Bike, Cab, Trucks)'
  },
  {
    id: 'branch-2',
    code: 'BR-02',
    name: 'Westside Branch - Bengaluru',
    isPrimary: false,
    status: 'Active',
    owner: 'Rajesh Kumar',
    email: 'bengaluru@sart.com',
    phone: '+91 98801 22334',
    location: '104, 100 Feet Rd, Indiranagar, Bengaluru, Karnataka',
    city: 'Bengaluru',
    image: '/images/branch_bengaluru.jpg',
    fleetSummary: '8 Vehicles (Cab, Bike, Cargo)'
  }
];

let activeBranchId = 'branch-1';

let storedBranchVehicles: StoredBranchVehicle[] = [
  {
    id: 'bv-101',
    branchId: 'branch-1',
    name: 'Tata Ace Gold',
    category: 'Truck',
    regNumber: 'TN-09-BK-1452',
    loadCapacity: '900 kg / 0.9 T',
    rate: '₹850/trip | ₹22/km',
    status: 'Available',
    image: '/images/carrier_icon_truck.png'
  },
  {
    id: 'bv-102',
    branchId: 'branch-1',
    name: 'TVS King Cargo 3-Wheeler',
    category: '3-Wheeler Auto',
    regNumber: 'TN-01-XX-9999',
    loadCapacity: '550 kg / 0.55 T',
    rate: '₹450/trip | ₹16/km',
    status: 'Available',
    image: '/images/auto_rickshaw_3d.png'
  },
  {
    id: 'bv-103',
    branchId: 'branch-1',
    name: 'Mahindra Blazo X 28',
    category: 'Heavy Freight',
    regNumber: 'TN-04-MH-2828',
    loadCapacity: '28 Tonnes',
    rate: '₹9,500/trip | ₹85/km',
    status: 'Available',
    image: '/images/carrier_icon_truck.png'
  },
  {
    id: 'bv-201',
    branchId: 'branch-2',
    name: 'Toyota Innova Crysta Cab',
    category: 'Passenger Cab',
    regNumber: 'KA-01-CR-8899',
    loadCapacity: '7 Passengers',
    rate: '₹1,800/day | ₹18/km',
    status: 'Available',
    image: '/images/cab_xl.png'
  }
];

// Helper to persist to file
function saveBranchesState() {
  try {
    fs.writeFileSync(BRANCHES_FILE, JSON.stringify({
      branches: storedBranches,
      activeBranchId,
      vehicles: storedBranchVehicles
    }, null, 2), 'utf-8');
  } catch (e) { }
}

// Helper to load from file on startup
function loadBranchesState() {
  try {
    if (fs.existsSync(BRANCHES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BRANCHES_FILE, 'utf-8'));
      if (parsed.branches && Array.isArray(parsed.branches)) storedBranches = parsed.branches;
      if (parsed.activeBranchId) activeBranchId = parsed.activeBranchId;
      if (parsed.vehicles && Array.isArray(parsed.vehicles)) storedBranchVehicles = parsed.vehicles;
    }
  } catch (e) { }
}
loadBranchesState();

// GET /api/business/branches
router.get('/branches', (req: Request, res: Response) => {
  res.json({
    success: true,
    activeBranchId,
    branches: storedBranches
  });
});

// POST /api/business/branches
router.post('/branches', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.name) {
    return res.status(400).json({ success: false, message: 'Branch name is required' });
  }

  const nextIdx = storedBranches.length + 1;
  const newBranch: StoredBranch = {
    id: b.id || `branch-${Date.now()}`,
    code: b.code || `BR-0${nextIdx < 10 ? '0' + nextIdx : nextIdx}`,
    name: b.name,
    isPrimary: false,
    status: 'Active',
    owner: b.owner || 'Rajesh Kumar',
    email: b.email || 'branch@sart.com',
    phone: b.phone || '+91 98401 00000',
    location: b.location || 'Branch Commercial Hub',
    city: b.city || 'City Depot',
    image: b.image || '/images/branch_bengaluru.jpg',
    fleetSummary: '0 Vehicles'
  };

  storedBranches.push(newBranch);
  saveBranchesState();

  res.status(201).json({
    success: true,
    branch: newBranch,
    branches: storedBranches
  });
});

// PATCH /api/business/branches/:id/activate
router.patch('/branches/:id/activate', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const exists = storedBranches.some(b => b.id === id);
  if (exists) {
    activeBranchId = id;
    saveBranchesState();
    return res.json({ success: true, activeBranchId });
  }
  res.status(404).json({ success: false, message: 'Branch not found' });
});

// GET /api/business/branches/:id/vehicles
router.get('/branches/:id/vehicles', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const vehicles = storedBranchVehicles.filter(v => v.branchId === id);
  res.json({ success: true, branchId: id, vehicles });
});

// POST /api/business/branches/:id/vehicles
router.post('/branches/:id/vehicles', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const v = req.body;
  if (!v.name) {
    return res.status(400).json({ success: false, message: 'Vehicle name is required' });
  }

  const newVehicle: StoredBranchVehicle = {
    id: v.id || `bv-${Date.now()}`,
    branchId: id,
    name: v.name,
    category: v.category || 'Truck',
    regNumber: v.regNumber || 'TN-01-AB-1234',
    loadCapacity: v.loadCapacity || '1.0 Ton',
    rate: v.rate || '₹850/trip',
    status: v.status || 'Available',
    image: v.image || '/images/carrier_icon_truck.png'
  };

  storedBranchVehicles.unshift(newVehicle);

  // Update summary in branch
  const count = storedBranchVehicles.filter(item => item.branchId === id).length;
  const branchIdx = storedBranches.findIndex(b => b.id === id);
  if (branchIdx >= 0) {
    storedBranches[branchIdx].fleetSummary = `${count} Vehicles`;
  }

  saveBranchesState();
  res.status(201).json({ success: true, vehicle: newVehicle });
});

// DELETE /api/business/branches/:id/vehicles/:vehicleId
router.delete('/branches/:id/vehicles/:vehicleId', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const vehicleId = String(req.params.vehicleId);
  storedBranchVehicles = storedBranchVehicles.filter(v => !(v.branchId === id && v.id === vehicleId));

  const count = storedBranchVehicles.filter(item => item.branchId === id).length;
  const branchIdx = storedBranches.findIndex(b => b.id === id);
  if (branchIdx >= 0) {
    storedBranches[branchIdx].fleetSummary = `${count} Vehicles`;
  }

  saveBranchesState();
  res.json({ success: true, message: 'Vehicle removed from branch' });
});

export default router;
