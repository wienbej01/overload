import jacob from './jacob.js';
import mari from './mari.js';

export const PROGRAM_PROFILES = [jacob, mari];
export const PROGRAMS_BY_ID = PROGRAM_PROFILES.reduce((acc, profile) => {
  acc[profile.id] = profile;
  return acc;
}, {});
