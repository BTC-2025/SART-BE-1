import { Router, Request, Response } from 'express';

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
router.get('/notifications', (req: Request, res: Response) => {
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

  const isDriver = b.type === 'driver_booking';
  const isCarrier = b.type === 'carrier_booking';
  const isParking = b.type === 'parking_booking';

  let badge = 'New Rental Booking';
  if (isDriver) badge = 'New Driver Booking';
  else if (isCarrier) badge = 'New Logistics Booking';
  else if (isParking) badge = 'New Parking Reservation';

  let category = b.category || 'Rental Vehicle';
  if (isDriver) category = 'Chauffeur / Driver';
  else if (isCarrier) category = 'Commercial Freight';
  else if (isParking) category = b.category || 'Parking Slot';

  let defaultTitle = `${b.customerName || 'Customer'} booked a ${category} (${b.vehicleName || ''})`;
  if (isDriver) defaultTitle = `${b.customerName || 'Customer'} booked Captain: ${b.vehicleName || 'Driver'}`;
  else if (isParking) defaultTitle = `${b.customerName || 'Customer'} reserved parking at ${b.vehicleName || 'Yard'}`;

  const notif = addBusinessNotification({
    type: b.type || (isDriver ? 'driver_booking' : isParking ? 'parking_booking' : 'rental_booking'),
    badge: b.badge || badge,
    title: b.title || defaultTitle,
    customerName: b.customerName || 'Customer',
    category: category,
    vehicleName: b.vehicleName || 'Vehicle',
    vehiclePlate: b.vehiclePlate || '',
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

export default router;
