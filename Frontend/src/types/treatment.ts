export interface Treatment {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  active: boolean;
}

export interface UpcomingDose {
  treatment_id: number;
  med_name: string;
  dosage: string;
  time: string;
  frequency: string;
  status: 'PENDING' | 'MISSED';
  acknowledged: boolean;
}
