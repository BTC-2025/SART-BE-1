export interface AirlineBase {
  name: string;
  code: string;
  logoColor: string;
  baseFare: number;
  aircraft: 'Small / Mid - size aircraft' | 'Wide-body Boeing/Airbus';
}

export const AIRLINE_CATALOG: AirlineBase[] = [
  {
    name: 'IndiGo',
    code: '6E',
    logoColor: '#002B49',
    baseFare: 4200,
    aircraft: 'Small / Mid - size aircraft'
  },
  {
    name: 'Air India',
    code: 'AI',
    logoColor: '#ED1B24',
    baseFare: 5100,
    aircraft: 'Wide-body Boeing/Airbus'
  },
  {
    name: 'Akasa Air',
    code: 'QP',
    logoColor: '#FF671F',
    baseFare: 3890,
    aircraft: 'Small / Mid - size aircraft'
  },
  {
    name: 'SpiceJet',
    code: 'SG',
    logoColor: '#E60000',
    baseFare: 4050,
    aircraft: 'Small / Mid - size aircraft'
  },
  {
    name: 'Vistara',
    code: 'UK',
    logoColor: '#582C83',
    baseFare: 5600,
    aircraft: 'Wide-body Boeing/Airbus'
  },
  {
    name: 'Air India Express',
    code: 'IX',
    logoColor: '#D32F2F',
    baseFare: 3600,
    aircraft: 'Small / Mid - size aircraft'
  }
];

export const AIRPORT_CODES: Record<string, string> = {
  'Bengaluru': 'BLR',
  'Bangalore': 'BLR',
  'Delhi': 'DEL',
  'New Delhi': 'DEL',
  'Mumbai': 'BOM',
  'Hyderabad': 'HYD',
  'Chennai': 'MAA',
  'Kolkata': 'CCU',
  'Goa': 'GOI',
  'Pune': 'PNQ',
  'Ahmedabad': 'AMD',
  'Kochi': 'COK'
};

