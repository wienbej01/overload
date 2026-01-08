import { roundTo } from './utils.js';

export const CYCLE = ['Push A', 'Pull A', 'Mobility', 'Push B', 'Pull B', 'Rest', 'Rest'];

export const EXERCISE_LIBRARY = {
  squat: {
    id: 'squat',
    name: 'Back Squat',
    description: 'Set bar on upper back (not neck). Feet shoulder-width with slight toe out. Big breath and brace, sit hips back and down between heels. Keep chest proud, knees track over toes. Descend under control, then drive up through mid-foot while keeping the bar over the mid-foot.',
    incrementKg: 5,
    startWeightKg: 94.0,
    type: 'barbell'
  },
  bench: {
    id: 'bench',
    name: 'Bench Press',
    description: 'Lie with eyes under bar. Pin shoulder blades down and back, feet planted. Grip slightly wider than shoulders. Lower bar to mid‑chest with elbows about 45° from torso. Pause lightly, then press up and back toward the rack while keeping the chest up.',
    incrementKg: 2.5,
    startWeightKg: 62.0,
    type: 'barbell'
  },
  overhead_press: {
    id: 'overhead_press',
    name: 'Overhead Press',
    description: 'Hands just outside shoulders, wrists stacked. Squeeze glutes and ribs down. Press bar straight up, move head slightly back, then push head through at the top. Lower under control to upper chest.',
    incrementKg: 2.5,
    startWeightKg: 32.0,
    type: 'barbell'
  },
  floor_press: {
    id: 'floor_press',
    name: 'Floor Press (DB)',
    description: 'Upper arms rest on the floor each rep, press dumbbells with control, stop short of bouncing elbows.',
    incrementKg: 2.0,
    startWeightKg: 24.0,
    type: 'dumbbell'
  },
  incline_db_press: {
    id: 'incline_db_press',
    name: 'Incline DB Press',
    description: 'Set bench at 20–30°. Pull shoulder blades back and down. Start dumbbells over chest, lower to upper chest line with elbows at 45°, then press up and slightly back, staying controlled.',
    incrementKg: 2.0,
    startWeightKg: 24.0,
    type: 'dumbbell'
  },
  smith_incline_press: {
    id: 'smith_incline_press',
    name: 'Smith Incline Press',
    description: 'Bench at 20–30°, keep wrists stacked, bar path to upper chest, drive up smoothly.',
    incrementKg: 2.5,
    startWeightKg: 50.0,
    type: 'smith'
  },
  close_grip_bench: {
    id: 'close_grip_bench',
    name: 'Close-Grip Bench Press',
    description: 'Hands just inside shoulder width. Keep elbows tucked, lower bar to lower chest, then press up without flaring elbows. Keep shoulder blades pinned and feet planted.',
    incrementKg: 2.5,
    startWeightKg: 60.0,
    type: 'barbell'
  },
  skullcrusher: {
    id: 'skullcrusher',
    name: 'Skullcrusher',
    description: 'Elbows stay still, lower bar toward forehead, extend hard without letting elbows flare.',
    incrementKg: 1.25,
    startWeightKg: 20.8,
    type: 'barbell'
  },
  tricep_pushdown: {
    id: 'tricep_pushdown',
    name: 'Tricep Pushdown',
    description: 'Elbows pinned to ribs, press down fully, slow return with control.',
    incrementKg: 1.25,
    startWeightKg: 12.0,
    type: 'cable'
  },
  cable_lateral_raise: {
    id: 'cable_lateral_raise',
    name: 'Cable Lateral Raise',
    description: 'Stand with cable behind you, slight lean. Keep a soft elbow and raise to shoulder height with pinky slightly up. Pause, then lower slowly to keep tension.',
    incrementKg: 1.25,
    startWeightKg: 6.0,
    type: 'cable'
  },
  leg_press: {
    id: 'leg_press',
    name: 'Leg Press',
    description: 'Feet shoulder-width, toes slightly out. Lower sled until knees are near 90° while keeping heels down. Drive through mid‑foot/heel, don’t lock knees hard at the top.',
    incrementKg: 5,
    startWeightKg: 140.0,
    type: 'machine'
  },
  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    description: 'Bar over mid‑foot, shins close. Grip just outside legs. Brace hard, lift chest, then push the floor away. Keep bar close to legs, stand tall with glutes. Lower by hinging hips back, then bend knees.',
    incrementKg: 5,
    startWeightKg: 80.0,
    type: 'barbell'
  },
  romanian_deadlift: {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    description: 'Soft knees, hinge hips back, bar stays close to legs, feel hamstrings, stand tall at top.',
    incrementKg: 5,
    startWeightKg: 70.0,
    type: 'barbell'
  },
  lat_pulldown: {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    description: 'Sit tall with chest up. Pull bar to upper chest, elbows down and back. Avoid swinging. Control the return fully to stretch lats.',
    incrementKg: 2.5,
    startWeightKg: 28.0,
    type: 'machine'
  },
  seated_row: {
    id: 'seated_row',
    name: 'Seated Row',
    description: 'Neutral spine, pull handle to mid‑torso, squeeze shoulder blades, controlled return.',
    incrementKg: 2.5,
    startWeightKg: 50.0,
    type: 'machine'
  },
  dumbbell_row: {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    description: 'One knee/hand on bench, back flat. Pull elbow toward hip, squeeze back. Avoid twisting torso. Lower with control.',
    incrementKg: 2.0,
    startWeightKg: 26.0,
    type: 'dumbbell'
  },
  cable_row: {
    id: 'cable_row',
    name: 'Cable Row (Single Arm)',
    description: 'Set cable at mid‑torso height. Brace on the bench or rack, pull elbow toward hip, squeeze back, control the return.',
    incrementKg: 2.5,
    startWeightKg: 30.0,
    type: 'cable'
  },
  face_pull: {
    id: 'face_pull',
    name: 'Face Pull (Rope)',
    description: 'Set cable at upper chest height. Pull rope to nose/eyes, elbows high and out. Squeeze rear delts, slow return.',
    incrementKg: 2.5,
    startWeightKg: 20.0,
    type: 'cable'
  },
  preacher_curl: {
    id: 'preacher_curl',
    name: 'Preacher Curl',
    description: 'Upper arms fixed, curl without shoulder swing, full extension with control.',
    incrementKg: 1.25,
    startWeightKg: 20.0,
    type: 'machine'
  },
  hammer_curl: {
    id: 'hammer_curl',
    name: 'Hammer Curl (DB)',
    description: 'Neutral grip, elbows at sides. Curl without swinging. Pause briefly at top, lower slowly.',
    incrementKg: 1.25,
    startWeightKg: 18.0,
    type: 'dumbbell'
  },
  overhead_cable_extension: {
    id: 'overhead_cable_extension',
    name: 'Overhead Cable Extension',
    description: 'Elbows in, extend fully, keep ribcage down, slow return.',
    incrementKg: 1.25,
    startWeightKg: 14.0,
    type: 'cable'
  },
  pullup: {
    id: 'pullup',
    name: 'Pull-up',
    description: 'Grip just outside shoulders. Start from a dead hang, brace core, pull chest to bar. Lower slowly to full hang.',
    incrementKg: 1.25,
    startWeightKg: 0,
    type: 'bodyweight',
    usesBodyweight: true
  },
  pullup_negative: {
    id: 'pullup_negative',
    name: 'Pull-up Negative',
    description: 'Jump or step to top, lower slowly for 3–5 seconds, stay tight.',
    incrementKg: 0,
    startWeightKg: 0,
    type: 'bodyweight',
    usesBodyweight: true,
    fixedTargetReps: 3
  },
  mobility_hips: {
    id: 'mobility_hips',
    name: 'Hip Mobility Flow',
    description: 'Slow, controlled hip circles and openers. Breathe and stay smooth.',
    incrementKg: 0,
    startWeightKg: 0,
    type: 'mobility',
    fixedTargetReps: 8
  },
  mobility_shoulders: {
    id: 'mobility_shoulders',
    name: 'Shoulder CARs',
    description: 'Controlled shoulder rotations with full range and no momentum.',
    incrementKg: 0,
    startWeightKg: 0,
    type: 'mobility',
    fixedTargetReps: 6
  },
  mobility_core: {
    id: 'mobility_core',
    name: 'Dead Bug',
    description: 'Low back stays down, extend opposite arm/leg, slow and controlled.',
    incrementKg: 0,
    startWeightKg: 0,
    type: 'mobility',
    fixedTargetReps: 10
  }
};

export const DAY_TEMPLATES = {
  'Push A': [
    'squat',
    'bench',
    'overhead_press',
    'incline_db_press',
    'cable_lateral_raise',
    'tricep_pushdown'
  ],
  'Push B': [
    'leg_press',
    'close_grip_bench',
    'smith_incline_press',
    'overhead_press',
    'cable_lateral_raise',
    'skullcrusher',
    'tricep_pushdown'
  ],
  'Pull A': [
    'deadlift',
    'lat_pulldown',
    'cable_row',
    'seated_row',
    'face_pull',
    'preacher_curl'
  ],
  'Pull B': [
    'deadlift',
    'lat_pulldown',
    'seated_row',
    'cable_row',
    'face_pull',
    'hammer_curl'
  ],
  Mobility: ['mobility_hips', 'mobility_shoulders', 'mobility_core'],
  Rest: []
};

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

export function getCycleIndex(startDate, date = new Date()) {
  const start = new Date(startDate);
  const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 7) + 7) % 7;
  return index;
}

export function getDayKey(startDate, date = new Date()) {
  const index = getCycleIndex(startDate, date);
  return CYCLE[index];
}

export function getDayKeyFromIndex(index) {
  return CYCLE[((index % 7) + 7) % 7];
}

export function getNextDayKey(currentDayKey) {
  const index = CYCLE.indexOf(currentDayKey);
  const nextIndex = index === -1 ? 0 : index + 1;
  return getDayKeyFromIndex(nextIndex);
}

export function createInitialExerciseState() {
  const state = {};
  for (const exercise of Object.values(EXERCISE_LIBRARY)) {
    state[exercise.id] = {
      weightKg: roundTo(exercise.startWeightKg, 0.25),
      targetReps: exercise.fixedTargetReps ?? 5
    };
  }
  return state;
}

export function evaluatePullupTransition(history, bodyweightKg) {
  const pulldownSessions = history
    .filter((session) => session.exercises.some((ex) => ex.id === 'lat_pulldown'))
    .flatMap((session) =>
      session.exercises.filter((ex) => ex.id === 'lat_pulldown')
    );

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
  dayKey,
  weekNumber,
  exerciseStates,
  history,
  bodyweightKg
}) {
  if (dayKey === 'Rest') return [];

  const template = DAY_TEMPLATES[dayKey] || [];
  const count = dayKey === 'Mobility' ? template.length : getExerciseCount(weekNumber);

  const { readyForNegatives, readyForPullup } = evaluatePullupTransition(
    history,
    bodyweightKg
  );

  const base = template.slice(0, count).map((id) => {
    const definition = EXERCISE_LIBRARY[id];
    return buildExercise(definition, exerciseStates, bodyweightKg);
  });

  const updated = base.map((exercise) => {
    if (exercise.id === 'lat_pulldown' && readyForPullup) {
      return buildExercise(EXERCISE_LIBRARY.pullup, exerciseStates, bodyweightKg);
    }
    return exercise;
  });

  if (readyForNegatives && dayKey.startsWith('Pull')) {
    const hasNegatives = updated.some((exercise) => exercise.id === 'pullup_negative');
    if (!hasNegatives) {
      updated.push(buildExercise(EXERCISE_LIBRARY.pullup_negative, exerciseStates, bodyweightKg));
    }
  }

  return updated;
}

function buildExercise(definition, exerciseStates, bodyweightKg) {
  const state = exerciseStates[definition.id] || {
    weightKg: definition.startWeightKg,
    targetReps: definition.fixedTargetReps ?? 5
  };

  const weightKg = definition.usesBodyweight
    ? state.weightKg
    : roundTo(state.weightKg, 0.25);

  const targetReps = definition.fixedTargetReps ?? state.targetReps;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? '',
    type: definition.type,
    usesBodyweight: !!definition.usesBodyweight,
    incrementKg: definition.incrementKg,
    weightKg,
    bodyweightKg,
    targetReps
  };
}
