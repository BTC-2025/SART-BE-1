import { BusSeat } from './bus.types';

// 1. Layout: 24 Seaters Lower + 24 Sleepers Upper (Total 48 Seats) - Image 1
export function createSeaterSleeper48Layout(baseFare: number, bookedSet: Set<string>, bookedGenders: Record<string, 'male' | 'female'>) {
  const lowerSleepers: BusSeat[] = [
    { id: 'L-SL1', code: 'SL1', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL2', code: 'SL2', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL3', code: 'SL3', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL4', code: 'SL4', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL5', code: 'SL5', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL6', code: 'SL6', price: Math.round(baseFare * 1.35), type: 'sleeper' as const, deck: 'lower' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const lowerSeaters: BusSeat[][] = [
    [
      { id: 'L-S1A', code: 'S1A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R1' },
      { id: 'L-S1B', code: 'S1B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R1' },
    ],
    [
      { id: 'L-S2A', code: 'S2A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R2' },
      { id: 'L-S2B', code: 'S2B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R2' },
    ],
    [
      { id: 'L-S3A', code: 'S3A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R3' },
      { id: 'L-S3B', code: 'S3B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R3' },
    ],
    [
      { id: 'L-S4A', code: 'S4A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R4' },
      { id: 'L-S4B', code: 'S4B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R4' },
    ],
    [
      { id: 'L-S5A', code: 'S5A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R5' },
      { id: 'L-S5B', code: 'S5B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R5' },
    ],
    [
      { id: 'L-S6A', code: 'S6A', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R6' },
      { id: 'L-S6B', code: 'S6B', price: 444, type: 'seater' as const, deck: 'lower' as const, pairId: 'L-R6' },
    ],
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  const upperSleepersLeft: BusSeat[] = [
    { id: 'U-SL1', code: 'U-SL1', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL2', code: 'U-SL2', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL3', code: 'U-SL3', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL4', code: 'U-SL4', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL5', code: 'U-SL5', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL6', code: 'U-SL6', price: 888, type: 'sleeper' as const, deck: 'upper' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const upperSleepersRight: BusSeat[][] = [
    [
      { id: 'U-D1A', code: 'U-D1A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
      { id: 'U-D1B', code: 'U-D1B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
    ],
    [
      { id: 'U-D2A', code: 'U-D2A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
      { id: 'U-D2B', code: 'U-D2B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
    ],
    [
      { id: 'U-D3A', code: 'U-D3A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
      { id: 'U-D3B', code: 'U-D3B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
    ],
    [
      { id: 'U-D4A', code: 'U-D4A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
      { id: 'U-D4B', code: 'U-D4B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
    ],
    [
      { id: 'U-D5A', code: 'U-D5A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
      { id: 'U-D5B', code: 'U-D5B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
    ],
    [
      { id: 'U-D6A', code: 'U-D6A', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
      { id: 'U-D6B', code: 'U-D6B', price: 666, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
    ],
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  return {
    totalSeats: 36,
    hasToilet: false,
    lowerDeck: {
      sleepers: lowerSleepers,
      seaters: lowerSeaters,
      backRow: []
    },
    upperDeck: {
      sleepersLeft: upperSleepersLeft,
      sleepersRight: upperSleepersRight
    }
  };
}

// 2. Layout: 36 Sleepers Pure Sleeper (18 Lower + 18 Upper) - Image 2
export function createSleeper36Layout(baseFare: number, bookedSet: Set<string>, bookedGenders: Record<string, 'male' | 'female'>) {
  const lowerSleepersLeft: BusSeat[] = [
    { id: 'L-SL1', code: 'L1', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL2', code: 'L2', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL3', code: 'L3', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL4', code: 'L4', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL5', code: 'L5', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL6', code: 'L6', price: Math.round(baseFare * 1.2), type: 'sleeper' as const, deck: 'lower' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const lowerSleepersRight: BusSeat[][] = [
    [
      { id: 'L-D1A', code: 'L-D1A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R1' },
      { id: 'L-D1B', code: 'L-D1B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R1' },
    ],
    [
      { id: 'L-D2A', code: 'L-D2A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R2' },
      { id: 'L-D2B', code: 'L-D2B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R2' },
    ],
    [
      { id: 'L-D3A', code: 'L-D3A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R3' },
      { id: 'L-D3B', code: 'L-D3B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R3' },
    ],
    [
      { id: 'L-D4A', code: 'L-D4A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R4' },
      { id: 'L-D4B', code: 'L-D4B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R4' },
    ],
    [
      { id: 'L-D5A', code: 'L-D5A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R5' },
      { id: 'L-D5B', code: 'L-D5B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R5' },
    ],
    [
      { id: 'L-D6A', code: 'L-D6A', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R6' },
      { id: 'L-D6B', code: 'L-D6B', price: baseFare, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R6' },
    ],
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  const upperSleepersLeft: BusSeat[] = [
    { id: 'U-SL1', code: 'U1', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL2', code: 'U2', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL3', code: 'U3', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL4', code: 'U4', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL5', code: 'U5', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL6', code: 'U6', price: Math.round(baseFare * 1.15), type: 'sleeper' as const, deck: 'upper' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const upperSleepersRight: BusSeat[][] = [
    [
      { id: 'U-D1A', code: 'U-D1A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
      { id: 'U-D1B', code: 'U-D1B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
    ],
    [
      { id: 'U-D2A', code: 'U-D2A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
      { id: 'U-D2B', code: 'U-D2B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
    ],
    [
      { id: 'U-D3A', code: 'U-D3A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
      { id: 'U-D3B', code: 'U-D3B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
    ],
    [
      { id: 'U-D4A', code: 'U-D4A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
      { id: 'U-D4B', code: 'U-D4B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
    ],
    [
      { id: 'U-D5A', code: 'U-D5A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
      { id: 'U-D5B', code: 'U-D5B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
    ],
    [
      { id: 'U-D6A', code: 'U-D6A', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
      { id: 'U-D6B', code: 'U-D6B', price: Math.round(baseFare * 0.95), type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
    ],
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  return {
    totalSeats: 36,
    hasToilet: false,
    lowerDeck: {
      sleepers: lowerSleepersLeft,
      seaters: lowerSleepersRight,
      backRow: []
    },
    upperDeck: {
      sleepersLeft: upperSleepersLeft,
      sleepersRight: upperSleepersRight
    }
  };
}

// 3. Layout: Bus with Toilet on Lower Deck (Image 3)
export function createToiletSleeperLayout(baseFare: number, bookedSet: Set<string>, bookedGenders: Record<string, 'male' | 'female'>) {
  // Lower deck has Toilet at front-left, followed by 5 single sleepers on left, and 6 rows of 2 on right
  const lowerSleepersLeft: BusSeat[] = [
    { id: 'L-SL1', code: 'L1', price: 1059, type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL2', code: 'L2', price: 1059, type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL3', code: 'L3', price: 1059, type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL4', code: 'L4', price: 879, type: 'sleeper' as const, deck: 'lower' as const },
    { id: 'L-SL5', code: 'L5', price: 879, type: 'sleeper' as const, deck: 'lower' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const lowerSleepersRight: BusSeat[][] = [
    [
      { id: 'L-D1A', code: 'LD1A', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R1' },
      { id: 'L-D1B', code: 'LD1B', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R1' },
    ],
    [
      { id: 'L-D2A', code: 'LD2A', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R2' },
      { id: 'L-D2B', code: 'LD2B', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R2' },
    ],
    [
      { id: 'L-D3A', code: 'LD3A', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R3' },
      { id: 'L-D3B', code: 'LD3B', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R3' },
    ],
    [
      { id: 'L-D4A', code: 'LD4A', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R4' },
      { id: 'L-D4B', code: 'LD4B', price: 859, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R4' },
    ],
    [
      { id: 'L-D5A', code: 'LD5A', price: 689, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R5' },
      { id: 'L-D5B', code: 'LD5B', price: 689, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R5' },
    ],
    [
      { id: 'L-D6A', code: 'LD6A', price: 689, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R6' },
      { id: 'L-D6B', code: 'LD6B', price: 689, type: 'sleeper' as const, deck: 'lower' as const, pairId: 'L-R6' },
    ]
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  const upperSleepersLeft: BusSeat[] = [
    { id: 'U-SL1', code: 'U1', price: 989, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL2', code: 'U2', price: 989, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL3', code: 'U3', price: 989, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL4', code: 'U4', price: 989, type: 'sleeper' as const, deck: 'upper' as const },
    { id: 'U-SL5', code: 'U5', price: 879, type: 'sleeper' as const, deck: 'upper' as const },
  ].map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] }));

  const upperSleepersRight: BusSeat[][] = [
    [
      { id: 'U-D1A', code: 'UD1A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
      { id: 'U-D1B', code: 'UD1B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R1' },
    ],
    [
      { id: 'U-D2A', code: 'UD2A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
      { id: 'U-D2B', code: 'UD2B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R2' },
    ],
    [
      { id: 'U-D3A', code: 'UD3A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
      { id: 'U-D3B', code: 'UD3B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R3' },
    ],
    [
      { id: 'U-D4A', code: 'UD4A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
      { id: 'U-D4B', code: 'UD4B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R4' },
    ],
    [
      { id: 'U-D5A', code: 'UD5A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
      { id: 'U-D5B', code: 'UD5B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R5' },
    ],
    [
      { id: 'U-D6A', code: 'UD6A', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
      { id: 'U-D6B', code: 'UD6B', price: 779, type: 'sleeper' as const, deck: 'upper' as const, pairId: 'U-R6' },
    ]
  ].map(row => row.map(s => ({ ...s, isBooked: bookedSet.has(s.id), bookedGender: bookedGenders[s.id] })));

  return {
    totalSeats: 34,
    hasToilet: true,
    lowerDeck: {
      sleepers: lowerSleepersLeft,
      seaters: lowerSleepersRight,
      backRow: []
    },
    upperDeck: {
      sleepersLeft: upperSleepersLeft,
      sleepersRight: upperSleepersRight
    }
  };
}

