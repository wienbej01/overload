import { TRAINING_DAYS } from './program.js';

function buildLegacySessionId(session) {
  const exerciseIds = (session.exercises ?? [])
    .map((exercise) => exercise.id)
    .join('-');
  return `legacy-${session.date}-${session.dayKey}-${exerciseIds}`;
}

function getSessionKey(session) {
  return session.id ?? buildLegacySessionId(session);
}

function sessionSetCount(session) {
  return (session.exercises ?? []).reduce(
    (total, exercise) => total + (exercise.sets?.length ?? 0),
    0
  );
}

function pickSession(primary, incoming) {
  if (!primary) return incoming;
  if (!incoming) return primary;

  const primarySets = sessionSetCount(primary);
  const incomingSets = sessionSetCount(incoming);
  if (primarySets !== incomingSets) {
    return incomingSets > primarySets ? incoming : primary;
  }

  const primaryExercises = primary.exercises?.length ?? 0;
  const incomingExercises = incoming.exercises?.length ?? 0;
  if (primaryExercises !== incomingExercises) {
    return incomingExercises > primaryExercises ? incoming : primary;
  }

  return incoming.date >= primary.date ? incoming : primary;
}

export function mergeSessions(localSessions = [], remoteSessions = []) {
  const merged = new Map();
  [...localSessions, ...remoteSessions].forEach((session) => {
    const key = getSessionKey(session);
    const current = merged.get(key);
    const chosen = pickSession(current, session);
    merged.set(key, { ...chosen, id: chosen.id ?? key });
  });

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function deriveProgress(sessions) {
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

export function mergeState(localState, remoteState) {
  if (!localState && !remoteState) return null;
  if (!localState) {
    return {
      ...remoteState,
      progress: deriveProgress(remoteState.sessions ?? [])
    };
  }
  if (!remoteState) {
    return {
      ...localState,
      progress: deriveProgress(localState.sessions ?? [])
    };
  }

  const localSessions = localState.sessions ?? [];
  const remoteSessions = remoteState.sessions ?? [];
  const mergedSessions = mergeSessions(localSessions, remoteSessions);
  const localUpdatedAt = localState.updatedAt ?? 0;
  const remoteUpdatedAt = remoteState.updatedAt ?? 0;
  const preferRemote =
    remoteSessions.length > localSessions.length ||
    (remoteSessions.length === localSessions.length && remoteUpdatedAt > localUpdatedAt);

  const mergedSettings = preferRemote
    ? { ...localState.settings, ...remoteState.settings }
    : { ...remoteState.settings, ...localState.settings };
  const syncUrl = localState.settings?.syncUrl ?? mergedSettings.syncUrl;

  return {
    ...localState,
    ...remoteState,
    deviceId: localState.deviceId ?? remoteState.deviceId,
    settings: {
      ...mergedSettings,
      syncUrl
    },
    exerciseStates: preferRemote
      ? { ...localState.exerciseStates, ...remoteState.exerciseStates }
      : { ...remoteState.exerciseStates, ...localState.exerciseStates },
    programStartDate: preferRemote
      ? remoteState.programStartDate ?? localState.programStartDate
      : localState.programStartDate ?? remoteState.programStartDate,
    sessions: mergedSessions,
    progress: deriveProgress(mergedSessions),
    updatedAt: Math.max(localUpdatedAt, remoteUpdatedAt, Date.now())
  };
}
