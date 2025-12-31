import { BellSchedule } from '../../types';
import { formatTime, getSchoolTypeLabel } from '../../utils/scheduleUtils';
import './ScheduleDisplay.css';

interface ScheduleDisplayProps {
  schedule: BellSchedule;
}

export const ScheduleDisplay = ({ schedule }: ScheduleDisplayProps) => {
  return (
    <div className="schedule-display">
      <div className="schedule-header">
        <h2>{schedule.name}</h2>
        <div className="schedule-meta">
          <span className="school-type-badge">
            {getSchoolTypeLabel(schedule.schoolType)}
          </span>
          <span className="grades">Grades: {schedule.gradeLevels.join(', ')}</span>
        </div>
      </div>

      <table className="schedule-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {schedule.periods.map(period => (
            <tr
              key={period.id}
              className={period.isInstructional ? 'instructional' : 'non-instructional'}
            >
              <td className="period-name">{period.name}</td>
              <td>{formatTime(period.startTime)}</td>
              <td>{formatTime(period.endTime)}</td>
              <td>{period.durationMinutes} min</td>
              <td>
                <span className={`type-badge ${period.isInstructional ? 'instructional' : 'non-instructional'}`}>
                  {period.isInstructional ? 'Instructional' : 'Non-Instructional'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="schedule-summary">
        <div className="summary-item">
          <span className="summary-label">Total Periods:</span>
          <span className="summary-value">{schedule.periods.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Instructional Periods:</span>
          <span className="summary-value">
            {schedule.periods.filter(p => p.isInstructional).length}
          </span>
        </div>
        <div className="summary-item highlight">
          <span className="summary-label">Total Instructional Minutes:</span>
          <span className="summary-value">{schedule.totalInstructionalMinutes}</span>
        </div>
      </div>
    </div>
  );
};
