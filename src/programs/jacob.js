import { BASE_PROGRAM, cloneProgram } from './base.js';

const program = cloneProgram(BASE_PROGRAM);

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
