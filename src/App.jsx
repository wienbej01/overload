import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDayExercises,
  getNextTrainingDayKey,
  TRAINING_DAYS
} from './program.js';
import { buildDefaultState, exportCsv, loadState, saveState } from './storage.js';
import { createSessionId, formatDuration, formatWeight, todayISO } from './utils.js';
import { mergeState } from './sync.js';

const SETS_PER_EXERCISE = 3;
const DAY_OPTIONS = TRAINING_DAYS;

function buildSession({ dayKey, weekNumber, exercises }) {
  return {
    id: createSessionId(),
    date: todayISO(),
    dayKey,
    weekNumber,
    exercises: exercises.map((exercise) => ({ ...exercise, sets: [] })),
    startedAt: Date.now()
  };
}

function updateExerciseProgress(state, exerciseSession) {
  const { id, targetReps, incrementKg, sets } = exerciseSession;
  const isFixed = incrementKg === 0;
  if (isFixed) return state;

  const success = sets.every((set) => set.reps >= targetReps);
  const current = state.exerciseStates[id] || {
    weightKg: exerciseSession.weightKg,
    targetReps
  };

  let nextTarget = current.targetReps;
  let nextWeight = current.weightKg;

  if (success) {
    if (current.targetReps < 7) {
      nextTarget = current.targetReps + 1;
    } else {
      nextTarget = 5;
      nextWeight = current.weightKg + incrementKg;
    }
  }

  return {
    ...state,
    exerciseStates: {
      ...state.exerciseStates,
      [id]: {
        weightKg: Number(nextWeight.toFixed(2)),
        targetReps: nextTarget
      }
    }
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
  const [view, setView] = useState('today');
  const [infoExercise, setInfoExercise] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const restPrevRef = useRef(0);
  const audioCtxRef = useRef(null);
  const restEndAtRef = useRef(null);
  const setStartAtRef = useRef(null);

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

  const lastSession = getLatestSession(state.sessions);
  const hasSessionToday = lastSession?.date === todayISO();
  const progress = state.progress ?? {};
  const lastCompletedDayKey = progress.lastCompletedDayKey ?? lastSession?.dayKey ?? null;
  const dayKey = lastCompletedDayKey
    ? getNextTrainingDayKey(lastCompletedDayKey)
    : TRAINING_DAYS[0];
  const weekNumber = progress.currentWeekNumber ?? 1;
  const plannedDayKey = selectedDayKey ?? dayKey;
  const syncBaseUrl = (state.settings.syncUrl ?? '').trim().replace(/\/$/, '');

  useEffect(() => {
    if (state.settings.syncUrl) return;
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') return;
    const host = window.location.hostname;
    if (!host) return;
    const defaultSyncUrl = `${protocol}//${host}:8787`;
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        syncUrl: defaultSyncUrl
      }
    }));
  }, [state.settings.syncUrl]);

  const todayExercises = useMemo(() => {
    return buildDayExercises({
      dayKey: plannedDayKey,
      weekNumber,
      exerciseStates: state.exerciseStates,
      history: state.sessions,
      bodyweightKg: state.settings.bodyweightKg
    });
  }, [
    plannedDayKey,
    weekNumber,
    state.exerciseStates,
    state.sessions,
    state.settings.bodyweightKg
  ]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!syncBaseUrl) {
      setSyncError(null);
      return;
    }
    let cancelled = false;

    const pullSync = async () => {
      try {
        setSyncError(null);
        const response = await fetch(`${syncBaseUrl}/sync/state`, {
          method: 'GET'
        });
        if (!response.ok) {
          throw new Error(`Sync pull failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data?.state || cancelled) return;
        setState((prev) => mergeState(prev, data.state));
        setLastSyncAt(Date.now());
      } catch (error) {
        if (!cancelled) {
          setSyncError(error.message ?? 'Sync pull failed');
        }
      }
    };

    void pullSync();
    return () => {
      cancelled = true;
    };
  }, [syncBaseUrl]);

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

  const currentExercise = activeSession
    ? activeSession.exercises.find((exercise) => exercise.sets.length < SETS_PER_EXERCISE)
    : null;

  const nextExercise = activeSession
    ? activeSession.exercises
        .filter((exercise) => exercise.sets.length < SETS_PER_EXERCISE)
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
    const options = [];
    for (let i = -4; i <= 4; i += 1) {
      const value = Number((base + i * step).toFixed(1));
      if (value >= 0) options.push(value);
    }
    return Array.from(new Set(options)).sort((a, b) => a - b);
  };

  function handleStartDay() {
    if (plannedDayKey === 'Rest') return;
    void ensureAudioContext();
    const exercises = todayExercises;
    const session = buildSession({ dayKey: plannedDayKey, weekNumber, exercises });
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
    const restSeconds = state.settings.restSeconds;
    setRestRemaining(restSeconds);
    restEndAtRef.current = Date.now() + restSeconds * 1000;
    vibrate(100);
  }

  function handleFinishDay() {
    if (!activeSession) return;

    let nextState = state;
    const exercisesWithSummary = activeSession.exercises.map((exercise) => {
      const success = exercise.sets.every((set) => set.reps >= exercise.targetReps);
      nextState = updateExerciseProgress(nextState, exercise);
      return { ...exercise, success };
    });

    const sessionRecord = {
      id: activeSession.id,
      date: activeSession.date,
      dayKey: activeSession.dayKey,
      weekNumber: activeSession.weekNumber,
      exercises: exercisesWithSummary
    };

    const previousProgress = nextState.progress ?? {};
    const previousWeekNumber =
      previousProgress.currentWeekNumber ?? sessionRecord.weekNumber ?? 1;
    const previousCompletedDays = Array.isArray(previousProgress.completedDays)
      ? previousProgress.completedDays
      : [];
    const resetCompletedDays =
      previousProgress.currentWeekNumber &&
      previousProgress.currentWeekNumber !== sessionRecord.weekNumber;
    const completedDaySet = new Set(resetCompletedDays ? [] : previousCompletedDays);

    if (TRAINING_DAYS.includes(sessionRecord.dayKey)) {
      completedDaySet.add(sessionRecord.dayKey);
    }

    let nextWeekNumber = previousWeekNumber;
    let nextCompletedDays = Array.from(completedDaySet);
    if (completedDaySet.size >= TRAINING_DAYS.length) {
      nextWeekNumber = previousWeekNumber + 1;
      nextCompletedDays = [];
    }

    nextState = {
      ...nextState,
      sessions: [...nextState.sessions, sessionRecord],
      progress: {
        lastCompletedDate: sessionRecord.date,
        lastCompletedDayKey: sessionRecord.dayKey,
        lastCompletedWeekNumber: sessionRecord.weekNumber,
        currentWeekNumber: nextWeekNumber,
        completedDays: nextCompletedDays
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
      void (async () => {
        try {
          setSyncError(null);
          const response = await fetch(`${syncBaseUrl}/sync/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: nextState.deviceId,
              state: { ...nextState, updatedAt: Date.now() }
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
        } catch (error) {
          setSyncError(error.message ?? 'Sync push failed');
        }
      })();
    }
  }

  function handleResetData() {
    if (!window.confirm('Reset all data? This clears history and resets weights.')) return;
    setState(buildDefaultState());
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
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  }

  function handleStartDateChange(value) {
    setState((prev) => ({
      ...prev,
      programStartDate: value
    }));
  }

  function updateExerciseSettings(exerciseId, updates) {
    setState((prev) => ({
      ...prev,
      exerciseStates: {
        ...prev.exerciseStates,
        [exerciseId]: {
          ...prev.exerciseStates[exerciseId],
          ...updates
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
    state.settings.restSeconds > 0
      ? Math.min(1, restRemaining / state.settings.restSeconds)
      : 0;
  const restColor = restProgress > 0.66 ? '#3ccf7d' : restProgress > 0.33 ? '#f2b880' : '#e4572e';

  const restLabel = restRemaining > 0 ? formatDuration(restRemaining) : 'Ready';

  return (
    <div className={`app ${view === 'workout' ? 'workout' : ''}`}>
      <header className="header">
        <div>
          <p className="eyebrow">Progressive Overload</p>
          <h1>Upper-Body Strength Cycle</h1>
        </div>
        {view !== 'workout' && (
          <div className="header-meta">
            <div>
              <span>Week</span>
              <strong>{weekNumber}</strong>
            </div>
            <div>
              <span>Today</span>
              <select
                className="day-select"
                value={plannedDayKey}
                onChange={(event) => setSelectedDayKey(event.target.value)}
                aria-label="Select training day"
              >
                {DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <button
          className="menu-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setShowSettings(true)}
        >
          ⋯
        </button>
      </header>

      {view === 'today' && (
        <section className="panel today-panel">
          <h2>Today&apos;s Exercises</h2>
          {plannedDayKey === 'Rest' ? (
            <p className="muted">Rest day. Recover, walk, and mobilize.</p>
          ) : (
            <div className="exercise-grid">
              {todayExercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className={`exercise-card exercise-slot-${(index % 3) + 1}`}
                >
                  <h3>{exercise.name}</h3>
                  <p>{exerciseDisplayWeight(exercise)}</p>
                  <p>Target: 3 x {exercise.targetReps}</p>
                </div>
              ))}
            </div>
          )}
          {!activeSession && plannedDayKey !== 'Rest' && (
            <button className="primary start-day" onClick={handleStartDay}>
              Start Day
            </button>
          )}
        </section>
      )}

      {view === 'workout' && (
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

          {!activeSession && dayKey === 'Rest' && (
            <p className="muted">No training session today.</p>
          )}

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
                    {currentSetIndex}/{SETS_PER_EXERCISE}
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
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h2>Settings</h2>
              <button
                className="secondary"
                type="button"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
            <div className="settings-grid">
              <div>
                <label htmlFor="bodyweight">Bodyweight (kg)</label>
                <input
                  id="bodyweight"
                  type="number"
                  step="0.1"
                  value={state.settings.bodyweightKg}
                  onChange={(event) =>
                    handleSettingsChange('bodyweightKg', Number(event.target.value))
                  }
                />
              </div>
              <div>
                <label htmlFor="rest">Rest timer</label>
                <select
                  id="rest"
                  value={state.settings.restSeconds}
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
                  value={state.programStartDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                />
              </div>
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
              <div className="settings-section">
                <h3>Sync Status</h3>
                {lastSyncAt && (
                  <p className="muted">
                    Last sync: {new Date(lastSyncAt).toLocaleString()}
                  </p>
                )}
                {syncError && <p className="muted">Sync issue: {syncError}</p>}
              </div>
            )}
            <div className="settings-section">
              <h3>Actions</h3>
              <div className="settings-actions-row">
                <button className="secondary" onClick={() => exportCsv(state.sessions)}>
                  Export CSV
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
              </div>
            </div>
            <div className="settings-section">
              <h3>Reset</h3>
              <div className="settings-actions-row">
                <button className="danger" onClick={handleResetData}>
                  Reset All Data
                </button>
              </div>
            </div>
            <div className="settings-section">
              <h3>Training Plan</h3>
              <p className="muted">Cycle: Push A → Pull A → Mobility → Push B → Pull B</p>
              <p className="muted">
                Today: {dayKey} {hasSessionToday ? '(completed)' : ''}
              </p>
              <p className="muted">Next: {getNextTrainingDayKey(dayKey)}</p>
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
