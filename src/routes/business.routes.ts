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
