type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeDailyDataCleared(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDailyDataCleared(): void {
  for (const listener of listeners) {
    listener();
  }
}
