import { BASE_PROGRAM, cloneProgram } from './base.js';

const program = cloneProgram(BASE_PROGRAM);

// 1. Add Barbell Row (Alternative to machine row)
program.exerciseLibrary.barbell_row = {
  id: 'barbell_row',
  name: 'Barbell Row',
  description: 'Bend over with hips back (approx 45°). Keep spine neutral. Pull bar to lower chest/upper abs. Squeeze shoulder blades, lower with control.',
  incrementKg: 2.5,
  startWeightKg: 50,
  type: 'barbell'
};

// 2. Replace Seated Row with Barbell Row in Pull days
['Pull A', 'Pull B'].forEach((day) => {
  const template = program.dayTemplates[day];
  const idx = template.indexOf('seated_row');
  if (idx !== -1) template[idx] = 'barbell_row';
});

// 3. Update accessory/isolation exercises for Hypertrophy (Higher Reps)
const hypertrophyUpdates = {
  // Push Accessories
  incline_db_press: { fixedTargetReps: 10 },
  smith_incline_press: { fixedTargetReps: 10, startWeightKg: 35 }, 
  cable_lateral_raise: { fixedTargetReps: 15, startWeightKg: 4 },
  tricep_pushdown: { fixedTargetReps: 12, startWeightKg: 10 },
  skullcrusher: { fixedTargetReps: 12, startWeightKg: 15 },
  
  // Pull Accessories
  face_pull: { fixedTargetReps: 15, startWeightKg: 15 },
  preacher_curl: { fixedTargetReps: 12, startWeightKg: 15 },
  hammer_curl: { fixedTargetReps: 12, startWeightKg: 12 },
  cable_row: { fixedTargetReps: 12, startWeightKg: 20 },
  
  // Legs/Other
  bulgarian_split_squat: { fixedTargetReps: 10, startWeightKg: 16 }
};

Object.entries(hypertrophyUpdates).forEach(([id, settings]) => {
  if (program.exerciseLibrary[id]) {
    Object.assign(program.exerciseLibrary[id], settings);
  }
});

export default {
  id: 'jacob',
  name: 'Jacob',
  program,
  title: 'Upper-Body Strength Cycle',
  shortTitle: 'Upper-Body Strength',
  defaultSettings: {
    bodyweightKg: 105,
    restSeconds: 90
  }
};
