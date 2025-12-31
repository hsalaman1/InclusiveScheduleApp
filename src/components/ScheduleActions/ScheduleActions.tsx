import { useState } from 'react';
import { BellSchedule } from '../../types';
import { scheduleRepository } from '../../services';
import './ScheduleActions.css';

interface ScheduleActionsProps {
  schedule: BellSchedule | null;
  onScheduleSaved: () => void;
}

export function ScheduleActions({ schedule, onScheduleSaved }: ScheduleActionsProps) {
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = () => {
    if (!schedule) return;

    try {
      scheduleRepository.save(schedule, notes || undefined);
      setStatus('Schedule saved successfully!');
      setNotes('');
      setShowNotesInput(false);
      onScheduleSaved();
    } catch {
      setStatus('Failed to save schedule');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  if (!schedule) {
    return null;
  }

  return (
    <div className="schedule-actions">
      <div className="action-row">
        <button
          className="action-btn save"
          onClick={() => setShowNotesInput(!showNotesInput)}
        >
          💾 Save Schedule
        </button>

        <button
          className="action-btn export"
          onClick={() => {
            scheduleRepository.exportToExcel(schedule);
            setStatus('Exported to Excel!');
            setTimeout(() => setStatus(null), 3000);
          }}
        >
          📊 Quick Export
        </button>
      </div>

      {showNotesInput && (
        <div className="notes-input-section">
          <input
            type="text"
            placeholder="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="notes-input"
          />
          <button className="confirm-save" onClick={handleSave}>
            Confirm Save
          </button>
          <button
            className="cancel-save"
            onClick={() => {
              setShowNotesInput(false);
              setNotes('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {status && (
        <div className={`action-status ${status.includes('Failed') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
