import { roundTo } from './utils.js';

export function getWeekNumber(startDate, date = new Date()) {
  const start = new Date(startDate);
  const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function getExerciseCount(weekNumber) {
  if (weekNumber <= 4) return 3;
  if (weekNumber <= 8) return 4;
  if (weekNumber <= 12) return 5;
  return 6;
}

export function getSetsPerExercise(weekNumber) {
  if (weekNumber <= 4) return 3;
  if (weekNumber <= 8) return 4;
  if (weekNumber <= 12) return 5;
  return 6;
}

export function getTrainingDays(program) {
  return program?.trainingDays ?? [];
}

export function getNextTrainingDayKey(program, currentDayKey) {
  const trainingDays = getTrainingDays(program);
  const index = trainingDays.indexOf(currentDayKey);
  if (index === -1) return trainingDays[0] ?? null;
  return trainingDays[(index + 1) % trainingDays.length];
}

export function createInitialExerciseState(program) {
  const state = {};
  const library = program?.exerciseLibrary ?? {};
  for (const exercise of Object.values(library)) {
    state[exercise.id] = {
      weightKg: roundTo(exercise.startWeightKg, 0.25),
      targetReps: exercise.fixedTargetReps ?? 5,
      failStreak: 0
    };
  }
  return state;
}

export function normalizeExerciseStates(program, exerciseStates) {
  const normalized = createInitialExerciseState(program);
  if (!exerciseStates) return normalized;
  const library = program?.exerciseLibrary ?? {};

  Object.entries(exerciseStates).forEach(([id, state]) => {
    if (!normalized[id]) return;
    const fallback = normalized[id];
    const rawWeight = Number(state?.weightKg);
    let weightKg = Number.isFinite(rawWeight) ? rawWeight : fallback.weightKg;
    if (weightKg > 1000) {
      weightKg = roundTo(weightKg / 1000, 0.25);
    }
    const maxWeight = library[id]?.maxWeightKg;
    if (maxWeight && weightKg > maxWeight) {
      weightKg = maxWeight;
    }

    const rawTarget = Number(state?.targetReps);
    const targetReps = Number.isFinite(rawTarget) ? rawTarget : fallback.targetReps;
    const rawFail = Number(state?.failStreak);
    const failStreak = Number.isFinite(rawFail) ? rawFail : 0;

    normalized[id] = {
      weightKg,
      targetReps,
      failStreak
    };
  });

  return normalized;
}

export function evaluatePullupTransition(history, bodyweightKg) {
  const pulldownSessions = history
    .filter((session) => session.exercises.some((ex) => ex.id === 'lat_pulldown'))
    .flatMap((session) => session.exercises.filter((ex) => ex.id === 'lat_pulldown'));

  const recent = pulldownSessions.slice(-4);
  const successes = recent.filter((ex) => ex.success && ex.targetReps === 7);
  const averageWeight = successes.length
    ? successes.reduce((sum, ex) => sum + ex.weightKg, 0) / successes.length
    : 0;

  const readyForNegatives = successes.length >= 2 && averageWeight >= bodyweightKg * 0.8;
  const readyForPullup = successes.length >= 3 && averageWeight >= bodyweightKg * 1.0;

  return {
    readyForNegatives,
    readyForPullup
  };
}

export function buildDayExercises({
  program,
  dayKey,
  weekNumber,
  exerciseStates,
  history,
  bodyweightKg
}) {
  if (!program || !dayKey) return [];

  const template = program.dayTemplates?.[dayKey] || [];
  const count = dayKey === 'Mobility' ? template.length : getExerciseCount(weekNumber);

  const { readyForNegatives, readyForPullup } = evaluatePullupTransition(
    history,
    bodyweightKg
  );

  const base = template
    .slice(0, count)
    .map((id) => {
      const definition = program.exerciseLibrary?.[id];
      return buildExercise(definition, exerciseStates, bodyweightKg);
    })
    .filter(Boolean);

  const updated = base.map((exercise) => {
    if (exercise.id === 'lat_pulldown' && readyForPullup) {
      return buildExercise(program.exerciseLibrary?.pullup, exerciseStates, bodyweightKg);
    }
    return exercise;
  });

  if (readyForNegatives && dayKey.startsWith('Pull')) {
    const hasNegatives = updated.some((exercise) => exercise.id === 'pullup_negative');
    if (!hasNegatives) {
      updated.push(
        buildExercise(program.exerciseLibrary?.pullup_negative, exerciseStates, bodyweightKg)
      );
    }
  }

  return updated;
}

export function deriveProgress(sessions, trainingDays) {
  if (!sessions?.length || !trainingDays?.length) {
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
    trainingDays.includes(session.dayKey)
  );
  const requiredDays = trainingDays.filter((day) => day !== 'Mobility');

  let currentWeekNumber = 1;
  let completedDays = new Set();
  let lastCompletedWeekNumber = null;

  trainingSessions.forEach((session) => {
    lastCompletedWeekNumber = currentWeekNumber;
    if (requiredDays.includes(session.dayKey)) {
      completedDays.add(session.dayKey);
    }
    if (completedDays.size >= requiredDays.length) {
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

function sessionSetCount(session) {
  return (session.exercises ?? []).reduce(
    (total, exercise) => total + (exercise.sets?.length ?? 0),
    0
  );
}

export function dedupeSessionsByDay(sessions = []) {
  const map = new Map();
  sessions.forEach((session) => {
    const key = `${session.date}|${session.dayKey}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, session);
      return;
    }
    const existingSets = sessionSetCount(existing);
    const incomingSets = sessionSetCount(session);
    if (incomingSets !== existingSets) {
      map.set(key, incomingSets > existingSets ? session : existing);
      return;
    }
    const existingExercises = existing.exercises?.length ?? 0;
    const incomingExercises = session.exercises?.length ?? 0;
    if (incomingExercises !== existingExercises) {
      map.set(key, incomingExercises > existingExercises ? session : existing);
      return;
    }
    if (session.startedAt && existing.startedAt) {
      map.set(key, session.startedAt >= existing.startedAt ? session : existing);
      return;
    }
    map.set(key, session);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function updateExerciseState(exerciseStates, exerciseSession) {
  const { id, targetReps, incrementKg, sets } = exerciseSession;
  const isFixed = incrementKg === 0;
  if (isFixed) return exerciseStates;

  const current = exerciseStates[id] || {
    weightKg: exerciseSession.weightKg,
    targetReps,
    failStreak: 0
  };
  const sessionWeight = Number.isFinite(exerciseSession.weightKg)
    ? exerciseSession.weightKg
    : current.weightKg;
  const sessionTarget = Number.isFinite(targetReps) ? targetReps : current.targetReps;
  const success = sets.every((set) => set.reps >= sessionTarget);
  const maxWeightKg = exerciseSession.maxWeightKg ?? null;

  let nextTarget = sessionTarget;
  const baseWeight = maxWeightKg ? Math.min(sessionWeight, maxWeightKg) : sessionWeight;
  let nextWeight = baseWeight;
  let nextFailStreak = current.failStreak ?? 0;
  const deloadFactor = 0.95;

  if (success) {
    nextFailStreak = 0;
    if (sessionTarget < 7) {
      nextTarget = sessionTarget + 1;
    } else {
      const candidateWeight = baseWeight + incrementKg;
      if (maxWeightKg && candidateWeight > maxWeightKg) {
        nextTarget = sessionTarget;
        nextWeight = baseWeight;
      } else {
        nextTarget = 5;
        nextWeight = candidateWeight;
      }
    }
  } else {
    nextFailStreak += 1;
    if (nextFailStreak >= 2) {
      nextTarget = 5;
      nextWeight = roundTo(baseWeight * deloadFactor, 0.25);
      nextFailStreak = 0;
    }
  }

  return {
    ...exerciseStates,
    [id]: {
      weightKg: Number(nextWeight.toFixed(2)),
      targetReps: nextTarget,
      failStreak: nextFailStreak
    }
  };
}

export function rebuildExerciseStates(program, sessions, baseStates) {
  const initialStates = normalizeExerciseStates(
    program,
    baseStates ?? createInitialExerciseState(program)
  );
  Object.values(initialStates).forEach((state) => {
    state.failStreak = 0;
  });
  if (!sessions?.length) return initialStates;

  const orderedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  let exerciseStates = { ...initialStates };

  orderedSessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exerciseStates = updateExerciseState(exerciseStates, exercise);
    });
  });

  return exerciseStates;
}

function buildExercise(definition, exerciseStates, bodyweightKg) {
  if (!definition) return null;

  const state = exerciseStates[definition.id] || {
    weightKg: definition.startWeightKg,
    targetReps: definition.fixedTargetReps ?? 5
  };

  const weightKg = definition.usesBodyweight
    ? state.weightKg
    : roundTo(state.weightKg, 0.25);

  const targetReps = definition.fixedTargetReps ?? state.targetReps;
  const cappedWeight = definition.maxWeightKg
    ? Math.min(weightKg, definition.maxWeightKg)
    : weightKg;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? '',
    type: definition.type,
    usesBodyweight: !!definition.usesBodyweight,
    incrementKg: definition.incrementKg,
    weightKg: cappedWeight,
    bodyweightKg,
    targetReps,
    maxWeightKg: definition.maxWeightKg ?? null
  };
}
