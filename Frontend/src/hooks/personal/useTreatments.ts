import { useState, useCallback } from 'react';
import type { Treatment, UpcomingDose } from '../../types/treatment';

export const useTreatments = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Parsear horarios desde frecuencia
  const parseTimesFromFrequency = useCallback((frequency: string): string[] => {
    const times: string[] = [];
    const regex = /\b(\d{1,2}):(\d{2})\b/g;
    let match;

    while ((match = regex.exec(frequency)) !== null) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2];
      times.push(`${hour}:${minute}`);
    }

    return [...new Set(times)].sort();
  }, []);

  // Calcular dosis pendientes de hoy
  const calculateUpcomingDoses = useCallback((treatmentsList: Treatment[]) => {
    const doses: UpcomingDose[] = [];

    treatmentsList.forEach((treatment) => {
      const times = parseTimesFromFrequency(treatment.frequency);

      times.forEach((time) => {
        doses.push({
          treatment_id: treatment.id,
          med_name: treatment.medication_name,
          dosage: treatment.dosage,
          time,
          frequency: treatment.frequency,
          status: 'PENDING',
          acknowledged: false,
        });
      });
    });

    // Ordenar por hora
    doses.sort((a, b) => a.time.localeCompare(b.time));
    setUpcomingDoses(doses);
  }, [parseTimesFromFrequency]);

  const fetchTreatments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:8000/treatments/all?active=true',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar tratamientos');
      }

      const data = await response.json();
      setTreatments(data);

      // Calcular dosis pendientes
      calculateUpcomingDoses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tratamientos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateUpcomingDoses]);

  return {
    treatments,
    upcomingDoses,
    loading,
    error,
    fetchTreatments,
  };
};
