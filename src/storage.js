import { createInitialExerciseState } from './program.js';
import { todayISO, kgToLb } from './utils.js';

const STORAGE_KEY = 'overload_state_v1';

export function buildDefaultState() {
  return {
    settings: {
      bodyweightKg: 105,
      restSeconds: 90
    },
    programStartDate: todayISO(),
    exerciseStates: createInitialExerciseState(),
    sessions: [],
    progress: {
      lastCompletedDate: null,
      lastCompletedDayKey: null,
      lastCompletedWeekNumber: null
    }
  };
}

function deriveProgress(sessions) {
  if (!sessions?.length) {
    return {
      lastCompletedDate: null,
      lastCompletedDayKey: null,
      lastCompletedWeekNumber: null
    };
  }

  const latest = sessions.reduce((current, session) => {
    if (!current) return session;
    return session.date >= current.date ? session : current;
  }, null);

  return {
    lastCompletedDate: latest?.date ?? null,
    lastCompletedDayKey: latest?.dayKey ?? null,
    lastCompletedWeekNumber: latest?.weekNumber ?? null
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);
    const defaults = buildDefaultState();
    const sessions = parsed.sessions ?? defaults.sessions;
    const progress = sessions.length
      ? deriveProgress(sessions)
      : { ...defaults.progress, ...parsed.progress };

    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      exerciseStates: { ...defaults.exerciseStates, ...parsed.exerciseStates },
      sessions,
      progress
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return buildDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportCsv(sessions) {
  const header = [
    'date',
    'day',
    'exercise',
    'set_index',
    'target_reps',
    'achieved_reps',
    'weight_kg',
    'weight_lb',
    'bodyweight_kg',
    'set_duration_sec'
  ];

  const rows = [header.join(',')];

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set, index) => {
        rows.push(
          [
            session.date,
            session.dayKey,
            exercise.name,
            index + 1,
            exercise.targetReps,
            set.reps,
            exercise.weightKg.toFixed(2),
            kgToLb(exercise.weightKg).toFixed(2),
            exercise.bodyweightKg?.toFixed(2) ?? '',
            set.durationSec
          ]
            .map((value) => `"${value}"`)
            .join(',')
        );
      });
    });
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `overload-history-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
