import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDayExercises,
  deriveProgress,
  getNextTrainingDayKey,
  getSetsPerExercise,
  getTrainingDays,
  normalizeExerciseStates,
  rebuildExerciseStates,
  updateExerciseState
} from './program.js';
import { PROGRAMS_BY_ID } from './programs/index.js';
import { buildDefaultState, exportCsv, loadState, saveState } from './storage.js';
import { createSessionId, formatDuration, formatWeight, todayISO } from './utils.js';
import { mergeState } from './sync.js';

const PROFILE_VIEW = 'profiles';

function buildSession({ dayKey, weekNumber, setsPerExercise, exercises }) {
  return {
    id: createSessionId(),
    date: todayISO(),
    dayKey,
    weekNumber,
    setsPerExercise,
    exercises: exercises.map((exercise) => ({ ...exercise, sets: [] })),
    startedAt: Date.now()
  };
}

function getLatestSession(sessions) {
  if (!sessions?.length) return null;
  return sessions.reduce((latest, session) => {
    if (!latest) return session;
    return session.date >= latest.date ? session : latest;
  }, null);
}

export default function App() {
  const [state, setState] = useState(loadState());
  const [activeSession, setActiveSession] = useState(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [setInProgress, setSetInProgress] = useState(false);
  const [setElapsed, setSetElapsed] = useState(0);
  const [repSelection, setRepSelection] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('settings');
  const [view, setView] = useState(
    state.activeProfileId ? 'today' : PROFILE_VIEW
  );
  const [infoExercise, setInfoExercise] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [lastSyncLabel, setLastSyncLabel] = useState('');
  const [syncError, setSyncError] = useState(null);
  const restPrevRef = useRef(0);
  const audioCtxRef = useRef(null);
  const restEndAtRef = useRef(null);
  const setStartAtRef = useRef(null);
  const syncPullRef = useRef(0);
  const skipNextPushRef = useRef(false);
  const stateRef = useRef(state);

  function ensureAudioContext() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        return ctx.resume().then(() => ctx).catch(() => ctx);
      }
      return Promise.resolve(ctx);
    } catch (error) {
      console.error('Audio init failed', error);
      return Promise.resolve(null);
    }
  }

  function playBeep() {
    try {
      void ensureAudioContext().then((ctx) => {
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.15;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
      });
    } catch (error) {
      console.error('Beep failed', error);
    }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  const activeProfileId = state.activeProfileId;
  const activeProfile = activeProfileId ? state.profiles?.[activeProfileId] : null;
  const profileConfig = activeProfileId
    ? PROGRAMS_BY_ID[activeProfile?.programId ?? activeProfileId]
    : null;
  const program = profileConfig?.program ?? null;
  const programTitle =
    profileConfig?.shortTitle ?? profileConfig?.title ?? 'Upper-Body Strength';
  const trainingDays = getTrainingDays(program);
  const dayOptions = trainingDays;
  const profileReady = !!(activeProfile && program);
  const sanitizedExerciseStates = useMemo(() => {
    if (!profileReady) return {};
    const normalized = normalizeExerciseStates(program, activeProfile.exerciseStates);
    return rebuildExerciseStates(program, activeProfile.sessions ?? [], normalized);
  }, [profileReady, program, activeProfile?.exerciseStates, activeProfile?.sessions]);

  const lastSession = getLatestSession(activeProfile?.sessions);
  const hasSessionToday = lastSession?.date === todayISO();
  const progress = activeProfile
    ? deriveProgress(activeProfile.sessions ?? [], trainingDays)
    : {};
  const lastCompletedDayKey = progress.lastCompletedDayKey ?? lastSession?.dayKey ?? null;
  const dayKey = lastCompletedDayKey
    ? getNextTrainingDayKey(program, lastCompletedDayKey)
    : trainingDays[0];
  const weekNumber = progress.currentWeekNumber ?? 1;
  const plannedDayKey = selectedDayKey ?? dayKey;
  const nextUpDayKey = lastCompletedDayKey
    ? getNextTrainingDayKey(program, lastCompletedDayKey)
    : trainingDays[0];
  const syncBaseUrl = (state.settings.syncUrl ?? '').trim().replace(/\/$/, '');

  useEffect(() => {
    if (state.settings.syncUrl) return;
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') return;
    const host = window.location.hostname;
    if (!host) return;
    const defaultSyncUrl = window.location.origin;
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        syncUrl: defaultSyncUrl
      }
    }));
  }, [state.settings.syncUrl]);

  const todayExercises = useMemo(() => {
    if (!profileReady || !plannedDayKey) return [];
    return buildDayExercises({
      program,
      dayKey: plannedDayKey,
      weekNumber,
      exerciseStates: sanitizedExerciseStates,
      history: activeProfile.sessions,
      bodyweightKg: activeProfile.settings.bodyweightKg
    });
  }, [
    profileReady,
    program,
    plannedDayKey,
    weekNumber,
    sanitizedExerciseStates,
    activeProfile?.sessions,
    activeProfile?.settings?.bodyweightKg
  ]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!profileReady && view !== PROFILE_VIEW) {
      setView(PROFILE_VIEW);
    }
  }, [profileReady, view]);

  useEffect(() => {
    if (!lastSyncAt) return;
    const label = new Date(lastSyncAt).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    setLastSyncLabel(label);
  }, [lastSyncAt]);

  useEffect(() => {
    if (!profileReady || !activeProfileId) return;
    const serializedCurrent = JSON.stringify(activeProfile.exerciseStates ?? {});
    const serializedNext = JSON.stringify(sanitizedExerciseStates ?? {});
    if (serializedCurrent === serializedNext) return;
    setState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [activeProfileId]: {
          ...prev.profiles[activeProfileId],
          exerciseStates: sanitizedExerciseStates
        }
      }
    }));
  }, [
    profileReady,
    activeProfileId,
    activeProfile?.exerciseStates,
    sanitizedExerciseStates
  ]);

  const pullSync = async (force = false) => {
    if (!syncBaseUrl || activeSession) return;
    const now = Date.now();
    if (!force && now - syncPullRef.current < 15000) return;
    syncPullRef.current = now;
    try {
      setSyncError(null);
      const response = await fetch(`${syncBaseUrl}/sync/state?t=${Date.now()}`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`Sync pull failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.state) return;
      setState((prev) => {
        const remoteState = data.state;
        const remoteUpdated = remoteState?.updatedAt ?? 0;
        const localUpdated = prev?.updatedAt ?? 0;
        if (remoteUpdated > localUpdated) {
          return mergeState(remoteState, remoteState);
        }
        return mergeState(prev, remoteState);
      });
      setLastSyncAt(Date.now());
      return data.state;
    } catch (error) {
      setSyncError(error.message ?? 'Sync pull failed');
    }
    return null;
  };

  const pushSync = async (stateSnapshot) => {
    if (!syncBaseUrl || !stateSnapshot) return null;
    try {
      setSyncError(null);
      const response = await fetch(`${syncBaseUrl}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: stateSnapshot.deviceId,
          state: { ...stateSnapshot, updatedAt: Date.now() }
        })
      });
      if (!response.ok) {
        throw new Error(`Sync push failed: ${response.status}`);
      }
      const data = await response.json();
      if (data?.state) {
        setState((prev) => mergeState(prev, data.state));
      }
      setLastSyncAt(Date.now());
      return data?.state ?? null;
    } catch (error) {
      setSyncError(error.message ?? 'Sync push failed');
      return null;
    }
  };

  const forcePullSync = async () => {
    if (!syncBaseUrl) {
      alert('Sync failed: No Sync URL set in settings');
      return;
    }
    try {
      setSyncError(null);
      const response = await fetch(`${syncBaseUrl}/sync/state?t=${Date.now()}`, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Sync pull failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.state) return;
      skipNextPushRef.current = true;
      setState(mergeState(data.state, data.state));
      setLastSyncAt(Date.now());
      alert('Sync success: Data loaded from server');
    } catch (error) {
      setSyncError(error.message ?? 'Sync pull failed');
      alert(`Sync failed: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!syncBaseUrl) {
      setSyncError(null);
      return;
    }
    void (async () => {
      if (skipNextPushRef.current) {
        skipNextPushRef.current = false;
        return;
      }
      const remoteState = await pullSync(true);
      const localState = stateRef.current;
      if (!remoteState || !activeProfileId || !localState) return;
      const localProfile = localState.profiles?.[activeProfileId];
      const remoteProfile = remoteState.profiles?.[activeProfileId];
      const localSessions = localProfile?.sessions ?? [];
      const remoteSessions = remoteProfile?.sessions ?? [];
      const localLatest = localSessions.length
        ? localSessions[localSessions.length - 1].date
        : '';
      const remoteLatest = remoteSessions.length
        ? remoteSessions[remoteSessions.length - 1].date
        : '';
      const shouldPush =
        localSessions.length > remoteSessions.length || localLatest > remoteLatest;
      if (shouldPush) {
        await pushSync(localState);
      }
    })();
  }, [syncBaseUrl, activeProfileId]);

  useEffect(() => {
    if (!activeSession) return undefined;
    const timer = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return undefined;
    const timer = setInterval(() => {
      if (setStartAtRef.current) {
        setSetElapsed(Math.floor((Date.now() - setStartAtRef.current) / 1000));
      }
      if (restEndAtRef.current) {
        const remaining = Math.max(
          0,
          Math.ceil((restEndAtRef.current - Date.now()) / 1000)
        );
        setRestRemaining(remaining);
        if (remaining === 0) {
          restEndAtRef.current = null;
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    const handleVisibility = () => {
      if (setStartAtRef.current) {
        setSetElapsed(Math.floor((Date.now() - setStartAtRef.current) / 1000));
      }
      if (restEndAtRef.current) {
        const remaining = Math.max(
          0,
          Math.ceil((restEndAtRef.current - Date.now()) / 1000)
        );
        setRestRemaining(remaining);
        if (remaining === 0) {
          restEndAtRef.current = null;
        }
      }
      if (!document.hidden) {
        void pullSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (restPrevRef.current > 0 && restRemaining === 0) {
      vibrate([200, 100, 200]);
      playBeep();
    }
    restPrevRef.current = restRemaining;
  }, [restRemaining]);

  const setsPerExercise = activeSession?.setsPerExercise ?? getSetsPerExercise(weekNumber);

  const currentExercise = activeSession
    ? activeSession.exercises.find(
        (exercise) => exercise.sets.length < setsPerExercise
      )
    : null;

  const nextExercise = activeSession
    ? activeSession.exercises
        .filter((exercise) => exercise.sets.length < setsPerExercise)
        .slice(1, 2)[0]
    : null;

  const currentSetIndex = currentExercise ? currentExercise.sets.length + 1 : 0;
  const currentExerciseIndex = currentExercise
    ? activeSession.exercises.findIndex((exercise) => exercise.id === currentExercise.id)
    : -1;
  const showAchievedReps = currentExercise
    ? setInProgress || currentExercise.sets.length > 0
    : false;

  useEffect(() => {
    if (!currentExercise) return;
    setRepSelection(currentExercise.targetReps);
  }, [currentExercise?.id, currentExercise?.targetReps]);

  useEffect(() => {
    setSelectedDayKey(null);
  }, [dayKey]);

  const exerciseDisplayWeight = (exercise) => {
    if (!exercise.usesBodyweight) return formatWeight(exercise.weightKg);
    const total = exercise.bodyweightKg + exercise.weightKg;
    return `${exercise.bodyweightKg.toFixed(1)} kg BW + ${exercise.weightKg.toFixed(
      1
    )} kg = ${total.toFixed(1)} kg`;
  };

  const buildWeightOptions = (exercise) => {
    const step = exercise.incrementKg || 1.25;
    const base = Number(exercise.weightKg.toFixed(1));
    const maxWeightKg = exercise.maxWeightKg ?? Infinity;
    const options = [];
    for (let i = -4; i <= 4; i += 1) {
      const value = Number((base + i * step).toFixed(1));
      if (value >= 0 && value <= maxWeightKg) options.push(value);
    }
    return Array.from(new Set(options)).sort((a, b) => a - b);
  };

  function handleStartDay() {
    if (!profileReady) return;
    void ensureAudioContext();
    const exercises = todayExercises;
    const session = buildSession({
      dayKey: plannedDayKey,
      weekNumber,
      setsPerExercise,
      exercises
    });
    setActiveSession(session);
    setSessionElapsed(0);
    setView('workout');
    restEndAtRef.current = null;
    setStartAtRef.current = null;
    setRestRemaining(0);
    setSetElapsed(0);
    setSetInProgress(false);
  }

  function handleStartSet() {
    if (!currentExercise) return;
    void ensureAudioContext();
    restEndAtRef.current = null;
    setRestRemaining(0);
    setStartAtRef.current = Date.now();
    setSetElapsed(0);
    setSetInProgress(true);
    setRepSelection(currentExercise.targetReps);
  }

  function handleCompleteSet() {
    if (!currentExercise || !setInProgress) return;
    void ensureAudioContext();
    const updatedSession = {
      ...activeSession,
      exercises: activeSession.exercises.map((exercise) => {
        if (exercise.id !== currentExercise.id) return exercise;
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            { reps: Number(repSelection), durationSec: setElapsed }
          ]
        };
      })
    };

    setActiveSession(updatedSession);
    setSetInProgress(false);
    setSetElapsed(0);
    setStartAtRef.current = null;
    const restSeconds = activeProfile?.settings?.restSeconds ?? 0;
    setRestRemaining(restSeconds);
    restEndAtRef.current = Date.now() + restSeconds * 1000;
    vibrate(100);
  }

  function handleFinishDay() {
    if (!activeSession || !activeProfile) return;

    let nextProfile = activeProfile;
    const exercisesWithSummary = activeSession.exercises.map((exercise) => {
      const success = exercise.sets.every((set) => set.reps >= exercise.targetReps);
      const nextStates = updateExerciseState(nextProfile.exerciseStates, exercise);
      nextProfile = { ...nextProfile, exerciseStates: nextStates };
      return { ...exercise, success };
    });

    const sessionRecord = {
      id: activeSession.id,
      date: activeSession.date,
      dayKey: activeSession.dayKey,
      weekNumber: activeSession.weekNumber,
      setsPerExercise: activeSession.setsPerExercise,
      exercises: exercisesWithSummary
    };

    const previousProgress = nextProfile.progress ?? {};
    const previousWeekNumber =
      previousProgress.currentWeekNumber ?? sessionRecord.weekNumber ?? 1;
    const previousCompletedDays = Array.isArray(previousProgress.completedDays)
      ? previousProgress.completedDays
      : [];
    const resetCompletedDays =
      previousProgress.currentWeekNumber &&
      previousProgress.currentWeekNumber !== sessionRecord.weekNumber;
    const completedDaySet = new Set(resetCompletedDays ? [] : previousCompletedDays);

    if (trainingDays.includes(sessionRecord.dayKey)) {
      completedDaySet.add(sessionRecord.dayKey);
    }

    let nextWeekNumber = previousWeekNumber;
    let nextCompletedDays = Array.from(completedDaySet);
    if (completedDaySet.size >= trainingDays.length) {
      nextWeekNumber = previousWeekNumber + 1;
      nextCompletedDays = [];
    }

    const updatedProfile = {
      ...nextProfile,
      sessions: [...nextProfile.sessions, sessionRecord],
      progress: {
        lastCompletedDate: sessionRecord.date,
        lastCompletedDayKey: sessionRecord.dayKey,
        lastCompletedWeekNumber: sessionRecord.weekNumber,
        currentWeekNumber: nextWeekNumber,
        completedDays: nextCompletedDays
      }
    };

    const nextState = {
      ...state,
      profiles: {
        ...state.profiles,
        [activeProfileId]: updatedProfile
      }
    };

    setState(nextState);
    setActiveSession(null);
    setRestRemaining(0);
    setSessionElapsed(0);
    setView('today');
    restEndAtRef.current = null;
    setStartAtRef.current = null;

    if (syncBaseUrl) {
      void pushSync(nextState);
    }
  }

  function handleResetData() {
    if (!window.confirm('Reset all data? This clears history and resets weights.')) return;
    const defaults = buildDefaultState();
    if (!activeProfileId) {
      setState(defaults);
    } else {
      setState((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [activeProfileId]: defaults.profiles[activeProfileId]
        }
      }));
    }
    setActiveSession(null);
    setRestRemaining(0);
    setSetInProgress(false);
    setSetElapsed(0);
    setSessionElapsed(0);
    setInfoExercise(null);
    setView('today');
    setShowSettings(false);
    setSelectedDayKey(null);
  }

  function handleSettingsChange(key, value) {
    if (key === 'syncUrl') {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value
        }
      }));
      return;
    }
    if (!activeProfileId) return;
    setState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [activeProfileId]: {
          ...prev.profiles[activeProfileId],
          settings: {
            ...prev.profiles[activeProfileId].settings,
            [key]: value
          }
        }
      }
    }));
  }

  function handleStartDateChange(value) {
    if (!activeProfileId) return;
    setState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [activeProfileId]: {
          ...prev.profiles[activeProfileId],
          programStartDate: value
        }
      }
    }));
  }

  function updateExerciseSettings(exerciseId, updates) {
    if (!activeProfileId) return;
    setState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [activeProfileId]: {
          ...prev.profiles[activeProfileId],
          exerciseStates: {
            ...prev.profiles[activeProfileId].exerciseStates,
            [exerciseId]: {
              ...prev.profiles[activeProfileId].exerciseStates[exerciseId],
              ...updates
            }
          }
        }
      }
    }));

    if (activeSession) {
      setActiveSession((prevSession) => ({
        ...prevSession,
        exercises: prevSession.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...updates } : exercise
        )
      }));
    }
  }

  const restProgress =
    activeProfile?.settings?.restSeconds > 0
      ? Math.min(1, restRemaining / activeProfile.settings.restSeconds)
      : 0;
  const restColor = restProgress > 0.66 ? '#3ccf7d' : restProgress > 0.33 ? '#f2b880' : '#e4572e';

  const restLabel = restRemaining > 0 ? formatDuration(restRemaining) : 'Ready';

  const sessionStatusByDate = useMemo(() => {
    const sessions = activeProfile?.sessions ?? [];
    const statusMap = new Map();
    sessions.forEach((session) => {
      const date = session.date;
      if (!date) return;
      const exercises = session.exercises ?? [];
      const success = exercises.length
        ? exercises.every((exercise) =>
            (exercise.sets ?? []).every((set) => set.reps >= exercise.targetReps)
          )
        : false;
      statusMap.set(date, {
        dayKey: session.dayKey,
        success
      });
    });
    return statusMap;
  }, [activeProfile?.sessions]);

  const calendarMonths = useMemo(() => {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [current, previous];
  }, []);

  const formatLocalISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildCalendarGrid = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dayOffset = i - startDay + 1;
      let date;
      let inMonth = true;
      if (dayOffset < 1) {
        const day = daysInPrevMonth + dayOffset;
        date = new Date(year, month - 1, day);
        inMonth = false;
      } else if (dayOffset > daysInMonth) {
        const day = dayOffset - daysInMonth;
        date = new Date(year, month + 1, day);
        inMonth = false;
      } else {
        date = new Date(year, month, dayOffset);
      }
      const iso = formatLocalISO(date);
      const status = sessionStatusByDate.get(iso) ?? null;
      cells.push({
        date,
        iso,
        inMonth,
        status
      });
    }
    return cells;
  };

  return (
    <div className={`app ${view === 'workout' ? 'workout' : ''}`}>
      <header className="header">
        <div className="header-title-row">
          <div>
            <p className="eyebrow">Progressive Overload</p>
            <h1>{programTitle}</h1>
          </div>
          <button
            className="menu-button"
            type="button"
            aria-label="Open settings"
            onClick={() => {
              setSettingsTab('settings');
              setShowSettings(true);
            }}
          >
            ⋯
          </button>
        </div>
        {view !== 'workout' && profileReady && (
          <div className="header-meta">
            <div>
              <span>Profile</span>
              <select
                className="profile-select-header"
                value={activeProfileId}
                onChange={(event) => {
                  const nextProfileId = event.target.value;
                  setState((prev) => ({
                    ...prev,
                    activeProfileId: nextProfileId
                  }));
                  setSelectedDayKey(null);
                  setActiveSession(null);
                  setView('today');
                }}
                aria-label="Select profile"
              >
                {Object.values(state.profiles ?? {}).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>Today</span>
              <select
                className="day-select"
                value={plannedDayKey}
                onChange={(event) => setSelectedDayKey(event.target.value)}
                aria-label="Select training day"
              >
                {dayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {view === PROFILE_VIEW && (
        <section className="panel profile-panel">
          <h2>Select Profile</h2>
          <label className="profile-label" htmlFor="profileSelect">
            Profile
          </label>
          <select
            id="profileSelect"
            className="profile-select"
            value={activeProfileId ?? ''}
            onChange={(event) => {
              const nextProfileId = event.target.value;
              setState((prev) => ({
                ...prev,
                activeProfileId: nextProfileId
              }));
              setSelectedDayKey(null);
              setActiveSession(null);
              setView('today');
            }}
          >
            {Object.values(state.profiles ?? {}).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {view === 'today' && profileReady && (
        <section className="panel today-panel">
          <h2>Today&apos;s Exercises</h2>
          <div className="exercise-grid">
            {todayExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className={`exercise-card exercise-slot-${(index % 3) + 1}`}
              >
                <h3>{exercise.name}</h3>
                <p>{exerciseDisplayWeight(exercise)}</p>
                <p>
                  Target: {setsPerExercise} x {exercise.targetReps}
                </p>
              </div>
            ))}
          </div>
          {!activeSession && (
            <button className="primary start-day" onClick={handleStartDay}>
              Start Day
            </button>
          )}
        </section>
      )}

      {view === 'workout' && profileReady && (
        <section className="panel session">
          <div className="session-header">
            <h2>Workout</h2>
            <div className="timer-row">
              <div className="session-timers">
                <div>
                  <span>Session</span>
                  <strong>{formatDuration(sessionElapsed)}</strong>
                </div>
                <div>
                  <span>Rest</span>
                  <strong>{restLabel}</strong>
                </div>
                <div>
                  <span>Set</span>
                  <strong>{formatDuration(setElapsed)}</strong>
                </div>
              </div>
              <div className={`rest-bar ${restRemaining > 0 ? 'active' : ''}`}>
                <div
                  className="rest-bar-fill"
                  style={{ height: `${restProgress * 100}%`, background: restColor }}
                />
              </div>
            </div>
          </div>

          {activeSession && currentExercise && (
            <div
              className={`current-exercise focus-screen exercise-slot-${
                (currentExerciseIndex % 3) + 1
              }`}
            >
              <div
                key={currentExercise.id}
                className={`focus-header slide-header exercise-slot-${
                  (currentExerciseIndex % 3) + 1
                }`}
              >
                <div>
                  <span>Exercise</span>
                  <strong>
                    {currentExerciseIndex + 1}
                    /{activeSession.exercises.length}
                  </strong>
                </div>
                <div>
                  <span>Set</span>
                  <strong>
                    {currentSetIndex}/{setsPerExercise}
                  </strong>
                </div>
              </div>

              <div className="exercise-title-row">
                <p className="exercise-name">{currentExercise.name}</p>
                <button
                  className="info-button"
                  type="button"
                  onClick={() => setInfoExercise(currentExercise)}
                >
                  Tips
                </button>
              </div>
              <div className="metric-stack">
                <div className="metric-block">
                  <span className="metric-label">Weight</span>
                  {currentExercise.incrementKg > 0 ? (
                    <select
                      className="metric-select metric-select-weight"
                      value={currentExercise.weightKg.toFixed(1)}
                      onChange={(event) => {
                        const nextWeight = Number(event.target.value);
                        updateExerciseSettings(currentExercise.id, { weightKg: nextWeight });
                      }}
                      aria-label="Adjust weight"
                    >
                      {buildWeightOptions(currentExercise).map((value) => (
                        <option key={value} value={value.toFixed(1)}>
                          {currentExercise.usesBodyweight
                            ? `${currentExercise.bodyweightKg.toFixed(1)} kg BW + ${value.toFixed(
                                1
                              )} kg = ${(currentExercise.bodyweightKg + value).toFixed(1)} kg`
                            : formatWeight(value)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="big-weight">{exerciseDisplayWeight(currentExercise)}</p>
                  )}
                </div>
                <div className="metric-block">
                  <div className={`metric-label-row ${showAchievedReps ? 'dual' : ''}`}>
                    {showAchievedReps ? (
                      <>
                        <span className="metric-label">Target reps</span>
                        <span className="metric-label">Achieved reps</span>
                      </>
                    ) : (
                      <span className="metric-label">Target reps</span>
                    )}
                  </div>
                  {showAchievedReps ? (
                    <div className="metric-dual">
                      <select
                        className="metric-select metric-select-reps"
                        value={currentExercise.targetReps}
                        disabled
                        aria-label="Target reps"
                      >
                        <option value={currentExercise.targetReps}>
                          {currentExercise.targetReps}
                        </option>
                      </select>
                      <select
                        className="metric-select metric-select-reps"
                        value={repSelection}
                        onChange={(event) => setRepSelection(Number(event.target.value))}
                        aria-label="Set achieved reps"
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 1).map((rep) => (
                          <option key={rep} value={rep}>
                            {rep}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : currentExercise.incrementKg > 0 ? (
                    <select
                      className="metric-select metric-select-reps"
                      value={currentExercise.targetReps}
                      onChange={(event) => {
                        const nextReps = Number(event.target.value);
                        updateExerciseSettings(currentExercise.id, { targetReps: nextReps });
                        setRepSelection(nextReps);
                      }}
                      aria-label="Adjust target reps"
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 3).map((rep) => (
                        <option key={rep} value={rep}>
                          {rep}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="metric-select metric-select-reps"
                      value={currentExercise.targetReps}
                      disabled
                      aria-label="Target reps"
                    >
                      <option value={currentExercise.targetReps}>
                        {currentExercise.targetReps}
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div className="session-actions">
                <button
                  className={`workout-button start ${!setInProgress ? 'active' : 'inactive'}`}
                  onClick={handleStartSet}
                  disabled={setInProgress}
                >
                  Start Set
                </button>
                <button
                  className={`workout-button finish ${setInProgress ? 'active' : 'inactive'}`}
                  onClick={handleCompleteSet}
                  disabled={!setInProgress}
                >
                  Finish Set
                </button>
              </div>
            </div>
          )}

          {activeSession && !currentExercise && (
            <div className="current-exercise focus-screen">
              <h3>All sets complete</h3>
              <button className="primary" onClick={handleFinishDay}>
                Finish Day
              </button>
            </div>
          )}

          {activeSession && nextExercise && (
            <div
              className={`next-exercise compact exercise-slot-${
                (activeSession.exercises.findIndex((ex) => ex.id === nextExercise.id) % 3) + 1
              }`}
            >
              <p className="next-line">
                Next: {nextExercise.name} • {exerciseDisplayWeight(nextExercise)} • Target{' '}
                {nextExercise.targetReps}
              </p>
            </div>
          )}
        </section>
      )}

      {showSettings && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSettings(false)}
        >
          <div className="modal settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{settingsTab === 'history' ? 'History' : 'Settings'}</h2>
              <button
                className="modal-close"
                type="button"
                aria-label="Close settings"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-tabs">
              <button
                type="button"
                className={settingsTab === 'settings' ? 'active' : ''}
                onClick={() => setSettingsTab('settings')}
              >
                Settings
              </button>
              <button
                type="button"
                className={settingsTab === 'history' ? 'active' : ''}
                onClick={() => setSettingsTab('history')}
              >
                History
              </button>
            </div>
            <div className="modal-body settings-body">
              {settingsTab === 'settings' ? (
                <>
                  <div className="settings-card">
                    <h3>Profile</h3>
                    {profileReady ? (
                      <div className="settings-meta">
                        <div>
                          <span className="settings-meta-label">Name</span>
                          <strong>{activeProfile.name}</strong>
                        </div>
                        <div>
                          <span className="settings-meta-label">Program</span>
                          <strong>{programTitle}</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="muted">Select a profile to edit settings.</p>
                    )}
                  </div>

                  <div className="settings-card">
                    <h3>Basics</h3>
                    <div className="settings-grid">
                      <div>
                        <label htmlFor="bodyweight">Bodyweight (kg)</label>
                        <input
                          id="bodyweight"
                          type="number"
                          step="0.1"
                          value={activeProfile?.settings?.bodyweightKg ?? ''}
                          onChange={(event) =>
                            handleSettingsChange('bodyweightKg', Number(event.target.value))
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="rest">Rest timer</label>
                        <select
                          id="rest"
                          value={activeProfile?.settings?.restSeconds ?? 90}
                          onChange={(event) =>
                            handleSettingsChange('restSeconds', Number(event.target.value))
                          }
                        >
                          <option value={90}>90 seconds</option>
                          <option value={120}>120 seconds</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="startDate">Program start date</label>
                        <input
                          id="startDate"
                          type="date"
                          value={activeProfile?.programStartDate ?? ''}
                          onChange={(event) => handleStartDateChange(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>Sync</h3>
                    <div className="settings-grid">
                      <div>
                        <label htmlFor="syncUrl">Sync server URL</label>
                        <input
                          id="syncUrl"
                          type="url"
                          placeholder="http://100.64.0.1:8787"
                          value={state.settings.syncUrl}
                          onChange={(event) =>
                            handleSettingsChange('syncUrl', event.target.value)
                          }
                        />
                      </div>
                    </div>
                    {(lastSyncAt || syncError) && (
                      <div className="settings-inline-status">
                        {lastSyncAt && (
                          <p className="muted">
                            Last sync: {lastSyncLabel || '...'}
                          </p>
                        )}
                        {syncError && <p className="muted">Sync issue: {syncError}</p>}
                      </div>
                    )}
                  </div>

                  <div className="settings-card">
                    <h3>Training</h3>
                    {profileReady ? (
                      <div className="settings-training">
                        <p className="muted">Cycle: {trainingDays.join(' → ')}</p>
                        <p className="muted">
                          Last completed: {lastCompletedDayKey ?? '—'}{' '}
                          {hasSessionToday ? '(completed)' : ''}
                        </p>
                        <p className="muted">
                          Next up: {nextUpDayKey ?? '—'}
                        </p>
                      </div>
                    ) : (
                      <p className="muted">Select a profile to view the training plan.</p>
                    )}
                  </div>

                  <div className="settings-card">
                    <h3>Actions</h3>
                    <div className="settings-actions-row">
                      <button
                        className="secondary"
                        onClick={() => exportCsv(activeProfile?.sessions ?? [])}
                      >
                        Export CSV
                      </button>
                      <button className="secondary" onClick={forcePullSync}>
                        Force Pull From Server
                      </button>
                      {activeSession && (
                        <button
                          className="primary"
                          onClick={() => {
                            handleFinishDay();
                            setShowSettings(false);
                          }}
                        >
                          Finish Day
                        </button>
                      )}
                      <button className="danger" onClick={handleResetData}>
                        Reset All Data
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="history-panel">
                  <div className="history-legend">
                    <div>
                      <span className="legend-chip pass" />
                      <span>Pass</span>
                    </div>
                    <div>
                      <span className="legend-chip fail" />
                      <span>Miss</span>
                    </div>
                    <div>
                      <span className="legend-chip none" />
                      <span>No session</span>
                    </div>
                  </div>
                  <div className="history-months">
                    {calendarMonths.map((monthDate) => {
                      const monthLabel = monthDate.toLocaleString(undefined, {
                        month: 'long',
                        year: 'numeric'
                      });
                      const cells = buildCalendarGrid(monthDate);
                      return (
                        <div key={monthLabel} className="calendar-card">
                          <div className="calendar-header">{monthLabel}</div>
                          <div className="calendar-weekdays">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
                              <span key={day}>{day}</span>
                            ))}
                          </div>
                          <div className="calendar-grid">
                            {cells.map((cell) => (
                              <div
                                key={cell.iso}
                                className={`calendar-cell ${cell.inMonth ? '' : 'muted'}`}
                              >
                                <span className="calendar-day">{cell.date.getDate()}</span>
                                {cell.status && (
                                  <span
                                    className={`calendar-badge ${
                                      cell.status.success ? 'pass' : 'fail'
                                    }`}
                                  >
                                    {cell.status.dayKey}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {infoExercise && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal fullscreen">
            <div className="modal-header">
              <h2>{infoExercise.name}</h2>
              <button
                className="secondary"
                type="button"
                onClick={() => setInfoExercise(null)}
              >
                Close
              </button>
            </div>
            <div className="modal-body">
              {infoExercise.description || 'No notes yet.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
