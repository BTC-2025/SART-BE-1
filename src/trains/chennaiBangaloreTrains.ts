import { TrainItem } from './train.types';
import { CHENNAI_BANGALORE_BACKEND_TRAINS_1 } from './chennaiBangaloreTrains1';
import { CHENNAI_BANGALORE_BACKEND_TRAINS_2 } from './chennaiBangaloreTrains2';

export const ALL_CHENNAI_BANGALORE_BACKEND_TRAINS: TrainItem[] = [
  ...CHENNAI_BANGALORE_BACKEND_TRAINS_1,
  ...CHENNAI_BANGALORE_BACKEND_TRAINS_2
];

