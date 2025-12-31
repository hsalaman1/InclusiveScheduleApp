import { v4 as uuidv4 } from 'uuid';
import { BellSchedule, Period, SchoolType } from '../types';
import { storageService, SavedScheduleEntry } from './storageService';
import { excelExportService, ExportOptions } from './excelExportService';
import { bellScheduleTemplates } from '../data/bellScheduleTemplates';
import { calculateInstructionalMinutes } from '../utils/scheduleUtils';

/**
 * Schedule Repository - Unified API for managing bell schedules
 * Acts as a central data layer that can be connected to different backends
 */
export const scheduleRepository = {
  // ============================================
  // Template Operations
  // ============================================

  /**
   * Get all available templates
   */
  getTemplates(): BellSchedule[] {
    return bellScheduleTemplates;
  },

  /**
   * Get a template by school type
   */
  getTemplateBySchoolType(schoolType: SchoolType): BellSchedule | undefined {
    return bellScheduleTemplates.find(t => t.schoolType === schoolType);
  },

  /**
   * Clone a template for customization
   */
  cloneTemplate(template: BellSchedule, customName?: string): BellSchedule {
    const newId = uuidv4();
    const name = customName || `${template.name} (Copy)`;

    return {
      ...template,
      id: newId,
      name,
      periods: template.periods.map(period => ({
        ...period,
        id: uuidv4()
      }))
    };
  },

  // ============================================
  // Schedule CRUD Operations
  // ============================================

  /**
   * Create a new custom schedule
   */
  createSchedule(
    name: string,
    schoolType: SchoolType,
    gradeLevels: string[],
    periods: Omit<Period, 'id' | 'durationMinutes'>[]
  ): BellSchedule {
    const processedPeriods: Period[] = periods.map(p => {
      const [startHour, startMin] = p.startTime.split(':').map(Number);
      const [endHour, endMin] = p.endTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      return {
        ...p,
        id: uuidv4(),
        durationMinutes
      };
    });

    const schedule: BellSchedule = {
      id: uuidv4(),
      name,
      schoolType,
      gradeLevels,
      periods: processedPeriods,
      totalInstructionalMinutes: calculateInstructionalMinutes(processedPeriods)
    };

    return schedule;
  },

  /**
   * Save a schedule to the database (localStorage)
   */
  save(schedule: BellSchedule, notes?: string, createdBy?: string): SavedScheduleEntry {
    return storageService.saveSchedule(schedule, notes, createdBy);
  },

  /**
   * Get all saved schedules
   */
  getAll(): SavedScheduleEntry[] {
    return storageService.getAllSavedSchedules();
  },

  /**
   * Get a saved schedule by ID
   */
  getById(id: string): SavedScheduleEntry | undefined {
    return storageService.getSavedSchedule(id);
  },

  /**
   * Update a saved schedule
   */
  update(schedule: BellSchedule, notes?: string): SavedScheduleEntry {
    // Recalculate instructional minutes in case periods changed
    const updatedSchedule: BellSchedule = {
      ...schedule,
      totalInstructionalMinutes: calculateInstructionalMinutes(schedule.periods)
    };
    return storageService.saveSchedule(updatedSchedule, notes);
  },

  /**
   * Delete a saved schedule
   */
  delete(id: string): boolean {
    return storageService.deleteSavedSchedule(id);
  },

  /**
   * Delete all saved schedules
   */
  deleteAll(): void {
    storageService.clearAllSchedules();
  },

  // ============================================
  // Export Operations
  // ============================================

  /**
   * Export a single schedule to Excel
   */
  exportToExcel(schedule: BellSchedule, options?: ExportOptions): void {
    excelExportService.exportSchedule(schedule, options);
    storageService.recordExport([schedule.id], 'xlsx', options?.fileName || 'schedule.xlsx');
  },

  /**
   * Export multiple schedules to Excel
   */
  exportMultipleToExcel(schedules: BellSchedule[], options?: ExportOptions): void {
    excelExportService.exportMultipleSchedules(schedules, options);
    storageService.recordExport(schedules.map(s => s.id), 'xlsx', options?.fileName || 'schedules.xlsx');
  },

  /**
   * Export all saved schedules to Excel
   */
  exportAllSavedToExcel(options?: ExportOptions): void {
    const entries = this.getAll();
    if (entries.length === 0) {
      throw new Error('No saved schedules to export');
    }
    excelExportService.exportSavedSchedules(entries, options);
  },

  /**
   * Export a schedule to CSV
   */
  exportToCSV(schedule: BellSchedule, fileName?: string): void {
    excelExportService.exportAsCSV(schedule, fileName);
    storageService.recordExport([schedule.id], 'csv', fileName || 'schedule.csv');
  },

  // ============================================
  // Data Backup & Restore
  // ============================================

  /**
   * Export all app data as JSON backup
   */
  exportBackup(): string {
    return storageService.exportAllData();
  },

  /**
   * Download the backup as a JSON file
   */
  downloadBackup(): void {
    const data = this.exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import data from JSON backup
   */
  importBackup(jsonData: string): boolean {
    return storageService.importData(jsonData);
  },

  /**
   * Import from uploaded file
   */
  async importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(this.importBackup(content));
        } else {
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  },

  // ============================================
  // Statistics & Analytics
  // ============================================

  /**
   * Get statistics for saved schedules
   */
  getStatistics() {
    const entries = this.getAll();
    const templates = this.getTemplates();

    if (entries.length === 0) {
      return {
        totalSaved: 0,
        totalTemplates: templates.length,
        bySchoolType: {} as Record<string, number>,
        averageInstructionalMinutes: 0,
        averagePeriods: 0
      };
    }

    const bySchoolType: Record<string, number> = {};
    let totalMinutes = 0;
    let totalPeriods = 0;

    entries.forEach(entry => {
      const type = entry.schedule.schoolType;
      bySchoolType[type] = (bySchoolType[type] || 0) + 1;
      totalMinutes += entry.schedule.totalInstructionalMinutes;
      totalPeriods += entry.schedule.periods.length;
    });

    return {
      totalSaved: entries.length,
      totalTemplates: templates.length,
      bySchoolType,
      averageInstructionalMinutes: Math.round(totalMinutes / entries.length),
      averagePeriods: Math.round(totalPeriods / entries.length)
    };
  }
};

// Export types for external use
export type { SavedScheduleEntry, ExportOptions };
