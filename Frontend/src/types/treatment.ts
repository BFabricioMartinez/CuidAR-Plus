// Este archivo ya no se usa, los tipos están en src/types/api.ts
// Se mantiene por compatibilidad pero se recomienda usar los tipos de api.ts

export type { Treatment } from './api';

export interface UpcomingDose {
  treatment_id: number;
  med_name: string;
  dosage: string;
  time: string;
  frequency: string;
}
