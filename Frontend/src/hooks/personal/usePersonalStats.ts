import { useState, useCallback } from 'react';

export interface MyStats {
  patient_id?: number;
  patient_name?: string;
  today_doses: {
    taken: number;
    missed: number;
    total: number;
    adherence_percentage: number | null;
  };
}

export const usePersonalStats = () => {
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchStats = useCallback(async (userId: number) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:8000/statistics/my-stats?user_id=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
};
