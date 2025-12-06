import { useState } from 'react';

export interface TreatmentFormData {
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const initialFormData: TreatmentFormData = {
  medication_name: '',
  dosage: '',
  frequency: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

export const useTreatmentForm = () => {
  const [formData, setFormData] = useState<TreatmentFormData>(initialFormData);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const setFormDataFromTreatment = (treatment: any) => {
    setFormData({
      medication_name: treatment.medication_name,
      dosage: treatment.dosage,
      frequency: treatment.frequency,
      start_date: treatment.start_date,
      end_date: treatment.end_date || '',
      notes: treatment.notes || '',
    });
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  return {
    formData,
    handleInputChange,
    setFormDataFromTreatment,
    resetForm,
  };
};
