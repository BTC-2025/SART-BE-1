export interface FlightItem {
  id: string;
  airline: string;
  flightNo: string;
  airlineLogoColor: string;
  depTime: string;
  depAirportCode: string;
  depCity: string;
  arrTime: string;
  arrAirportCode: string;
  arrCity: string;
  duration: string;
  durationMinutes: number;
  stopsCount: number;
  stopsText: string;
  layoverAirport?: string;
  layoverDurationMin?: number;
  fare: number;
  price: number;
  originalPrice: number;
  seatsAvailable: number;
  baggageInfo: string;
  aircraftSize: 'Small / Mid - size aircraft' | 'Wide-body Boeing/Airbus';
  freeCancellation?: boolean;
  date: string;
}

export interface FlightAirport {
  code: string;
  city: string;
  airportName: string;
}

export interface FlightTrackingStatus {
  flightNumber: string;
  airline: string;
  status: string;
  altitudeFeet: number;
  speedKnots: number;
  estimatedArrival: string;
}

