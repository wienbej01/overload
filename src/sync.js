import {
  createInitialExerciseState,
  dedupeSessionsByDay,
  deriveProgress,
  getTrainingDays,
  normalizeExerciseStates,
  rebuildExerciseStates
} from './program.js';
import { PROGRAMS_BY_ID, PROGRAM_PROFILES } from './programs/index.js';

function buildLegacySessionId(session) {
  const exerciseIds = (session.exercises ?? []).map((exercise) => exercise.id).join('-');
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

function latestSessionDate(sessions) {
  if (!sessions?.length) return '';
  return sessions.reduce((latest, session) =>
    session.date > latest ? session.date : latest, ''
  );
}

function defaultProfileSettings() {
  return {
    bodyweightKg: 105,
    restSeconds: 90
  };
}

function buildProfileFallback(profileId, overrides = {}) {
  const profileConfig = PROGRAMS_BY_ID[profileId];
  const program = profileConfig?.program;
  const trainingDays = getTrainingDays(program);
  const base = {
    id: profileId,
    name: profileConfig?.name ?? profileId,
    programId: profileId,
    programStartDate: overrides.programStartDate,
    settings: defaultProfileSettings(),
    exerciseStates: createInitialExerciseState(program),
    sessions: [],
    progress: deriveProgress([], trainingDays)
  };
  const sessions = overrides.sessions ?? base.sessions;
  const progress = deriveProgress(sessions, trainingDays);

  return {
    ...base,
    ...overrides,
    settings: { ...base.settings, ...overrides.settings },
    exerciseStates: { ...base.exerciseStates, ...overrides.exerciseStates },
    sessions,
    progress
  };
}

function normalizeState(state) {
  if (!state) return null;
  if (state.profiles) return state;

  const defaults = PROGRAM_PROFILES.reduce((acc, profile) => {
    acc[profile.id] = buildProfileFallback(profile.id);
    return acc;
  }, {});

  const jacobProfile = buildProfileFallback('jacob', {
    programStartDate: state.programStartDate,
    settings: state.settings,
    exerciseStates: state.exerciseStates,
    sessions: state.sessions
  });

  return {
    deviceId: state.deviceId,
    settings: {
      syncUrl: state.settings?.syncUrl ?? ''
    },
    activeProfileId: 'jacob',
    profiles: {
      ...defaults,
      jacob: jacobProfile
    },
    updatedAt: state.updatedAt
  };
}

function mergeProfile(localProfile, remoteProfile, program) {
  if (!localProfile && !remoteProfile) return null;

  const localSessions = localProfile?.sessions ?? [];
  const remoteSessions = remoteProfile?.sessions ?? [];
  const mergedSessions = dedupeSessionsByDay(
    mergeSessions(localSessions, remoteSessions)
  );
  const localLatest = latestSessionDate(localSessions);
  const remoteLatest = latestSessionDate(remoteSessions);
  const preferRemote =
    remoteSessions.length > localSessions.length || remoteLatest > localLatest;

  const settings = preferRemote
    ? { ...localProfile?.settings, ...remoteProfile?.settings }
    : { ...remoteProfile?.settings, ...localProfile?.settings };
  const exerciseStates = preferRemote
    ? { ...localProfile?.exerciseStates, ...remoteProfile?.exerciseStates }
    : { ...remoteProfile?.exerciseStates, ...localProfile?.exerciseStates };
  const trainingDays = getTrainingDays(program);

  const normalizedStates = normalizeExerciseStates(program, exerciseStates);
  const rebuiltExerciseStates = rebuildExerciseStates(program, mergedSessions, normalizedStates);

  return {
    ...(localProfile ?? {}),
    ...(remoteProfile ?? {}),
    id: localProfile?.id ?? remoteProfile?.id,
    name: localProfile?.name ?? remoteProfile?.name,
    programId: localProfile?.programId ?? remoteProfile?.programId,
    programStartDate: preferRemote
      ? remoteProfile?.programStartDate ?? localProfile?.programStartDate
      : localProfile?.programStartDate ?? remoteProfile?.programStartDate,
    settings,
    exerciseStates: rebuiltExerciseStates,
    sessions: mergedSessions,
    progress: deriveProgress(mergedSessions, trainingDays)
  };
}

export function mergeState(localState, remoteState) {
  const normalizedLocal = normalizeState(localState);
  const normalizedRemote = normalizeState(remoteState);
  if (!normalizedLocal && !normalizedRemote) return null;
  if (!normalizedLocal) {
    const profiles = normalizedRemote.profiles ?? {};
    const mergedProfiles = {};
    Object.keys(profiles).forEach((profileId) => {
      const program = PROGRAMS_BY_ID[profileId]?.program;
      mergedProfiles[profileId] = mergeProfile(null, profiles[profileId], program);
    });
    return {
      ...normalizedRemote,
      profiles: mergedProfiles
    };
  }
  if (!normalizedRemote) {
    const profiles = normalizedLocal.profiles ?? {};
    const mergedProfiles = {};
    Object.keys(profiles).forEach((profileId) => {
      const program = PROGRAMS_BY_ID[profileId]?.program;
      mergedProfiles[profileId] = mergeProfile(profiles[profileId], null, program);
    });
    return {
      ...normalizedLocal,
      profiles: mergedProfiles
    };
  }

  const localProfiles = normalizedLocal.profiles ?? {};
  const remoteProfiles = normalizedRemote.profiles ?? {};
  const profileIds = new Set([
    ...Object.keys(localProfiles),
    ...Object.keys(remoteProfiles)
  ]);

  const mergedProfiles = {};
  profileIds.forEach((profileId) => {
    const program = PROGRAMS_BY_ID[profileId]?.program;
    mergedProfiles[profileId] = mergeProfile(
      localProfiles[profileId],
      remoteProfiles[profileId],
      program
    );
  });

  return {
    ...normalizedLocal,
    ...normalizedRemote,
    deviceId: normalizedLocal.deviceId ?? normalizedRemote.deviceId,
    settings: {
      ...normalizedRemote.settings,
      ...normalizedLocal.settings,
      syncUrl: normalizedLocal.settings?.syncUrl ?? normalizedRemote.settings?.syncUrl
    },
    activeProfileId: normalizedLocal.activeProfileId ?? normalizedRemote.activeProfileId,
    profiles: mergedProfiles,
    updatedAt: Math.max(
      normalizedLocal.updatedAt ?? 0,
      normalizedRemote.updatedAt ?? 0,
      Date.now()
    )
  };
}
