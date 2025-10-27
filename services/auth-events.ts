// Simple in-memory event emitter for auth events (no native modules)
// Provides onLogout and emitLogout so non-React modules (like api) can notify hooks.

type Unsubscribe = () => void;

const logoutListeners: Array<() => void> = [];

export function onLogout(cb: () => void): Unsubscribe {
  logoutListeners.push(cb);
  return () => {
    const idx = logoutListeners.indexOf(cb);
    if (idx !== -1) logoutListeners.splice(idx, 1);
  };
}

export function emitLogout() {
  // call listeners in a microtask to avoid unexpected sync behavior
  Promise.resolve().then(() => logoutListeners.slice().forEach((cb) => {
    try { cb(); } catch (e) { console.warn('auth-events listener error', e); }
  }));
}

