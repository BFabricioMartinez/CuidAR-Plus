import { useState, useCallback } from 'react';

export const useIntakeLogs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const markAsTaken = useCallback(async (
    treatmentId: number,
    time: string,
    userId: number
  ) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:8000/tomas/marcar-tomada?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar dosis');
      }

      setSuccessMessage(`Dosis de las ${time} marcada como tomada ✓`);
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al marcar dosis como tomada');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsMissed = useCallback(async (
    treatmentId: number,
    time: string,
    userId: number
  ) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:8000/tomas/marcar-omitida?treatment_id=${treatmentId}&time=${time}&recorded_by_user_id=${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar dosis');
      }

      setSuccessMessage(`Dosis de las ${time} marcada como omitida`);
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al marcar dosis como omitida');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  return {
    loading,
    error,
    successMessage,
    markAsTaken,
    markAsMissed,
    clearMessages,
  };
};
