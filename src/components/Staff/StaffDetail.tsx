import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  STAFF_TYPE_LABELS,
  DAY_OF_WEEK_SHORT,
  ALL_DAYS,
  CONTENT_AREA_LABELS,
  DayOfWeek,
} from '../../types';
import './Staff.css';

interface StaffDetailProps {
  staffId: string;
  onBack: () => void;
}

export function StaffDetail({ staffId, onBack }: StaffDetailProps) {
  const { state, dispatch, getAssignmentsByStaff, getStudentById, getClassroomById } = useScheduler();
  const [isEditing, setIsEditing] = useState(false);

  const staff = state.staff.find((s) => s.id === staffId);
  const assignments = staff ? getAssignmentsByStaff(staff.id) : [];

  if (!staff) {
    return (
      <div className="staff-detail">
        <div className="empty-state">
          <div className="empty-state-title">Staff Member Not Found</div>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteStaff = () => {
    if (assignments.length > 0) {
      if (!confirm(`${staff.firstName} ${staff.lastName} has ${assignments.length} assignments. Deleting will remove all assignments. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete ${staff.firstName} ${staff.lastName}?`)) {
        return;
      }
    }
    dispatch({ type: 'DELETE_STAFF', payload: staff.id });
    onBack();
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Group assignments by day
  const assignmentsByDay = ALL_DAYS.reduce((acc, day) => {
    acc[day] = assignments
      .filter((a) => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<DayOfWeek, typeof assignments>);

  // Calculate total assigned minutes
  const totalAssignedMinutes = assignments.reduce((total, a) => {
    const [startH, startM] = a.startTime.split(':').map(Number);
    const [endH, endM] = a.endTime.split(':').map(Number);
    return total + ((endH * 60 + endM) - (startH * 60 + startM));
  }, 0);

  // Get unique students served
  const uniqueStudentIds = [...new Set(assignments.map((a) => a.studentId))];

  return (
    <div className="staff-detail">
      <div className="detail-header">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          Back to Staff
        </button>
        <div className="detail-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
          {isEditing && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteStaff}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {staff.firstName} {staff.lastName}
              </h2>
              <span className="badge badge-neutral">
                {STAFF_TYPE_LABELS[staff.staffType]}
              </span>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Certifications</div>
                  <div className="info-value">
                    {staff.certifications.length > 0
                      ? staff.certifications.join(', ')
                      : 'None listed'}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Lunch Window</div>
                  <div className="info-value">
                    {formatTime(staff.lunchWindow.startTime)} - {formatTime(staff.lunchWindow.endTime)}
                  </div>
                </div>
                {staff.maxCaseloadMinutes && (
                  <div className="info-item">
                    <div className="info-label">Max Caseload</div>
                    <div className="info-value">{staff.maxCaseloadMinutes} min/week</div>
                  </div>
                )}
                <div className="info-item">
                  <div className="info-label">Blocked Times</div>
                  <div className="info-value">
                    {staff.blockedTimes.length > 0
                      ? staff.blockedTimes.map((bt) => bt.label || 'Blocked').join(', ')
                      : 'None'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h3 className="card-title">Weekly Schedule</h3>
            </div>
            <div className="card-body">
              {assignments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No Assignments</div>
                  <p className="empty-state-description">
                    This staff member has no schedule assignments yet. Use the Schedule Builder to assign students.
                  </p>
                </div>
              ) : (
                <div className="weekly-schedule">
                  <div className="schedule-grid">
                    {ALL_DAYS.map((day) => (
                      <div key={day} className="schedule-day">
                        <div className="day-header">{DAY_OF_WEEK_SHORT[day]}</div>
                        <div className="day-slots">
                          {/* Lunch block */}
                          <div className="schedule-slot schedule-slot--lunch">
                            <div className="slot-time">
                              {formatTime(staff.lunchWindow.startTime)}
                            </div>
                            <div className="slot-content">Lunch</div>
                          </div>

                          {assignmentsByDay[day].map((assignment) => {
                            const student = getStudentById(assignment.studentId);
                            const classroom = assignment.classroomId
                              ? getClassroomById(assignment.classroomId)
                              : null;

                            // Find the service
                            const service = student?.services.find(
                              (s) => s.id === assignment.studentServiceId
                            );

                            return (
                              <div
                                key={assignment.id}
                                className={`schedule-slot schedule-slot--${assignment.location}`}
                              >
                                <div className="slot-time">
                                  {formatTime(assignment.startTime)}
                                </div>
                                <div className="slot-content">
                                  <div className="slot-location">
                                    {assignment.location === 'in_class'
                                      ? classroom
                                        ? `Rm ${classroom.roomNumber}`
                                        : 'In-Class'
                                      : 'Resource'}
                                  </div>
                                  <div className="slot-subject">
                                    {service ? CONTENT_AREA_LABELS[service.contentArea] : 'Service'}
                                  </div>
                                  {student && (
                                    <div className="slot-student">
                                      {student.firstName} {student.lastName.charAt(0)}.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {assignmentsByDay[day].length === 0 && (
                            <div className="no-assignments">No assignments</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Summary</h3>
            </div>
            <div className="card-body">
              <div className="summary-stat">
                <div className="summary-label">Total Assignments</div>
                <div className="summary-value">{assignments.length}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Weekly Minutes</div>
                <div className="summary-value">{totalAssignedMinutes} min</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Students Served</div>
                <div className="summary-value">{uniqueStudentIds.length}</div>
              </div>
              {staff.maxCaseloadMinutes && (
                <div className="summary-stat">
                  <div className="summary-label">Capacity Used</div>
                  <div className={`summary-value ${totalAssignedMinutes > staff.maxCaseloadMinutes ? 'text-error' : 'text-success'}`}>
                    {Math.round((totalAssignedMinutes / staff.maxCaseloadMinutes) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {uniqueStudentIds.length > 0 && (
            <div className="card mt-4">
              <div className="card-header">
                <h3 className="card-title">Students</h3>
              </div>
              <div className="card-body">
                <ul className="student-list-compact">
                  {uniqueStudentIds.map((studentId) => {
                    const student = getStudentById(studentId);
                    if (!student) return null;
                    return (
                      <li key={studentId}>
                        {student.lastName}, {student.firstName}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffDetail;
