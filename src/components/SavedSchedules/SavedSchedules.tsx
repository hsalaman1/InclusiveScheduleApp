import { BellSchedule } from '../../types';
import { SavedScheduleEntry } from '../../services';
import { getSchoolTypeLabel } from '../../utils/scheduleUtils';
import './SavedSchedules.css';

interface SavedSchedulesProps {
  entries: SavedScheduleEntry[];
  onSelectSchedule: (schedule: BellSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  selectedScheduleId?: string;
}

export function SavedSchedules({
  entries,
  onSelectSchedule,
  onDeleteSchedule,
  selectedScheduleId
}: SavedSchedulesProps) {
  if (entries.length === 0) {
    return (
      <div className="saved-schedules empty">
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <p>No saved schedules yet</p>
          <p className="hint">Save a template to see it here</p>
        </div>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="saved-schedules">
      <h3>Saved Schedules ({entries.length})</h3>
      <div className="schedules-list">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`schedule-item ${selectedScheduleId === entry.id ? 'selected' : ''}`}
          >
            <div
              className="schedule-info"
              onClick={() => onSelectSchedule(entry.schedule)}
            >
              <div className="schedule-header">
                <span className="schedule-name">{entry.schedule.name}</span>
                <span className={`type-tag ${entry.schedule.schoolType}`}>
                  {getSchoolTypeLabel(entry.schedule.schoolType)}
                </span>
              </div>
              <div className="schedule-details">
                <span>{entry.schedule.periods.length} periods</span>
                <span className="separator">•</span>
                <span>{entry.schedule.totalInstructionalMinutes} instructional min</span>
              </div>
              <div className="schedule-meta">
                <span className="saved-date">Saved: {formatDate(entry.savedAt)}</span>
                {entry.notes && <span className="notes" title={entry.notes}>📝 Has notes</span>}
              </div>
            </div>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this schedule?')) {
                  onDeleteSchedule(entry.id);
                }
              }}
              title="Delete schedule"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
