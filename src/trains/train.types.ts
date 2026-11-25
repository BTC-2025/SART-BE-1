export interface TrainClassOption {
  code: string;
  fare: number;
  status: string;
  statusType: 'available' | 'wl' | 'regret' | 'update';
  updated: string;
  isTatkal?: boolean;
  chance?: string;
  chanceColor?: 'low' | 'medium' | 'high';
  subtext?: string;
  refund3x?: boolean;
}

export interface TrainStop {
  station: string;
  code: string;
  arr: string;
  dep: string;
  halt: string;
  distance?: string;
}

export interface TrainItem {
  id: string;
  number: string;
  name: string;
  runningDays: string;
  departureTime: string;
  departureStation: string;
  departureStationCode: string;
  departureTag?: string;
  departureTags?: string[];
  duration: string;
  arrivalTime: string;
  arrivalStation: string;
  arrivalStationCode: string;
  arrivalTag?: string;
  classes: TrainClassOption[];
  stops: TrainStop[];
  distance?: string;
  avgSpeed?: string;
  punctuality?: string;
  pantryAvailable?: boolean;
  rating?: number;
  ratingCount?: number;
  trainType?: string;
  bannerTag?: string;
  fastest?: boolean;
  soldOut?: boolean;
  date?: string;
}

export interface TrainBookingPayload {
  trainNumber: string;
  trainName: string;
  classCode: string;
  fare: number;
  source: string;
  destination: string;
  dateOfJourney: string;
  departureTime?: string;
  passengerName: string;
  passengerAge?: string | number;
  gender?: 'Male' | 'Female' | 'Other';
  berthPreference?: string;
  freeCancel?: boolean;
}

export interface TrainLiveStatus {
  trainNumber: string;
  trainName: string;
  currentStation: string;
  status: string;
  delayMinutes: number;
  lastUpdated: string;
}


