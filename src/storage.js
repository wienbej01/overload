import { buildDayExercises, createInitialExerciseState, TRAINING_DAYS } from './program.js';
import { createDeviceId, createSessionId, kgToLb, todayISO } from './utils.js';

const STORAGE_KEY = 'overload_state_v1';
const SETS_PER_EXERCISE = 3;

function isoDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function buildSeedSessions({ exerciseStates, bodyweightKg }) {
  const seedDays = [
    { dayKey: 'Pull B', date: isoDaysAgo(1) },
    { dayKey: 'Pull A', date: todayISO() }
  ];

  const sessions = [];
  let history = [];

  seedDays.forEach((seed) => {
    const exercises = buildDayExercises({
      dayKey: seed.dayKey,
      weekNumber: 1,
      exerciseStates,
      history,
      bodyweightKg
    });

    const exercisesWithSets = exercises.map((exercise) => ({
      ...exercise,
      sets: Array.from({ length: SETS_PER_EXERCISE }, () => ({
        reps: exercise.targetReps,
        durationSec: 0
      })),
      success: true
    }));

    const session = {
      id: `seed-${seed.date}-${seed.dayKey}`,
      date: seed.date,
      dayKey: seed.dayKey,
      weekNumber: 1,
      exercises: exercisesWithSets
    };

    sessions.push(session);
    history = [...history, session];
  });

  return sessions;
}

function buildLegacySessionId(session) {
  const exerciseIds = (session.exercises ?? [])
    .map((exercise) => exercise.id)
    .join('-');
  return `legacy-${session.date}-${session.dayKey}-${exerciseIds}`;
}

function ensureSessionIds(sessions) {
  let changed = false;
  const next = sessions.map((session) => {
    if (session.id) return session;
    changed = true;
    return {
      ...session,
      id: buildLegacySessionId(session) || createSessionId()
    };
  });
  return changed ? next : sessions;
}

export function buildDefaultState(options = {}) {
  const { seedSessions = false } = options;
  const settings = {
    bodyweightKg: 105,
    restSeconds: 90,
    syncUrl: ''
  };
  const exerciseStates = createInitialExerciseState();
  const sessions = seedSessions
    ? buildSeedSessions({ exerciseStates, bodyweightKg: settings.bodyweightKg })
    : [];
  const progress = sessions.length
    ? deriveProgress(sessions)
    : {
        lastCompletedDate: null,
        lastCompletedDayKey: null,
        lastCompletedWeekNumber: null,
        currentWeekNumber: 1,
        completedDays: []
      };

  return {
    deviceId: createDeviceId(),
    settings,
    programStartDate: todayISO(),
    exerciseStates,
    sessions,
    progress,
    updatedAt: Date.now()
  };
}

function deriveProgress(sessions) {
  if (!sessions?.length) {
    return {
      lastCompletedDate: null,
      lastCompletedDayKey: null,
      lastCompletedWeekNumber: null,
      currentWeekNumber: 1,
      completedDays: []
    };
  }

  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const trainingSessions = sorted.filter((session) =>
    TRAINING_DAYS.includes(session.dayKey)
  );

  let currentWeekNumber = 1;
  let completedDays = new Set();
  let lastCompletedWeekNumber = null;

  trainingSessions.forEach((session) => {
    lastCompletedWeekNumber = currentWeekNumber;
    completedDays.add(session.dayKey);
    if (completedDays.size >= TRAINING_DAYS.length) {
      currentWeekNumber += 1;
      completedDays = new Set();
    }
  });

  const latestTraining = trainingSessions[trainingSessions.length - 1] ?? null;

  return {
    lastCompletedDate: latestTraining?.date ?? null,
    lastCompletedDayKey: latestTraining?.dayKey ?? null,
    lastCompletedWeekNumber,
    currentWeekNumber,
    completedDays: Array.from(completedDays)
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState({ seedSessions: true });
    const parsed = JSON.parse(raw);
    const defaults = buildDefaultState();
    const settings = { ...defaults.settings, ...parsed.settings };
    const exerciseStates = { ...defaults.exerciseStates, ...parsed.exerciseStates };
    let sessions = parsed.sessions ?? defaults.sessions;

    if (!sessions.length) {
      sessions = buildSeedSessions({
        exerciseStates,
        bodyweightKg: settings.bodyweightKg
      });
    }
    sessions = ensureSessionIds(sessions);

    const progress = sessions.length
      ? deriveProgress(sessions)
      : { ...defaults.progress, ...parsed.progress };

    return {
      ...defaults,
      ...parsed,
      deviceId: parsed.deviceId ?? defaults.deviceId,
      settings,
      exerciseStates,
      sessions,
      progress,
      updatedAt: parsed.updatedAt ?? defaults.updatedAt
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return buildDefaultState({ seedSessions: true });
  }
}

export function saveState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      updatedAt: Date.now()
    })
  );
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
