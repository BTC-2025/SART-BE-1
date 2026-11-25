import { FlightItem } from './flight.types';
import { AIRLINE_CATALOG, AIRPORT_CODES } from './flight.data';

export class FlightService {
  /**
   * Search domestic flights with daily dynamic dates, times, and randomized seat availability
   */
  public searchFlights(origin?: string, destination?: string, travelDate?: string): FlightItem[] {
    const src = (origin && origin.trim()) || 'Bengaluru';
    const dest = (destination && destination.trim()) || 'Delhi';
    const targetDate = travelDate || new Date().toISOString().split('T')[0];

    const srcCode = AIRPORT_CODES[src] || src.substring(0, 3).toUpperCase();
    const destCode = AIRPORT_CODES[dest] || dest.substring(0, 3).toUpperCase();

    const seed = this.calculateSeed(`${srcCode}-${destCode}-${targetDate}`);

    return AIRLINE_CATALOG.map((airline, idx) => {
      // Dynamic daily flight departure times
      const depH = (6 + (idx * 3) + (seed % 2)) % 24;
      const depM = (idx * 20 + (seed % 3) * 10) % 60;
      const flightDurationMin = 135 + ((idx + seed) % 4) * 20; // ~2h 15m to ~3h 15m
      
      const arrTotalMin = depH * 60 + depM + flightDurationMin;
      const arrH = Math.floor((arrTotalMin / 60) % 24);
      const arrM = arrTotalMin % 60;

      const depTime = `${String(depH).padStart(2, '0')}:${String(depMinOrZero(depM)).padStart(2, '0')}`;
      const arrTime = `${String(arrH).padStart(2, '0')}:${String(depMinOrZero(arrM)).padStart(2, '0')}`;
      const durationHours = Math.floor(flightDurationMin / 60);
      const durationMinutes = flightDurationMin % 60;
      const durationStr = `${durationHours}h ${durationMinutes}m`;

      const isNonStop = (idx % 3 !== 2);
      const stopsCount = isNonStop ? 0 : 1;
      const stopsText = isNonStop ? 'Non stop' : '1 stop • HYD';

      // Daily dynamic pricing based on date and airline
      const dayOfWeek = new Date(targetDate).getDay();
      const weekendSurge = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) ? 1.2 : 1.0;
      const fare = Math.round(airline.baseFare * weekendSurge + ((seed % 9) * 150));
      const originalPrice = Math.round(fare * 1.3);

      // Randomized dynamic seats available (e.g. 2 to 19 seats remaining)
      const seatsAvailable = Math.max(2, ((seed * (idx + 2) * 5) % 18) + 2);

      const flightNumber = `${airline.code}-${100 + ((seed + idx * 43) % 899)}`;

      return {
        id: `flight-${flightNumber}`,
        airline: airline.name,
        flightNo: flightNumber,
        airlineLogoColor: airline.logoColor,
        depTime,
        depAirportCode: srcCode,
        depCity: src,
        arrTime,
        arrAirportCode: destCode,
        arrCity: dest,
        duration: durationStr,
        durationMinutes: flightDurationMin,
        stopsCount,
        stopsText,
        fare,
        price: fare,
        originalPrice,
        seatsAvailable,
        baggageInfo: '7 Kgs Cabin • 15 Kgs Check-in included',
        aircraftSize: airline.aircraft,
        freeCancellation: idx % 2 === 0,
        date: targetDate
      };
    });
  }

  private calculateSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

function depMinOrZero(m: number): number {
  return isNaN(m) ? 0 : m;
}

