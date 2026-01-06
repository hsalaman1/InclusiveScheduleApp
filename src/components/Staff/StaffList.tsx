import { useState, useMemo } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { STAFF_TYPE_LABELS } from '../../types';
import './Staff.css';

interface StaffListProps {
  onSelectStaff: (staffId: string) => void;
  onAddStaff: () => void;
}

export function StaffList({ onSelectStaff, onAddStaff }: StaffListProps) {
  const { state, getAssignmentsByStaff } = useScheduler();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredStaff = useMemo(() => {
    return state.staff.filter((staff) => {
      const matchesSearch =
        searchTerm === '' ||
        `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || staff.staffType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [state.staff, searchTerm, typeFilter]);

  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [filteredStaff]);

  const calculateAssignedMinutes = (staffId: string): number => {
    const assignments = getAssignmentsByStaff(staffId);
    return assignments.reduce((total, assignment) => {
      const [startHours, startMins] = assignment.startTime.split(':').map(Number);
      const [endHours, endMins] = assignment.endTime.split(':').map(Number);
      const duration = (endHours * 60 + endMins) - (startHours * 60 + startMins);
      return total + duration;
    }, 0);
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(state.staff.map((s) => s.staffType));
    return Array.from(types);
  }, [state.staff]);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="staff-list">
      <div className="list-header">
        <div className="list-filters">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-select filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {STAFF_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={onAddStaff}>
          Add Staff
        </button>
      </div>

      {sortedStaff.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {state.staff.length === 0 ? 'No Staff Yet' : 'No Matching Staff'}
          </div>
          <p className="empty-state-description">
            {state.staff.length === 0
              ? 'Add ESE teachers and related service providers to start building schedules.'
              : 'Try adjusting your search or filters.'}
          </p>
          {state.staff.length === 0 && (
            <button className="btn btn-primary" onClick={onAddStaff}>
              Add Your First Staff Member
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Certifications</th>
                <th>Lunch</th>
                <th>Assigned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staff) => {
                const assignedMinutes = calculateAssignedMinutes(staff.id);
                const assignments = getAssignmentsByStaff(staff.id);

                return (
                  <tr key={staff.id} onClick={() => onSelectStaff(staff.id)}>
                    <td className="staff-name">
                      {staff.lastName}, {staff.firstName}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {STAFF_TYPE_LABELS[staff.staffType]}
                      </span>
                    </td>
                    <td>
                      {staff.certifications.length > 0 ? (
                        <span className="certifications">
                          {staff.certifications.slice(0, 2).join(', ')}
                          {staff.certifications.length > 2 && ` +${staff.certifications.length - 2}`}
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td>
                      {formatTime(staff.lunchWindow.startTime)} - {formatTime(staff.lunchWindow.endTime)}
                    </td>
                    <td>
                      {assignments.length > 0 ? (
                        <span>
                          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} ({assignedMinutes} min)
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStaff(staff.id);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="list-footer">
        <span className="text-muted">
          Showing {sortedStaff.length} of {state.staff.length} staff members
        </span>
      </div>
    </div>
  );
}

export default StaffList;
