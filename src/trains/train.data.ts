export interface TrainBaseData {
  number: string;
  name: string;
  runningDays: string;
  depStation: string;
  depCode: string;
  arrStation: string;
  arrCode: string;
  baseDepHour: number;
  baseDepMin: number;
  durationHours: number;
  distance: string;
  punctuality: string;
  pantryAvailable: boolean;
}

export const IRCTC_TRAIN_CATALOG: TrainBaseData[] = [
  {
    number: '20608',
    name: 'VANDE BHARAT EXP',
    runningDays: 'M T W T F S S',
    depStation: 'MGR Chennai Central',
    depCode: 'MAS',
    arrStation: 'KSR Bengaluru City Jn',
    arrCode: 'SBC',
    baseDepHour: 5,
    baseDepMin: 50,
    durationHours: 4.5,
    distance: '360 km',
    punctuality: '99% on-time',
    pantryAvailable: true
  },
  {
    number: '12626',
    name: 'KERALA SF EXPRESS',
    runningDays: 'Daily',
    depStation: 'New Delhi',
    depCode: 'NDLS',
    arrStation: 'Thiruvananthapuram Central',
    arrCode: 'TVC',
    baseDepHour: 20,
    baseDepMin: 10,
    durationHours: 49,
    distance: '3028 km',
    punctuality: '94% on-time',
    pantryAvailable: true
  },
  {
    number: '12952',
    name: 'MUMBAI TEJAS RAJDHANI',
    runningDays: 'Daily',
    depStation: 'New Delhi',
    depCode: 'NDLS',
    arrStation: 'Mumbai Central',
    arrCode: 'MMCT',
    baseDepHour: 16,
    baseDepMin: 55,
    durationHours: 15.5,
    distance: '1386 km',
    punctuality: '98% on-time',
    pantryAvailable: true
  },
  {
    number: '12710',
    name: 'SIMHAPURI SF EXPRESS',
    runningDays: 'Daily',
    depStation: 'Secunderabad Jn',
    depCode: 'SC',
    arrStation: 'Gudur Jn',
    arrCode: 'GDR',
    baseDepHour: 22,
    baseDepMin: 5,
    durationHours: 10.5,
    distance: '646 km',
    punctuality: '95% on-time',
    pantryAvailable: false
  },
  {
    number: '12260',
    name: 'SEALDAH AC DURONTO',
    runningDays: 'M W T S',
    depStation: 'Bikaner Jn',
    depCode: 'BKN',
    arrStation: 'Sealdah',
    arrCode: 'SDAH',
    baseDepHour: 12,
    baseDepMin: 15,
    durationHours: 24,
    distance: '1920 km',
    punctuality: '96% on-time',
    pantryAvailable: true
  },
  {
    number: '12002',
    name: 'SHATABDI EXPRESS',
    runningDays: 'Daily',
    depStation: 'New Delhi',
    depCode: 'NDLS',
    arrStation: 'Bhopal HabibGanj',
    arrCode: 'BPL',
    baseDepHour: 6,
    baseDepMin: 0,
    durationHours: 8.5,
    distance: '708 km',
    punctuality: '98% on-time',
    pantryAvailable: true
  },
  {
    number: '12724',
    name: 'TELANGANA EXPRESS',
    runningDays: 'Daily',
    depStation: 'New Delhi',
    depCode: 'NDLS',
    arrStation: 'Hyderabad Deccan',
    arrCode: 'HYB',
    baseDepHour: 16,
    baseDepMin: 0,
    durationHours: 25,
    distance: '1675 km',
    punctuality: '92% on-time',
    pantryAvailable: true
  }
];

