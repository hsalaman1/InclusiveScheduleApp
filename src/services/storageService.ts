import { BellSchedule } from '../types';

const STORAGE_KEYS = {
  SAVED_SCHEDULES: 'inclusive_schedule_saved_schedules',
  USER_PREFERENCES: 'inclusive_schedule_preferences',
  LAST_EXPORT: 'inclusive_schedule_last_export'
};

export interface SavedScheduleEntry {
  id: string;
  schedule: BellSchedule;
  savedAt: string;
  notes?: string;
  createdBy?: string;
}

export interface UserPreferences {
  defaultSchoolType?: string;
  exportFormat?: 'xlsx' | 'csv';
  autoSave?: boolean;
}

export interface ExportHistory {
  exportedAt: string;
  scheduleIds: string[];
  format: string;
  fileName: string;
}

/**
 * Storage Service - Provides data persistence using localStorage
 * This can be extended to use IndexedDB or a backend API
 */
export const storageService = {
  /**
   * Save a schedule to local storage
   */
  saveSchedule(schedule: BellSchedule, notes?: string, createdBy?: string): SavedScheduleEntry {
    const savedSchedules = this.getAllSavedSchedules();

    const entry: SavedScheduleEntry = {
      id: schedule.id,
      schedule,
      savedAt: new Date().toISOString(),
      notes,
      createdBy
    };

    // Update or add the schedule
    const existingIndex = savedSchedules.findIndex(s => s.id === schedule.id);
    if (existingIndex >= 0) {
      savedSchedules[existingIndex] = entry;
    } else {
      savedSchedules.push(entry);
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_SCHEDULES, JSON.stringify(savedSchedules));
    return entry;
  },

  /**
   * Get all saved schedules
   */
  getAllSavedSchedules(): SavedScheduleEntry[] {
    const data = localStorage.getItem(STORAGE_KEYS.SAVED_SCHEDULES);
    if (!data) return [];

    try {
      return JSON.parse(data) as SavedScheduleEntry[];
    } catch {
      console.error('Failed to parse saved schedules');
      return [];
    }
  },

  /**
   * Get a single saved schedule by ID
   */
  getSavedSchedule(id: string): SavedScheduleEntry | undefined {
    const schedules = this.getAllSavedSchedules();
    return schedules.find(s => s.id === id);
  },

  /**
   * Delete a saved schedule
   */
  deleteSavedSchedule(id: string): boolean {
    const schedules = this.getAllSavedSchedules();
    const filtered = schedules.filter(s => s.id !== id);

    if (filtered.length === schedules.length) {
      return false; // Nothing was deleted
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_SCHEDULES, JSON.stringify(filtered));
    return true;
  },

  /**
   * Clear all saved schedules
   */
  clearAllSchedules(): void {
    localStorage.removeItem(STORAGE_KEYS.SAVED_SCHEDULES);
  },

  /**
   * Save user preferences
   */
  savePreferences(prefs: UserPreferences): void {
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  },

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!data) return {};

    try {
      return JSON.parse(data) as UserPreferences;
    } catch {
      return {};
    }
  },

  /**
   * Record an export event
   */
  recordExport(scheduleIds: string[], format: string, fileName: string): void {
    const history: ExportHistory = {
      exportedAt: new Date().toISOString(),
      scheduleIds,
      format,
      fileName
    };
    localStorage.setItem(STORAGE_KEYS.LAST_EXPORT, JSON.stringify(history));
  },

  /**
   * Get last export info
   */
  getLastExport(): ExportHistory | null {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_EXPORT);
    if (!data) return null;

    try {
      return JSON.parse(data) as ExportHistory;
    } catch {
      return null;
    }
  },

  /**
   * Export all data as JSON for backup
   */
  exportAllData(): string {
    const data = {
      schedules: this.getAllSavedSchedules(),
      preferences: this.getPreferences(),
      lastExport: this.getLastExport(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  /**
   * Import data from JSON backup
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (data.schedules) {
        localStorage.setItem(STORAGE_KEYS.SAVED_SCHEDULES, JSON.stringify(data.schedules));
      }
      if (data.preferences) {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(data.preferences));
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
};
