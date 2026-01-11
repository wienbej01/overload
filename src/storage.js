import {
  createInitialExerciseState,
  dedupeSessionsByDay,
  deriveProgress,
  getTrainingDays,
  normalizeExerciseStates,
  rebuildExerciseStates
} from './program.js';
import { PROGRAM_PROFILES, PROGRAMS_BY_ID } from './programs/index.js';
import { createDeviceId, createSessionId, kgToLb, todayISO } from './utils.js';

const STORAGE_KEY = 'overload_state_v1';

function buildLegacySessionId(session) {
  const exerciseIds = (session.exercises ?? []).map((exercise) => exercise.id).join('-');
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

function defaultProfileSettings(profileConfig) {
  return {
    bodyweightKg: 105,
    restSeconds: 90,
    ...(profileConfig?.defaultSettings ?? {})
  };
}

function buildProfileState(profileId, overrides = {}) {
  const profileConfig = PROGRAMS_BY_ID[profileId];
  const program = profileConfig?.program;
  const trainingDays = getTrainingDays(program);
  const base = {
    id: profileId,
    name: profileConfig?.name ?? profileId,
    programId: profileId,
    programStartDate: todayISO(),
    settings: defaultProfileSettings(profileConfig),
    exerciseStates: createInitialExerciseState(program),
    sessions: [],
    progress: deriveProgress([], trainingDays)
  };

  const sessions = dedupeSessionsByDay(
    ensureSessionIds(overrides.sessions ?? base.sessions)
  );
  const progress = deriveProgress(sessions, trainingDays);

  const normalizedStates = normalizeExerciseStates(program, {
    ...base.exerciseStates,
    ...overrides.exerciseStates
  });
  const rebuiltStates = rebuildExerciseStates(program, sessions, normalizedStates);

  return {
    ...base,
    ...overrides,
    settings: { ...base.settings, ...overrides.settings },
    exerciseStates: rebuiltStates,
    sessions,
    progress
  };
}

export function buildDefaultState() {
  const profiles = PROGRAM_PROFILES.reduce((acc, profile) => {
    acc[profile.id] = buildProfileState(profile.id);
    return acc;
  }, {});

  return {
    deviceId: createDeviceId(),
    settings: {
      syncUrl: ''
    },
    activeProfileId: 'jacob',
    profiles,
    updatedAt: Date.now()
  };
}

function migrateLegacyState(parsed) {
  const defaults = buildDefaultState();
  const jacobProfile = buildProfileState('jacob', {
    programStartDate: parsed.programStartDate ?? defaults.profiles.jacob.programStartDate,
    settings: {
      bodyweightKg: parsed.settings?.bodyweightKg ?? defaults.profiles.jacob.settings.bodyweightKg,
      restSeconds: parsed.settings?.restSeconds ?? defaults.profiles.jacob.settings.restSeconds
    },
    exerciseStates: parsed.exerciseStates ?? defaults.profiles.jacob.exerciseStates,
    sessions: parsed.sessions ?? []
  });

  return {
    ...defaults,
    deviceId: parsed.deviceId ?? defaults.deviceId,
    settings: {
      ...defaults.settings,
      syncUrl: parsed.settings?.syncUrl ?? defaults.settings.syncUrl
    },
    activeProfileId: 'jacob',
    profiles: {
      ...defaults.profiles,
      jacob: jacobProfile
    },
    updatedAt: parsed.updatedAt ?? defaults.updatedAt
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);

    if (!parsed.profiles) {
      return migrateLegacyState(parsed);
    }

    const defaults = buildDefaultState();
    const profiles = { ...defaults.profiles };
    Object.keys(profiles).forEach((profileId) => {
      profiles[profileId] = buildProfileState(profileId, parsed.profiles?.[profileId]);
    });

    return {
      ...defaults,
      ...parsed,
      deviceId: parsed.deviceId ?? defaults.deviceId,
      settings: { ...defaults.settings, ...parsed.settings },
      activeProfileId: parsed.activeProfileId ?? defaults.activeProfileId,
      profiles,
      updatedAt: parsed.updatedAt ?? defaults.updatedAt
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return buildDefaultState();
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
