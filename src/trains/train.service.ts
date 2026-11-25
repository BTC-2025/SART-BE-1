import { TrainItem, TrainClassOption } from './train.types';
import { IRCTC_TRAIN_CATALOG } from './train.data';
import { ALL_CHENNAI_BANGALORE_BACKEND_TRAINS } from './chennaiBangaloreTrains';

export class TrainService {
  // In-memory seat booking adjustments map: key = `${trainNumber}_${classCode}_${isTatkal ? 'tatkal' : 'gen'}`
  private static bookedSeatsMap: Map<string, number> = new Map();

  public static recordBooking(trainNumber: string, classCode: string, seatsBooked: number = 1, isTatkal?: boolean) {
    const key = `${trainNumber}_${classCode.toUpperCase()}_${isTatkal ? 'tatkal' : 'gen'}`;
    const current = TrainService.bookedSeatsMap.get(key) || 0;
    TrainService.bookedSeatsMap.set(key, current + seatsBooked);

    const genericKey = `${trainNumber}_${classCode.toUpperCase()}`;
    const genCurrent = TrainService.bookedSeatsMap.get(genericKey) || 0;
    TrainService.bookedSeatsMap.set(genericKey, genCurrent + seatsBooked);
  }

  public static getBookedSeats(trainNumber: string, classCode: string, isTatkal?: boolean): number {
    const key = `${trainNumber}_${classCode.toUpperCase()}_${isTatkal ? 'tatkal' : 'gen'}`;
    if (TrainService.bookedSeatsMap.has(key)) {
      return TrainService.bookedSeatsMap.get(key) || 0;
    }
    const genericKey = `${trainNumber}_${classCode.toUpperCase()}`;
    return TrainService.bookedSeatsMap.get(genericKey) || 0;
  }

  private applySeatAdjustments(trains: TrainItem[]): TrainItem[] {
    return trains.map((t) => ({
      ...t,
      classes: t.classes.map((cls) => {
        const booked = TrainService.getBookedSeats(t.number, cls.code, cls.isTatkal);
        if (booked <= 0) return cls;

        let newStatus = cls.status;
        let newStatusType = cls.statusType;

        if (cls.statusType === 'available' || cls.status.toUpperCase().includes('AVL') || cls.status.toUpperCase().includes('AVAILABLE')) {
          const match = cls.status.match(/\d+/);
          if (match) {
            const base = parseInt(match[0], 10);
            const remaining = base - booked;
            if (remaining > 0) {
              newStatus = cls.status.replace(/\d+/, String(remaining));
            } else {
              newStatusType = 'wl';
              newStatus = `WL ${Math.abs(remaining) + 1}`;
            }
          }
        } else if (cls.statusType === 'wl' || cls.status.toUpperCase().includes('WL') || cls.status.toUpperCase().includes('WAITING') || cls.status.toUpperCase().includes('PQWL') || cls.status.toUpperCase().includes('RLWL')) {
          const match = cls.status.match(/\d+/);
          if (match) {
            const base = parseInt(match[0], 10);
            newStatus = cls.status.replace(/\d+/, String(base + booked));
          }
        }

        return { ...cls, status: newStatus, statusType: newStatusType };
      })
    }));
  }

  /**
   * Search IRCTC trains matching route, with live dynamic dates, times, and availability
   */
  public searchTrains(origin?: string, destination?: string, travelDate?: string): TrainItem[] {
    const src = (origin && origin.trim()) || 'New Delhi';
    const dest = (destination && destination.trim()) || 'Mumbai Central';
    const targetDate = travelDate || new Date().toISOString().split('T')[0];

    const s = src.toLowerCase();
    const d = dest.toLowerCase();

    // Check if this is Chennai <-> Bangalore / Bengaluru corridor
    const isChennaiBangalore =
      (s.includes('chennai') || s.includes('mas') || s.includes('perambur') || s.includes('per') || s.includes('ms')) &&
      (d.includes('bengaluru') || d.includes('bangalore') || d.includes('sbc') || d.includes('smvb') || d.includes('ypr') || d.includes('bnc'));

    const isBangaloreChennai =
      (s.includes('bengaluru') || s.includes('bangalore') || s.includes('sbc') || s.includes('smvb') || s.includes('ypr') || s.includes('bnc')) &&
      (d.includes('chennai') || d.includes('mas') || d.includes('perambur') || d.includes('per') || d.includes('ms'));

    if (isChennaiBangalore || isBangaloreChennai) {
      const trains = ALL_CHENNAI_BANGALORE_BACKEND_TRAINS.map(t => ({
        ...t,
        date: targetDate
      }));
      return this.applySeatAdjustments(trains);
    }

    const seed = this.calculateSeed(`${src}-${dest}-${targetDate}`);

    const catalogTrains: TrainItem[] = IRCTC_TRAIN_CATALOG.map((base, idx) => {
      const depH = (base.baseDepHour + (seed % 2)) % 24;
      const depM = (base.baseDepMin + (idx * 5)) % 60;
      const arrH = Math.floor((depH + base.durationHours) % 24);
      const arrM = (depM + 30) % 60;

      const depTime = `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`;
      const arrTime = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
      const durationStr = `${Math.floor(base.durationHours)}h ${Math.round((base.durationHours % 1) * 60)}m`;

      const classes: TrainClassOption[] = [
        this.generateClassStatus('1A', 2850, seed + idx * 3),
        this.generateClassStatus('2A', 1780, seed + idx * 5),
        this.generateClassStatus('3A', 1240, seed + idx * 7),
        this.generateClassStatus('SL', 460, seed + idx * 11)
      ];

      return {
        id: `train-${base.number}`,
        number: base.number,
        name: base.name,
        runningDays: base.runningDays,
        departureTime: depTime,
        departureStation: `${src} (${base.depCode})`,
        departureStationCode: base.depCode,
        duration: durationStr,
        arrivalTime: arrTime,
        arrivalStation: `${dest} (${base.arrCode})`,
        arrivalStationCode: base.arrCode,
        classes,
        distance: base.distance,
        avgSpeed: '78 km/h',
        punctuality: base.punctuality,
        pantryAvailable: base.pantryAvailable,
        date: targetDate,
        stops: [
          { station: src, code: base.depCode, arr: '--:--', dep: depTime, halt: 'Origin' },
          { station: 'Intermediate Junction', code: 'JNC', arr: '12:30', dep: '12:35', halt: '5 mins' },
          { station: dest, code: base.arrCode, arr: arrTime, dep: '--:--', halt: 'Destination' }
        ]
      };
    });

    return this.applySeatAdjustments(catalogTrains);
  }

  public getTrainByNumber(trainNumber: string, origin?: string, destination?: string, date?: string): TrainItem | null {
    const list = this.searchTrains(origin, destination, date);
    return list.find(t => t.number === trainNumber || t.id === trainNumber) || null;
  }

  private generateClassStatus(code: string, baseFare: number, seed: number): TrainClassOption {
    const modes: Array<'available' | 'wl' | 'regret'> = ['available', 'available', 'available', 'wl', 'wl'];
    const statusType = modes[seed % modes.length];
    let status = '';

    if (statusType === 'available') {
      const seats = (seed % 45) + 3;
      status = `AVL ${seats}`;
    } else if (statusType === 'wl') {
      const wlNo = (seed % 28) + 1;
      status = `WL ${wlNo}`;
    } else {
      status = 'REGRET';
    }

    return {
      code,
      fare: Math.round(baseFare + ((seed % 5) * 40)),
      status,
      statusType,
      updated: '10 mins ago'
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
