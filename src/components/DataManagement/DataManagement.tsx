import { useRef, useState } from 'react';
import { scheduleRepository } from '../../services';
import './DataManagement.css';

interface DataManagementProps {
  onDataImported: () => void;
  onClearAll: () => void;
}

export function DataManagement({ onDataImported, onClearAll }: DataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleBackup = () => {
    try {
      scheduleRepository.downloadBackup();
      setStatus({ type: 'success', message: 'Backup downloaded successfully!' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to create backup' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const success = await scheduleRepository.importFromFile(file);
      if (success) {
        setStatus({ type: 'success', message: 'Data restored successfully!' });
        onDataImported();
      } else {
        setStatus({ type: 'error', message: 'Invalid backup file' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to restore backup' });
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL saved schedules? This cannot be undone.')) {
      scheduleRepository.deleteAll();
      setStatus({ type: 'success', message: 'All schedules cleared' });
      onClearAll();
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const stats = scheduleRepository.getStatistics();

  return (
    <div className="data-management">
      <h3>Data Management</h3>

      <div className="stats-summary">
        <div className="stat">
          <span className="stat-value">{stats.totalSaved}</span>
          <span className="stat-label">Saved</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.totalTemplates}</span>
          <span className="stat-label">Templates</span>
        </div>
        {stats.totalSaved > 0 && (
          <>
            <div className="stat">
              <span className="stat-value">{stats.averageInstructionalMinutes}</span>
              <span className="stat-label">Avg Minutes</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.averagePeriods}</span>
              <span className="stat-label">Avg Periods</span>
            </div>
          </>
        )}
      </div>

      <div className="management-actions">
        <button className="mgmt-btn backup" onClick={handleBackup}>
          <span className="icon">💾</span>
          Download Backup
        </button>

        <button className="mgmt-btn restore" onClick={handleRestoreClick}>
          <span className="icon">📂</span>
          Restore from Backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button className="mgmt-btn danger" onClick={handleClearAll}>
          <span className="icon">🗑️</span>
          Clear All Data
        </button>
      </div>

      {status && (
        <div className={`mgmt-status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
