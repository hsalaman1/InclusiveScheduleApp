import { useMemo } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { validateSchedule, calculateLREPercentage, getStudentCompliance } from '../../utils/validation';
import { CONTENT_AREA_LABELS, ContentArea } from '../../types';
import './Compliance.css';

export function Compliance() {
  const { state, updateConflicts } = useScheduler();

  // Run validation and update state
  const conflicts = useMemo(() => {
    const newConflicts = validateSchedule(state);
    // Update conflicts in state (debounced)
    setTimeout(() => updateConflicts(newConflicts), 0);
    return newConflicts;
  }, [state.assignments, state.students, state.staff, state.classrooms]);

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  // Calculate total day minutes from bell schedule
  const totalDayMinutes = useMemo(() => {
    if (!state.school?.bellSchedule) return 360; // default 6 hours
    const start = state.school.bellSchedule.regularStartTime;
    const end = state.school.bellSchedule.regularEndTime;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  }, [state.school]);

  // Student compliance summary
  const studentComplianceData = useMemo(() => {
    return state.students.map((student) => {
      const compliance = getStudentCompliance(student.id, state);
      const lre = calculateLREPercentage(student, state.assignments, totalDayMinutes);
      return {
        student,
        ...compliance,
        lrePercentage: lre,
      };
    });
  }, [state.students, state.assignments, totalDayMinutes]);

  const compliantStudents = studentComplianceData.filter((s) => s.status === 'compliant').length;

  if (!state.school) {
    return (
      <div className="compliance-page">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before viewing compliance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="compliance-page">
      <div className="page-header">
        <h2>Compliance Dashboard</h2>
        <p>Monitor IEP compliance and resolve scheduling conflicts.</p>
      </div>

      {/* Summary Cards */}
      <div className="compliance-summary">
        <div className={`summary-card ${errorCount > 0 ? 'summary-card--error' : 'summary-card--success'}`}>
          <div className="summary-value">{errorCount}</div>
          <div className="summary-label">Errors</div>
        </div>
        <div className={`summary-card ${warningCount > 0 ? 'summary-card--warning' : 'summary-card--success'}`}>
          <div className="summary-value">{warningCount}</div>
          <div className="summary-label">Warnings</div>
        </div>
        <div className="summary-card summary-card--info">
          <div className="summary-value">{state.students.length}</div>
          <div className="summary-label">Total Students</div>
        </div>
        <div className="summary-card summary-card--success">
          <div className="summary-value">{compliantStudents}</div>
          <div className="summary-label">Compliant</div>
        </div>
      </div>

      <div className="compliance-content">
        {/* Conflicts Section */}
        <section className="compliance-section">
          <div className="section-header">
            <h3>Active Issues</h3>
            <span className="section-count">
              {conflicts.length} issue{conflicts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {conflicts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Issues Found</div>
              <p className="empty-state-description">
                All schedules are compliant with no conflicts detected.
              </p>
            </div>
          ) : (
            <div className="conflicts-list">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className={`conflict-card conflict-card--${conflict.severity}`}
                >
                  <div className="conflict-header">
                    <span className={`conflict-badge conflict-badge--${conflict.severity}`}>
                      {conflict.severity === 'error' ? 'Error' : 'Warning'}
                    </span>
                    <span className="conflict-type">
                      {formatConflictType(conflict.type)}
                    </span>
                  </div>
                  <p className="conflict-message">{conflict.description}</p>
                  {conflict.suggestedResolution && (
                    <p className="conflict-resolution">
                      <strong>Suggested:</strong> {conflict.suggestedResolution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Student Compliance Table */}
        <section className="compliance-section">
          <div className="section-header">
            <h3>Student Compliance</h3>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>LRE %</th>
                  <th>Minutes</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {studentComplianceData.map(({ student, status, lrePercentage, scheduledMinutes, requiredMinutes, conflicts: studentConflicts }) => (
                  <tr key={student.id}>
                    <td className="student-name">
                      {student.lastName}, {student.firstName}
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${status}`}>
                        {status === 'compliant' ? 'Compliant' : status === 'warning' ? 'Warning' : 'Non-Compliant'}
                      </span>
                    </td>
                    <td>
                      <span className={lrePercentage >= 80 ? 'text-success' : lrePercentage >= 40 ? 'text-warning' : ''}>
                        {lrePercentage}%
                      </span>
                    </td>
                    <td>
                      <span className={scheduledMinutes >= requiredMinutes ? 'text-success' : 'text-warning'}>
                        {scheduledMinutes}/{requiredMinutes}
                      </span>
                    </td>
                    <td>
                      {studentConflicts.length > 0 ? (
                        <span className="issue-count">
                          {studentConflicts.filter((c) => c.severity === 'error').length} errors,{' '}
                          {studentConflicts.filter((c) => c.severity === 'warning').length} warnings
                        </span>
                      ) : (
                        <span className="text-success">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Service Coverage Overview */}
        <section className="compliance-section">
          <div className="section-header">
            <h3>Service Coverage</h3>
          </div>

          <div className="coverage-grid">
            {getServiceCoverageStats(state).map((stat) => (
              <div key={stat.contentArea} className="coverage-card">
                <div className="coverage-header">
                  <span className="coverage-label">{CONTENT_AREA_LABELS[stat.contentArea as ContentArea] || stat.contentArea}</span>
                  <span className={`coverage-percentage ${stat.percentage >= 80 ? 'text-success' : stat.percentage >= 50 ? 'text-warning' : 'text-error'}`}>
                    {stat.percentage}%
                  </span>
                </div>
                <div className="coverage-bar">
                  <div
                    className={`coverage-fill ${stat.percentage >= 80 ? 'fill-success' : stat.percentage >= 50 ? 'fill-warning' : 'fill-error'}`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="coverage-detail">
                  {stat.scheduled}/{stat.total} students scheduled
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatConflictType(type: string): string {
  const labels: Record<string, string> = {
    staff_double_booked: 'Staff Double-Booked',
    student_double_booked: 'Student Double-Booked',
    staff_lunch_conflict: 'Lunch Conflict',
    resource_room_over_capacity: 'Capacity Exceeded',
    iep_minutes_not_met: 'IEP Minutes',
    student_wrong_content_block: 'Wrong Content Block',
  };
  return labels[type] || type;
}

function getServiceCoverageStats(state: any) {
  const contentAreas = ['ela', 'math', 'science', 'social_studies'];
  const stats: Array<{
    contentArea: string;
    total: number;
    scheduled: number;
    percentage: number;
  }> = [];

  contentAreas.forEach((area) => {
    // Count students who need this service
    let totalNeed = 0;
    let fullyScheduled = 0;

    state.students.forEach((student: any) => {
      const service = student.services.find((s: any) => s.contentArea === area);
      if (service) {
        totalNeed++;
        // Check if fully scheduled
        const assignments = state.assignments.filter(
          (a: any) => a.studentServiceId === service.id
        );
        const scheduledDays = new Set(assignments.map((a: any) => a.dayOfWeek)).size;
        if (scheduledDays >= service.frequencyPerWeek) {
          fullyScheduled++;
        }
      }
    });

    if (totalNeed > 0) {
      stats.push({
        contentArea: area,
        total: totalNeed,
        scheduled: fullyScheduled,
        percentage: Math.round((fullyScheduled / totalNeed) * 100),
      });
    }
  });

  return stats;
}

export default Compliance;
