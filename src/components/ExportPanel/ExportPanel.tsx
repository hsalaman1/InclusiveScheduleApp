import { useState } from 'react';
import { BellSchedule } from '../../types';
import { scheduleRepository } from '../../services';
import './ExportPanel.css';

interface ExportPanelProps {
  schedule: BellSchedule | null;
  savedSchedules: BellSchedule[];
}

export function ExportPanel({ schedule, savedSchedules }: ExportPanelProps) {
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [includeStats, setIncludeStats] = useState(true);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExportCurrent = () => {
    if (!schedule) {
      setExportStatus('Please select a schedule first');
      return;
    }

    try {
      if (exportFormat === 'xlsx') {
        scheduleRepository.exportToExcel(schedule, {
          includeStatistics: includeStats
        });
      } else {
        scheduleRepository.exportToCSV(schedule);
      }
      setExportStatus(`Exported "${schedule.name}" successfully!`);
    } catch (error) {
      setExportStatus('Export failed. Please try again.');
    }

    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportAll = () => {
    if (savedSchedules.length === 0) {
      setExportStatus('No saved schedules to export');
      return;
    }

    try {
      scheduleRepository.exportMultipleToExcel(savedSchedules, {
        includeStatistics: includeStats,
        includeSummary: true
      });
      setExportStatus(`Exported ${savedSchedules.length} schedules successfully!`);
    } catch (error) {
      setExportStatus('Export failed. Please try again.');
    }

    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportComparison = () => {
    // Export all templates for comparison
    const templates = scheduleRepository.getTemplates();
    try {
      scheduleRepository.exportMultipleToExcel(templates, {
        includeStatistics: true,
        includeSummary: true,
        fileName: 'Schedule_Templates_Comparison.xlsx'
      });
      setExportStatus('Template comparison report exported!');
    } catch (error) {
      setExportStatus('Export failed. Please try again.');
    }

    setTimeout(() => setExportStatus(null), 3000);
  };

  return (
    <div className="export-panel">
      <h3>Export Reports</h3>

      <div className="export-options">
        <div className="option-group">
          <label>Format:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>

        {exportFormat === 'xlsx' && (
          <div className="option-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
              />
              Include statistics sheet
            </label>
          </div>
        )}
      </div>

      <div className="export-actions">
        <button
          className="export-btn primary"
          onClick={handleExportCurrent}
          disabled={!schedule}
        >
          Export Current Schedule
        </button>

        <button
          className="export-btn secondary"
          onClick={handleExportAll}
          disabled={savedSchedules.length === 0}
        >
          Export All Saved ({savedSchedules.length})
        </button>

        <button
          className="export-btn outline"
          onClick={handleExportComparison}
        >
          Export Template Comparison
        </button>
      </div>

      {exportStatus && (
        <div className={`export-status ${exportStatus.includes('failed') ? 'error' : 'success'}`}>
          {exportStatus}
        </div>
      )}
    </div>
  );
}
