import { BusSearchResult, BusSeat } from './bus.types';
import { REDBUS_ABHIBUS_OPERATORS, ROUTE_INFO, POPULAR_BUS_CITIES } from './bus.data';
import { createSeaterSleeper48Layout, createSleeper36Layout, createToiletSleeperLayout } from './busLayouts';

export interface BlockSeatPayload {
  busId: string;
  travelDate: string;
  seats: string[];
  passengers: Array<{
    name: string;
    gender: 'male' | 'female';
    age?: number;
    seatId: string;
  }>;
}

export class BusService {
  // In-memory blocked seats map (expires after 10-15 minutes)
  private blockedSeatsMap: Map<string, {
    blockKey: string;
    busId: string;
    seats: string[];
    passengers: any[];
    expiresAt: number;
  }> = new Map();

  /**
   * Generates dynamic live bus schedules for any origin, destination, and journey date.
   * Daily dates, times, and randomized seat availability change dynamically every day.
   */
  public searchBuses(origin?: string, destination?: string, travelDate?: string): BusSearchResult[] {
    const src = (origin && origin.trim()) || 'Nellore';
    const dest = (destination && destination.trim()) || 'Vellore';
    const cleanSrc = src.replace(/\s*-\s*[A-Z0-9]+$/i, '').trim();
    const cleanDst = dest.replace(/\s*-\s*[A-Z0-9]+$/i, '').trim();
    const srcKey = cleanSrc.toLowerCase();
    const dstKey = cleanDst.toLowerCase();
    const routeKey = `${srcKey}-${dstKey}`;

    const routeData = ROUTE_INFO[routeKey] || { duration: '4h 30m', baseFare: 550 };

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = travelDate || todayStr;

    // Daily deterministic seed from date + route for consistent daily pricing with daily changes
    const seed = this.calculateSeed(`${cleanSrc}-${cleanDst}-${targetDate}`);

    return REDBUS_ABHIBUS_OPERATORS.map((op, idx) => {
      // Dynamic daily times: starting from morning 06:00 to night 23:45
      const depHour = (6 + (idx * 2) + (seed % 3)) % 24;
      const depMin = (idx * 15 + (seed % 4) * 10) % 60;

      const durStr = routeData.duration;
      const depTimeStr = `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;
      const arrHour = (depHour + 4) % 24;
      const arrMin = (depMin + 30) % 60;
      const arrTimeStr = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

      // Dynamic daily randomized seats: 4 to 32 available seats
      const availableSeats = Math.max(3, ((seed * (idx + 1) * 7) % 28) + 4);
      const singleSeats = Math.max(0, Math.floor(availableSeats / 4));

      // Dynamic fare calculation
      const dayOfWeek = new Date(targetDate).getDay();
      const weekendSurge = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) ? 1.15 : 1.0;
      const calculatedFare = Math.round(routeData.baseFare * weekendSurge + ((seed % 5) * 20));
      const fare = calculatedFare > 0 ? calculatedFare : op.baseFare;
      const originalPrice = Math.round(fare * 1.25);

      const boardingPoints = [
        { name: `${cleanSrc} Central Hub / RTC Stand`, time: depTimeStr },
        { name: `${cleanSrc} Highway Bypass Point`, time: `${String((depHour + 1) % 24).padStart(2, '0')}:${String(depMin).padStart(2, '0')}` }
      ];

      const droppingPoints = [
        { name: `${cleanDst} Terminal Gateway / Bypass`, time: arrTimeStr },
        { name: `${cleanDst} Central Drop Junction`, time: `${String((arrHour + 1) % 24).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}` }
      ];

      // Layout type: some buses are pure sleepers (all-sleeper), others are seater-sleeper (2+1)
      const isPureSleeper = op.busType.toLowerCase().includes('sleeper') && !op.busType.toLowerCase().includes('seater') && !op.busType.toLowerCase().includes('semi-sleeper');
      const layoutType: 'seater-sleeper' | 'all-sleeper' = isPureSleeper ? 'all-sleeper' : 'seater-sleeper';

      // 35 Standard Seats
      const ALL_SEAT_CODES = [
        'L-SL1', 'L-SL2', 'L-SL3', 'L-SL4', 'L-SL5',
        'L-S1A', 'L-S1B', 'L-S2A', 'L-S2B', 'L-S3A', 'L-S3B', 'L-S4A', 'L-S4B', 'L-S5A', 'L-S5B', 'L-S6A', 'L-S6B',
        'L-S7A', 'L-S7B', 'L-S7C',
        'U-SL1', 'U-SL2', 'U-SL3', 'U-SL4', 'U-SL5',
        'U-D1A', 'U-D1B', 'U-D2A', 'U-D2B', 'U-D3A', 'U-D3B', 'U-D4A', 'U-D4B', 'U-D5A', 'U-D5B'
      ];
      const bookedCount = Math.max(0, ALL_SEAT_CODES.length - availableSeats);

      const shuffledSeats = [...ALL_SEAT_CODES].sort((a, b) => {
        const hashA = this.calculateSeed(`${a}-${seed}-${idx}`);
        const hashB = this.calculateSeed(`${b}-${seed}-${idx}`);
        return hashA - hashB;
      });
      const bookedSeats = shuffledSeats.slice(0, bookedCount);

      // Booked genders map: deterministic assignment so female/male booked seats appear reliably
      const bookedGenders: Record<string, 'male' | 'female'> = {};
      bookedSeats.forEach((seatCode, sIdx) => {
        // ~40% women booked, ~60% men booked
        const isFemale = ((sIdx + seed + seatCode.charCodeAt(seatCode.length - 1)) % 10) < 4;
        bookedGenders[seatCode] = isFemale ? 'female' : 'male';
      });

      return {
        id: `bus-${op.id}-${srcKey}-${dstKey}`,
        operator: op.name,
        operatorName: op.name,
        busType: op.busType,
        source: cleanSrc,
        destination: cleanDst,
        depTime: depTimeStr,
        departureTime: depTimeStr,
        arrTime: arrTimeStr,
        arrivalTime: arrTimeStr,
        duration: durStr,
        depLocation: `${cleanSrc} Central Hub`,
        arrLocation: `${cleanDst} Terminal`,
        fare,
        price: fare,
        originalPrice,
        availableSeats,
        seatsAvailable: availableSeats,
        singleSeats,
        rating: op.rating,
        totalRatings: op.totalReviews + (seed % 100),
        isPrimo: op.primo,
        isElectric: op.busType.toLowerCase().includes('electric'),
        hasLiveTracking: op.liveTracking,
        hasFreeCancellation: op.freeCancellation,
        hasTripReward: idx % 2 === 0,
        isRTC: ['APSRTC', 'TSRTC', 'KSRTC', 'TNRTC'].includes(op.brand) || op.name.includes('(RTC)'),
        highlights: [
          'GPS Live Tracking',
          'Cleaned and Sanitized',
          'USB Charging Port',
          'Bus Safety Check'
        ],
        boardingPoints,
        droppingPoints,
        date: targetDate,
        bookedSeats,
        layoutType,
        bookedGenders,
        hasToilet: Boolean(op.hasToilet),
        layoutVariant: op.layoutVariant || (layoutType === 'all-sleeper' ? 'sleeper_36' : 'seater_sleeper_48')
      };
    });
  }

  public getBusById(busId: string, origin?: string, destination?: string, date?: string): BusSearchResult | null {
    const list = this.searchBuses(origin, destination, date);
    return list.find(b => b.id === busId) || null;
  }

  /**
   * Retrieves available destination stations given a source city
   */
  public getDestinationStations(source: string): string[] {
    const cleanSrc = source.toLowerCase().trim();
    const destinations: Set<string> = new Set();

    Object.keys(ROUTE_INFO).forEach(key => {
      const parts = key.split('-');
      if (parts[0] === cleanSrc) {
        // Capitalize first letter
        const d = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        destinations.add(d);
      }
    });

    if (destinations.size === 0) {
      // Fallback to all popular cities except origin
      POPULAR_BUS_CITIES.forEach(c => {
        if (c.toLowerCase() !== cleanSrc) destinations.add(c);
      });
    }

    return Array.from(destinations);
  }

  /**
   * Returns physical seat layout, total seat list, and live availability
   */
  public getSeatLayout(busId: string, date?: string) {
    const bus = this.getBusById(busId, undefined, undefined, date);
    if (!bus) return null;

    const baseFare = bus.fare;
    const bookedSet = new Set(bus.bookedSeats || []);
    const bookedGenders = bus.bookedGenders || {};

    let layoutData;
    if (bus.layoutVariant === 'toilet_sleeper_24_24' || bus.hasToilet) {
      layoutData = createToiletSleeperLayout(baseFare, bookedSet, bookedGenders);
    } else if (bus.layoutVariant === 'sleeper_36' || bus.layoutType === 'all-sleeper') {
      layoutData = createSleeper36Layout(baseFare, bookedSet, bookedGenders);
    } else {
      layoutData = createSeaterSleeper48Layout(baseFare, bookedSet, bookedGenders);
    }

    return {
      busId: bus.id,
      operator: bus.operator,
      totalSeats: layoutData.totalSeats,
      availableSeats: bus.availableSeats,
      baseFare: bus.fare,
      hasToilet: layoutData.hasToilet,
      layoutVariant: bus.layoutVariant || (layoutData.hasToilet ? 'toilet_sleeper_24_24' : 'seater_sleeper_48'),
      lowerDeck: layoutData.lowerDeck,
      upperDeck: layoutData.upperDeck
    };
  }

  /**
   * Block Seat: Temporarily holds selected seats for 10-15 minutes
   */
  public blockSeats(payload: BlockSeatPayload) {
    const blockKey = `BLK_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    this.blockedSeatsMap.set(blockKey, {
      blockKey,
      busId: payload.busId,
      seats: payload.seats,
      passengers: payload.passengers,
      expiresAt
    });

    return {
      success: true,
      blockKey,
      expiresAt: new Date(expiresAt).toISOString(),
      heldSeats: payload.seats,
      message: 'Seats held successfully for 15 minutes.'
    };
  }

  /**
   * Returns cancellation policy tiers
   */
  public getCancellationPolicy(busId?: string) {
    return {
      busId: busId || 'all',
      policyRows: [
        { time: 'Before 24 hours of departure', withoutFree: '10% deduction (90% refund)', withFree: '100% Refund' },
        { time: '12 to 24 hours of departure', withoutFree: '25% deduction (75% refund)', withFree: '100% Refund' },
        { time: '04 to 12 hours of departure', withoutFree: '50% deduction (50% refund)', withFree: '100% Refund' },
        { time: '0 to 04 hours of departure', withoutFree: '100% deduction (No refund)', withFree: '0% refund' }
      ],
      notice: 'Free cancellation allows 100% refund up to 4 hours before service departure.'
    };
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
