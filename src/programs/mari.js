import { BASE_PROGRAM, cloneProgram } from './base.js';

const program = cloneProgram(BASE_PROGRAM);

// Clear default templates to rebuild them
program.dayTemplates = {};

// --- Exercise Library Updates for Mari's Machine-Focus ---

// 1. Leg Press (Machine 10)
// Keeping ID 'leg_press' from base/history
program.exerciseLibrary.leg_press = {
  id: 'leg_press',
  name: 'Leg Press',
  description: 'Feet shoulder-width. Lower until knees are near 90°. Drive through mid-foot. Do not lock knees.',
  incrementKg: 5,
  startWeightKg: 70, // Based on history
  type: 'machine'
};

// 2. Seated Chest Press (Machine 5/6)
// Keeping ID 'chest_press_machine' from history
program.exerciseLibrary.chest_press_machine = {
  id: 'chest_press_machine',
  name: 'Seated Chest Press',
  description: 'Adjust seat so handles are at mid-chest. Press forward, squeeze chest, control return.',
  incrementKg: 2.5,
  startWeightKg: 25, // Based on history
  type: 'machine'
};

// 3. Lat Pulldown (Machine 4)
// Keeping ID 'lat_pulldown'
program.exerciseLibrary.lat_pulldown = {
  id: 'lat_pulldown',
  name: 'Lat Pulldown',
  description: 'Thigh pad tight. Pull bar to upper chest. Squeeze lats. Control up.',
  incrementKg: 2.5,
  startWeightKg: 28, // Based on history
  type: 'machine'
};

// 4. Seated Cable Row (Machine 1 - Dual Pulley)
// Keeping ID 'seated_cable_row'
program.exerciseLibrary.seated_cable_row = {
  id: 'seated_cable_row',
  name: 'Cable Row (Seated/Standing)',
  description: 'Use dual pulley or low pulley. Keep back neutral. Pull elbows past ribs.',
  incrementKg: 2.5,
  startWeightKg: 30, // Based on history
  type: 'cable'
};

// 5. Leg Extension (Machine 8)
program.exerciseLibrary.leg_extension = {
  id: 'leg_extension',
  name: 'Leg Extension',
  description: 'Align knee with pivot. Extend legs fully, squeeze quads. Lower slowly.',
  incrementKg: 2.5,
  startWeightKg: 25,
  type: 'machine'
};

// 6. Seated Leg Curl (Machine 9)
program.exerciseLibrary.seated_leg_curl = {
  id: 'seated_leg_curl',
  name: 'Seated Leg Curl',
  description: 'Align knee with pivot. Clamp thigh pad. Curl heels under, squeeze hamstrings.',
  incrementKg: 2.5,
  startWeightKg: 25,
  type: 'machine'
};

// 7. Back Extension (Machine 7)
program.exerciseLibrary.back_extension = {
  id: 'back_extension',
  name: '45° Back Extension',
  description: 'Hinge at hips, keep back straight. Lower until stretch, pull up with glutes/hams.',
  incrementKg: 0, // Bodyweight start, add plate later
  startWeightKg: 0,
  type: 'bodyweight',
  fixedTargetReps: 12
};

// 8. Triceps Pushdown (Machine 1)
// Keeping ID 'cable_triceps_pressdown'
program.exerciseLibrary.cable_triceps_pressdown = {
  id: 'cable_triceps_pressdown',
  name: 'Triceps Pushdown',
  description: 'Elbows pinned to sides. Push down/out. Squeeze triceps.',
  incrementKg: 1.25,
  startWeightKg: 10,
  type: 'cable',
  fixedTargetReps: 12
};

// 9. Cable Bicep Curl (Machine 1)
program.exerciseLibrary.cable_bicep_curl = {
  id: 'cable_bicep_curl',
  name: 'Cable Bicep Curl',
  description: 'Elbows at sides. Curl handles up toward shoulders. Squeeze.',
  incrementKg: 1.25,
  startWeightKg: 5,
  type: 'cable',
  fixedTargetReps: 12
};

// 10. Cable Lateral Raise (Machine 1)
program.exerciseLibrary.cable_lateral_raise = {
  id: 'cable_lateral_raise',
  name: 'Cable Lateral Raise',
  description: 'Cable low. Raise arm out to side until shoulder height.',
  incrementKg: 1.25,
  startWeightKg: 2.5,
  type: 'cable',
  fixedTargetReps: 12
};

// 11. Face Pull (Machine 1)
// Keeping ID 'cable_face_pull'
program.exerciseLibrary.cable_face_pull = {
  id: 'cable_face_pull',
  name: 'Face Pull',
  description: 'Pull rope to forehead/eyes. Elbows high and wide. External rotation.',
  incrementKg: 1.25,
  startWeightKg: 10,
  type: 'cable',
  fixedTargetReps: 15
};

// 12. Seated Ab Crunch (Machine 2)
program.exerciseLibrary.seated_ab_crunch = {
  id: 'seated_ab_crunch',
  name: 'Seated Ab Crunch',
  description: 'Exhale and crunch forward. Squeeze abs hard.',
  incrementKg: 2.5,
  startWeightKg: 10,
  type: 'machine',
  fixedTargetReps: 15
};

// 13. Decline Sit-up (Machine 3)
program.exerciseLibrary.decline_sit_up = {
  id: 'decline_sit_up',
  name: 'Decline Sit-up',
  description: 'Controlled sit-up. Do not pull on neck.',
  incrementKg: 0,
  startWeightKg: 0,
  type: 'bodyweight',
  fixedTargetReps: 12
};

// 14. Cable Overhead Triceps (Machine 1)
// Keeping ID 'cable_overhead_triceps_extension'
program.exerciseLibrary.cable_overhead_triceps_extension = {
  id: 'cable_overhead_triceps_extension',
  name: 'Cable Overhead Triceps',
  description: 'Face away from machine. Extend arms overhead.',
  incrementKg: 1.25,
  startWeightKg: 10,
  type: 'cable',
  fixedTargetReps: 12
};

// --- Daily Templates (Priority Ordered) ---
// Principle: Max 3 initially. System takes top N based on week.

program.dayTemplates['Push A'] = [
  'leg_press',                  // 1. Legs (Compound)
  'chest_press_machine',        // 2. Chest (Compound)
  'cable_triceps_pressdown',    // 3. Triceps
  'leg_extension',              // 4. Quads (Isolation)
  'cable_lateral_raise',        // 5. Side Delts
  'seated_ab_crunch'            // 6. Abs
];

program.dayTemplates['Pull A'] = [
  'lat_pulldown',               // 1. Back (Vertical Pull)
  'seated_leg_curl',            // 2. Hamstrings
  'cable_bicep_curl',           // 3. Biceps
  'seated_cable_row',           // 4. Back (Horizontal Pull)
  'back_extension',             // 5. Lower Back/Glutes
  'cable_face_pull'             // 6. Rear Delts/Posture
];

program.dayTemplates['Push B'] = [
  'leg_press',                  // 1. Legs
  'chest_press_machine',        // 2. Chest
  'cable_overhead_triceps_extension', // 3. Triceps (Overhead)
  'leg_extension',              // 4. Quads
  'cable_lateral_raise',        // 5. Side Delts
  'decline_sit_up'              // 6. Abs
];

program.dayTemplates['Pull B'] = [
  'seated_cable_row',           // 1. Back (Horizontal)
  'seated_leg_curl',            // 2. Hamstrings
  'lat_pulldown',               // 3. Back (Vertical)
  'cable_bicep_curl',           // 4. Biceps
  'back_extension',             // 5. Lower Back
  'seated_ab_crunch'            // 6. Abs
];

program.dayTemplates['Mobility'] = [
  'mobility_hips',
  'mobility_shoulders',
  'mobility_core'
];

export default {
  id: 'mari',
  name: 'Mari',
  program,
  title: 'Full-Body Toning',
  defaultSettings: {
    bodyweightKg: 65,
    restSeconds: 90
  }
};
