import * as XLSX from 'xlsx';
import { BellSchedule } from '../types';
import { formatTime, getSchoolTypeLabel } from '../utils/scheduleUtils';
import { SavedScheduleEntry } from './storageService';

export interface ExportOptions {
  includeStatistics?: boolean;
  includeSummary?: boolean;
  includeAllSchedules?: boolean;
  fileName?: string;
}

/**
 * Excel Export Service - Creates visual Excel reports for bell schedules
 */
export const excelExportService = {
  /**
   * Export a single schedule to Excel
   */
  exportSchedule(schedule: BellSchedule, options: ExportOptions = {}): void {
    const workbook = XLSX.utils.book_new();

    // Create main schedule sheet
    const scheduleSheet = this.createScheduleSheet(schedule);
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Schedule');

    // Add statistics sheet if requested
    if (options.includeStatistics !== false) {
      const statsSheet = this.createStatisticsSheet(schedule);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
    }

    // Generate filename
    const fileName = options.fileName ||
      `${schedule.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Export multiple schedules to a single Excel file with comparison
   */
  exportMultipleSchedules(
    schedules: BellSchedule[],
    options: ExportOptions = {}
  ): void {
    const workbook = XLSX.utils.book_new();

    // Create a summary sheet
    if (options.includeSummary !== false) {
      const summarySheet = this.createSummarySheet(schedules);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Create individual sheets for each schedule
    schedules.forEach((schedule, index) => {
      const sheetName = this.truncateSheetName(schedule.name, index);
      const scheduleSheet = this.createScheduleSheet(schedule);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, sheetName);
    });

    // Add comparison sheet
    if (schedules.length > 1) {
      const comparisonSheet = this.createComparisonSheet(schedules);
      XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparison');
    }

    // Generate filename
    const fileName = options.fileName ||
      `Bell_Schedules_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Export saved schedule entries with metadata
   */
  exportSavedSchedules(entries: SavedScheduleEntry[], options: ExportOptions = {}): void {
    const workbook = XLSX.utils.book_new();

    // Create saved schedules overview
    const overviewData = [
      ['Saved Schedules Report'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Schedule Name', 'School Type', 'Grade Levels', 'Total Periods', 'Instructional Minutes', 'Saved Date', 'Notes']
    ];

    entries.forEach(entry => {
      overviewData.push([
        entry.schedule.name,
        getSchoolTypeLabel(entry.schedule.schoolType),
        entry.schedule.gradeLevels.join(', '),
        entry.schedule.periods.length.toString(),
        entry.schedule.totalInstructionalMinutes.toString(),
        new Date(entry.savedAt).toLocaleString(),
        entry.notes || ''
      ]);
    });

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    this.applyHeaderStyles(overviewSheet, 4);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Add individual schedule sheets
    entries.forEach((entry, index) => {
      const sheetName = this.truncateSheetName(entry.schedule.name, index);
      const scheduleSheet = this.createScheduleSheet(entry.schedule);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, sheetName);
    });

    const fileName = options.fileName ||
      `Saved_Schedules_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Create a schedule sheet for a single bell schedule
   */
  createScheduleSheet(schedule: BellSchedule): XLSX.WorkSheet {
    const data: (string | number)[][] = [
      ['Bell Schedule Report'],
      [],
      ['Schedule Name:', schedule.name],
      ['School Type:', getSchoolTypeLabel(schedule.schoolType)],
      ['Grade Levels:', schedule.gradeLevels.join(', ')],
      ['Total Instructional Minutes:', schedule.totalInstructionalMinutes],
      [],
      ['Period Schedule'],
      ['#', 'Period Name', 'Start Time', 'End Time', 'Duration (min)', 'Type']
    ];

    schedule.periods.forEach((period, index) => {
      data.push([
        index + 1,
        period.name,
        formatTime(period.startTime),
        formatTime(period.endTime),
        period.durationMinutes,
        period.isInstructional ? 'Instructional' : 'Non-Instructional'
      ]);
    });

    // Add summary row
    data.push([]);
    const instructionalPeriods = schedule.periods.filter(p => p.isInstructional);
    const nonInstructionalPeriods = schedule.periods.filter(p => !p.isInstructional);

    data.push(['Summary']);
    data.push(['Total Periods:', schedule.periods.length]);
    data.push(['Instructional Periods:', instructionalPeriods.length]);
    data.push(['Non-Instructional Periods:', nonInstructionalPeriods.length]);
    data.push(['Total Instructional Minutes:', schedule.totalInstructionalMinutes]);
    data.push(['Total Non-Instructional Minutes:',
      nonInstructionalPeriods.reduce((sum, p) => sum + p.durationMinutes, 0)]);

    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    sheet['!cols'] = [
      { wch: 5 },   // #
      { wch: 30 },  // Period Name
      { wch: 15 },  // Start Time
      { wch: 15 },  // End Time
      { wch: 15 },  // Duration
      { wch: 20 }   // Type
    ];

    return sheet;
  },

  /**
   * Create a statistics sheet with charts data
   */
  createStatisticsSheet(schedule: BellSchedule): XLSX.WorkSheet {
    const instructionalPeriods = schedule.periods.filter(p => p.isInstructional);
    const nonInstructionalPeriods = schedule.periods.filter(p => !p.isInstructional);

    const totalInstructional = instructionalPeriods.reduce((sum, p) => sum + p.durationMinutes, 0);
    const totalNonInstructional = nonInstructionalPeriods.reduce((sum, p) => sum + p.durationMinutes, 0);
    const totalTime = totalInstructional + totalNonInstructional;

    const data: (string | number)[][] = [
      ['Schedule Statistics'],
      [],
      ['Time Distribution'],
      ['Category', 'Minutes', 'Percentage'],
      ['Instructional Time', totalInstructional, `${((totalInstructional / totalTime) * 100).toFixed(1)}%`],
      ['Non-Instructional Time', totalNonInstructional, `${((totalNonInstructional / totalTime) * 100).toFixed(1)}%`],
      ['Total', totalTime, '100%'],
      [],
      ['Period Breakdown'],
      ['Period Name', 'Duration (min)', 'Cumulative (min)', 'Type']
    ];

    let cumulative = 0;
    schedule.periods.forEach(period => {
      cumulative += period.durationMinutes;
      data.push([
        period.name,
        period.durationMinutes,
        cumulative,
        period.isInstructional ? 'Instructional' : 'Non-Instructional'
      ]);
    });

    // Add time analysis
    data.push([]);
    data.push(['Time Analysis']);

    const firstPeriod = schedule.periods[0];
    const lastPeriod = schedule.periods[schedule.periods.length - 1];

    if (firstPeriod && lastPeriod) {
      data.push(['School Start:', formatTime(firstPeriod.startTime)]);
      data.push(['School End:', formatTime(lastPeriod.endTime)]);
      data.push(['Total School Day:', `${totalTime} minutes (${(totalTime / 60).toFixed(1)} hours)`]);
    }

    // Average period length
    const avgInstructional = instructionalPeriods.length > 0
      ? (totalInstructional / instructionalPeriods.length).toFixed(1)
      : '0';
    data.push(['Average Instructional Period:', `${avgInstructional} minutes`]);

    const sheet = XLSX.utils.aoa_to_sheet(data);

    sheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ];

    return sheet;
  },

  /**
   * Create a summary sheet comparing multiple schedules
   */
  createSummarySheet(schedules: BellSchedule[]): XLSX.WorkSheet {
    const data: (string | number)[][] = [
      ['Bell Schedules Summary Report'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Schedule Comparison'],
      ['Schedule Name', 'School Type', 'Grades', 'Periods', 'Instructional Min', 'Start', 'End']
    ];

    schedules.forEach(schedule => {
      const firstPeriod = schedule.periods[0];
      const lastPeriod = schedule.periods[schedule.periods.length - 1];

      data.push([
        schedule.name,
        getSchoolTypeLabel(schedule.schoolType),
        schedule.gradeLevels.join(', '),
        schedule.periods.length,
        schedule.totalInstructionalMinutes,
        firstPeriod ? formatTime(firstPeriod.startTime) : '',
        lastPeriod ? formatTime(lastPeriod.endTime) : ''
      ]);
    });

    // Add averages
    data.push([]);
    const avgPeriods = schedules.reduce((sum, s) => sum + s.periods.length, 0) / schedules.length;
    const avgMinutes = schedules.reduce((sum, s) => sum + s.totalInstructionalMinutes, 0) / schedules.length;

    data.push(['Averages']);
    data.push(['Average Periods:', avgPeriods.toFixed(1)]);
    data.push(['Average Instructional Minutes:', avgMinutes.toFixed(1)]);

    const sheet = XLSX.utils.aoa_to_sheet(data);

    sheet['!cols'] = [
      { wch: 35 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 }
    ];

    return sheet;
  },

  /**
   * Create a comparison sheet for multiple schedules
   */
  createComparisonSheet(schedules: BellSchedule[]): XLSX.WorkSheet {
    // Find the maximum number of periods across all schedules
    const maxPeriods = Math.max(...schedules.map(s => s.periods.length));

    const headers = ['Period #'];
    schedules.forEach(s => {
      headers.push(`${s.name} - Period`);
      headers.push(`${s.name} - Time`);
      headers.push(`${s.name} - Duration`);
    });

    const data: (string | number)[][] = [
      ['Schedule Comparison - Side by Side'],
      [],
      headers
    ];

    for (let i = 0; i < maxPeriods; i++) {
      const row: (string | number)[] = [i + 1];

      schedules.forEach(schedule => {
        const period = schedule.periods[i];
        if (period) {
          row.push(period.name);
          row.push(`${formatTime(period.startTime)} - ${formatTime(period.endTime)}`);
          row.push(period.durationMinutes);
        } else {
          row.push('', '', '');
        }
      });

      data.push(row);
    }

    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const cols = [{ wch: 10 }];
    schedules.forEach(() => {
      cols.push({ wch: 25 }, { wch: 25 }, { wch: 12 });
    });
    sheet['!cols'] = cols;

    return sheet;
  },

  /**
   * Export schedule data as CSV (simpler format)
   */
  exportAsCSV(schedule: BellSchedule, fileName?: string): void {
    const data: (string | number)[][] = [
      ['Period Name', 'Start Time', 'End Time', 'Duration (min)', 'Is Instructional']
    ];

    schedule.periods.forEach(period => {
      data.push([
        period.name,
        formatTime(period.startTime),
        formatTime(period.endTime),
        period.durationMinutes,
        period.isInstructional ? 'Yes' : 'No'
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Schedule');

    const outputName = fileName ||
      `${schedule.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    XLSX.writeFile(workbook, outputName, { bookType: 'csv' });
  },

  /**
   * Helper to truncate sheet names (Excel limit is 31 characters)
   */
  truncateSheetName(name: string, index: number): string {
    const maxLength = 28; // Leave room for index suffix
    const truncated = name.length > maxLength
      ? name.substring(0, maxLength) + '...'
      : name;
    return `${index + 1}. ${truncated}`.substring(0, 31);
  },

  /**
   * Apply basic header styles (bold via cell format notes)
   */
  applyHeaderStyles(sheet: XLSX.WorkSheet, headerRow: number): void {
    // Note: xlsx community edition has limited styling support
    // For full styling, consider xlsx-style or exceljs
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: headerRow - 1, c: C });
      if (!sheet[addr]) continue;
      // Add note for header styling (actual styling requires premium xlsx or exceljs)
      sheet[addr].s = { font: { bold: true } };
    }
  }
};
