'use client';

import { AppState } from '../types';

const STORAGE_KEY = 'walking-diary-state-v1';

const defaultState: AppState = {
  entries: [],
  trails: [],
  prefs: {
    unit: 'metric',
    photoMaxPx: 800
  }
};

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return defaultState;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...defaultState,
      ...parsed,
      prefs: {
        ...defaultState.prefs,
        ...parsed.prefs
      }
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return defaultState;
  }
}

export function saveState(state: AppState) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state', error);
  }
}

export function clearState() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `walking-diary-${new Date().toISOString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
