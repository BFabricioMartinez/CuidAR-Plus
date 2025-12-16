import { useState, useCallback, useEffect } from 'react';
import { statisticsApi, patientsApi, treatmentsApi, intakesApi, assignmentsApi, usersApi, ApiError } from '../../api';
import type { OverviewStats, Patient, Treatment, IntakeLog, Assignment, User } from '../../api';

// ============================================
// TIPOS
// ============================================

export interface PatientAdherence {
  patient_id: number;
  patient_name: string;
  summary: {
    taken_count: number;
    missed_count: number;
    total_count: number;
    adherence_percentage: number | null;
  };
}

export interface AdherenceTrend {
  date: string;
  taken: number;
  missed: number;
  total: number;
  adherence_percentage: number;
}

export interface DosesByHour {
  hour: string;
  taken: number;
  missed: number;
  total: number;
}

export interface TopMedication {
  medication_name: string;
  count: number;
}

export interface CaregiverStats {
  caregiver_id: number;
  caregiver_name: string;
  patient_count: number;
}

// ============================================
// HOOK useAdminDashboard
// ============================================

export const useAdminDashboard = () => {
  // Estados principales
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [patientsAdherence, setPatientsAdherence] = useState<PatientAdherence[]>([]);
  const [adherenceTrend, setAdherenceTrend] = useState<AdherenceTrend[]>([]);
  const [dosesByHour, setDosesByHour] = useState<DosesByHour[]>([]);
  const [topMedications, setTopMedications] = useState<TopMedication[]>([]);
  const [caregiverStats, setCaregiverStats] = useState<CaregiverStats[]>([]);
  const [usersByRole, setUsersByRole] = useState<{ role: string; count: number }[]>([]);
  const [treatmentsStatus, setTreatmentsStatus] = useState<{ active: number; inactive: number }>({ active: 0, inactive: 0 });
  const [topPatients, setTopPatients] = useState<{ best: PatientAdherence[]; worst: PatientAdherence[] }>({ best: [], worst: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Obtener estadísticas generales
  const fetchOverviewStats = useCallback(async () => {
    try {
      const data = await statisticsApi.overview();
      setStats(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar estadísticas');
      }
    }
  }, []);

  // Calcular adherencia por paciente (últimos 7 días)
  const calculatePatientsAdherence = useCallback(async () => {
    try {
      const patientsResponse = await patientsApi.list({
        limit: 100,
        filters: { active: true },
      });

      const patients = patientsResponse.items;
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const adherenceData: PatientAdherence[] = [];

      for (const patient of patients) {
        try {
          // Obtener todos los intakes del paciente de los últimos 7 días
          const intakesResponse = await intakesApi.list({
            limit: 500,
            filters: {
              patient_id: patient.id,
              order: 'desc',
            },
          });

          const recentIntakes = intakesResponse.items.filter((intake: IntakeLog) => {
            if (!intake.taken_at) return false;
            const intakeDate = new Date(intake.taken_at);
            return intakeDate >= sevenDaysAgo;
          });

          const taken = recentIntakes.filter((i: IntakeLog) => i.status === 'taken').length;
          const missed = recentIntakes.filter((i: IntakeLog) => i.status === 'missed').length;
          const total = taken + missed;
          const adherence_percentage = total > 0 ? (taken / total) * 100 : null;

          adherenceData.push({
            patient_id: patient.id,
            patient_name: patient.name,
            summary: {
              taken_count: taken,
              missed_count: missed,
              total_count: total,
              adherence_percentage,
            },
          });
        } catch (err) {
          console.error(`Error calculando adherencia para paciente ${patient.id}:`, err);
        }
      }

      // Ordenar por adherencia
      adherenceData.sort((a, b) => {
        const adhA = a.summary.adherence_percentage || 0;
        const adhB = b.summary.adherence_percentage || 0;
        return adhB - adhA; // Descendente
      });

      setPatientsAdherence(adherenceData);

      // Top 5 mejores y peores
      const best = adherenceData.slice(0, 5);
      const worst = [...adherenceData].reverse().slice(0, 5);
      setTopPatients({ best, worst });
    } catch (err: any) {
      console.error('Error calculando adherencia de pacientes:', err);
    }
  }, []);

  // Calcular tendencia de adherencia (últimos 7 días)
  const calculateAdherenceTrend = useCallback(async () => {
    try {
      const today = new Date();
      const trendData: AdherenceTrend[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Obtener intakes de ese día
        const intakesResponse = await intakesApi.list({
          limit: 1000,
          filters: { order: 'desc' },
        });

        const dayIntakes = intakesResponse.items.filter((intake: IntakeLog) => {
          if (!intake.taken_at) return false;
          const intakeDate = new Date(intake.taken_at);
          return intakeDate >= date && intakeDate < nextDay;
        });

        const taken = dayIntakes.filter((i: IntakeLog) => i.status === 'taken').length;
        const missed = dayIntakes.filter((i: IntakeLog) => i.status === 'missed').length;
        const total = taken + missed;
        const adherence_percentage = total > 0 ? (taken / total) * 100 : 0;

        trendData.push({
          date: date.toISOString().split('T')[0],
          taken,
          missed,
          total,
          adherence_percentage,
        });
      }

      setAdherenceTrend(trendData);
    } catch (err: any) {
      console.error('Error calculando tendencia:', err);
    }
  }, []);

  // Calcular distribución de dosis por hora
  const calculateDosesByHour = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const intakesResponse = await intakesApi.list({
        limit: 1000,
        filters: { order: 'desc' },
      });

      const todayIntakes = intakesResponse.items.filter((intake: IntakeLog) => {
        if (!intake.taken_at) return false;
        const intakeDate = new Date(intake.taken_at);
        return intakeDate >= today && intakeDate < tomorrow;
      });

      const hourMap = new Map<string, { taken: number; missed: number; total: number }>();

      todayIntakes.forEach((intake: IntakeLog) => {
        let hour = '00:00';
        if (intake.scheduled_time) {
          hour = intake.scheduled_time.substring(0, 5); // HH:MM
        } else if (intake.taken_at) {
          const date = new Date(intake.taken_at);
          hour = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }

        if (!hourMap.has(hour)) {
          hourMap.set(hour, { taken: 0, missed: 0, total: 0 });
        }

        const stats = hourMap.get(hour)!;
        stats.total++;
        if (intake.status === 'taken') {
          stats.taken++;
        } else if (intake.status === 'missed') {
          stats.missed++;
        }
      });

      const hoursData: DosesByHour[] = Array.from(hourMap.entries())
        .map(([hour, stats]) => ({
          hour,
          ...stats,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      setDosesByHour(hoursData);
    } catch (err: any) {
      console.error('Error calculando dosis por hora:', err);
    }
  }, []);

  // Calcular medicamentos más prescritos
  const calculateTopMedications = useCallback(async () => {
    try {
      const treatmentsResponse = await treatmentsApi.list({
        limit: 500,
        filters: { active: true },
      });

      const medicationMap = new Map<string, number>();

      treatmentsResponse.items.forEach((treatment: Treatment) => {
        const medName = treatment.medication_name;
        medicationMap.set(medName, (medicationMap.get(medName) || 0) + 1);
      });

      const medications: TopMedication[] = Array.from(medicationMap.entries())
        .map(([medication_name, count]) => ({ medication_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopMedications(medications);
    } catch (err: any) {
      console.error('Error calculando medicamentos:', err);
    }
  }, []);

  // Calcular distribución de pacientes por cuidador
  const calculateCaregiverStats = useCallback(async () => {
    try {
      const assignmentsResponse = await assignmentsApi.getAll();
      const activeAssignments = assignmentsResponse.filter((a: Assignment) => a.active);

      const caregiverMap = new Map<number, { name: string; count: number }>();

      for (const assignment of activeAssignments) {
        if (!caregiverMap.has(assignment.caregiver_id)) {
          try {
            const caregiver = await usersApi.getById(assignment.caregiver_id);
            caregiverMap.set(assignment.caregiver_id, {
              name: caregiver.name || caregiver.email.split('@')[0],
              count: 0,
            });
          } catch {
            caregiverMap.set(assignment.caregiver_id, {
              name: 'Desconocido',
              count: 0,
            });
          }
        }
        const stats = caregiverMap.get(assignment.caregiver_id)!;
        stats.count++;
      }

      const stats: CaregiverStats[] = Array.from(caregiverMap.entries())
        .map(([caregiver_id, data]) => ({
          caregiver_id,
          caregiver_name: data.name,
          patient_count: data.count,
        }))
        .sort((a, b) => b.patient_count - a.patient_count);

      setCaregiverStats(stats);
    } catch (err: any) {
      console.error('Error calculando estadísticas de cuidadores:', err);
    }
  }, []);

  // Calcular usuarios por rol
  const calculateUsersByRole = useCallback(async () => {
    try {
      const roles: ('ADMIN' | 'ASISTENCIAL' | 'PERSONAL')[] = ['ADMIN', 'ASISTENCIAL', 'PERSONAL'];
      const roleCounts: { role: string; count: number }[] = [];

      for (const role of roles) {
        try {
          const users = await usersApi.getByRole(role);
          const activeUsers = users.filter((u: User) => u.active);
          roleCounts.push({ role, count: activeUsers.length });
        } catch (err) {
          console.error(`Error obteniendo usuarios de rol ${role}:`, err);
        }
      }

      setUsersByRole(roleCounts);
    } catch (err: any) {
      console.error('Error calculando usuarios por rol:', err);
    }
  }, []);

  // Calcular estado de tratamientos
  const calculateTreatmentsStatus = useCallback(async () => {
    try {
      const treatmentsResponse = await treatmentsApi.list({
        limit: 1000,
      });

      const active = treatmentsResponse.items.filter((t: Treatment) => t.active).length;
      const inactive = treatmentsResponse.items.filter((t: Treatment) => !t.active).length;

      setTreatmentsStatus({ active, inactive });
    } catch (err: any) {
      console.error('Error calculando estado de tratamientos:', err);
    }
  }, []);

  // Cargar todos los datos del dashboard
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        fetchOverviewStats(),
        calculatePatientsAdherence(),
        calculateAdherenceTrend(),
        calculateDosesByHour(),
        calculateTopMedications(),
        calculateCaregiverStats(),
        calculateUsersByRole(),
        calculateTreatmentsStatus(),
      ]);
    } catch (err: any) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchOverviewStats,
    calculatePatientsAdherence,
    calculateAdherenceTrend,
    calculateDosesByHour,
    calculateTopMedications,
    calculateCaregiverStats,
    calculateUsersByRole,
    calculateTreatmentsStatus,
  ]);

  return {
    // Estados
    stats,
    patientsAdherence,
    adherenceTrend,
    dosesByHour,
    topMedications,
    caregiverStats,
    usersByRole,
    treatmentsStatus,
    topPatients,
    loading,
    error,

    // Funciones
    fetchDashboard,
  };
};
