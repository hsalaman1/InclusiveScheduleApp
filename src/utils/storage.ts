/**
 * localStorage persistence utilities for the Inclusive Scheduler
 */

const STORAGE_KEY = 'inclusive-scheduler-state';
const STORAGE_VERSION = '1.0';

interface StoredState {
  version: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Save state to localStorage
 */
export function saveState(state: Record<string, unknown>): boolean {
  try {
    const storedState: StoredState = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      data: state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
    return true;
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    return false;
  }
}

/**
 * Load state from localStorage
 */
export function loadState(): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const storedState: StoredState = JSON.parse(stored);

    // Version check - could add migration logic here in the future
    if (storedState.version !== STORAGE_VERSION) {
      console.warn(
        `Storage version mismatch: expected ${STORAGE_VERSION}, got ${storedState.version}`
      );
      // For now, still return the data but log a warning
    }

    return storedState.data;
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return null;
  }
}

/**
 * Clear all stored state
 */
export function clearState(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
    return false;
  }
}

/**
 * Export state as a JSON file download
 */
export function exportStateAsJson(state: Record<string, unknown>, filename?: string): void {
  const exportData: StoredState = {
    version: STORAGE_VERSION,
    timestamp: new Date().toISOString(),
    data: state,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `inclusive-scheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import state from a JSON file
 */
export function importStateFromJson(file: File): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const storedState: StoredState = JSON.parse(content);

        if (!storedState.data) {
          reject(new Error('Invalid backup file: missing data'));
          return;
        }

        resolve(storedState.data);
      } catch (error) {
        reject(new Error('Invalid backup file: could not parse JSON'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Check if there is saved state
 */
export function hasSavedState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Get the timestamp of the last save
 */
export function getLastSaveTimestamp(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const storedState: StoredState = JSON.parse(stored);
    return storedState.timestamp;
  } catch {
    return null;
  }
}
