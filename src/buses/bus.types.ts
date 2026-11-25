export interface BusOperator {
  id: string;
  name: string;
  brand: 'redBus' | 'AbhiBus' | 'APSRTC' | 'TSRTC' | 'KSRTC' | 'TNRTC' | 'Private';
  busType: string;
  rating: number;
  totalReviews: number;
  baseFare: number;
  primo: boolean;
  liveTracking: boolean;
  freeCancellation: boolean;
  hasToilet?: boolean;
  layoutVariant?: 'seater_sleeper_48' | 'sleeper_36' | 'toilet_sleeper_24_24';
}

export interface BusRouteSchedule {
  id: string;
  operatorId: string;
  operatorName: string;
  brand: string;
  busType: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  boardingPoints: string[];
  droppingPoints: string[];
}

export interface BusSearchResult {
  id: string;
  operator: string;
  operatorName: string;
  busType: string;
  source: string;
  destination: string;
  depTime: string;
  departureTime: string;
  arrTime: string;
  arrivalTime: string;
  duration: string;
  depLocation: string;
  arrLocation: string;
  fare: number;
  price: number;
  originalPrice: number;
  availableSeats: number;
  seatsAvailable: number;
  singleSeats: number;
  rating: number;
  totalRatings: number;
  isPrimo: boolean;
  isElectric: boolean;
  hasLiveTracking: boolean;
  hasFreeCancellation: boolean;
  hasTripReward: boolean;
  isRTC: boolean;
  highlights: string[];
  boardingPoints: { name: string; time: string }[];
  droppingPoints: { name: string; time: string }[];
  date: string;
  bookedSeats?: string[];
  layoutType?: 'seater-sleeper' | 'all-sleeper';
  bookedGenders?: Record<string, 'male' | 'female'>;
  hasToilet?: boolean;
  layoutVariant?: 'seater_sleeper_48' | 'sleeper_36' | 'toilet_sleeper_24_24';
}

export interface BusSeat {
  id: string;
  code: string;
  price: number;
  type: 'sleeper' | 'seater';
  deck: 'lower' | 'upper';
  pairId?: string;
  isBooked?: boolean;
  bookedGender?: 'male' | 'female';
}


