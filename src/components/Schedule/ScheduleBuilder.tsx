import { useState, useMemo } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  DayOfWeek,
  ALL_DAYS,
  DAY_OF_WEEK_SHORT,
  CONTENT_AREA_LABELS,
  DELIVERY_MODEL_LABELS,
} from '../../types';
import { AssignmentModal } from './AssignmentModal';
import './Schedule.css';

type ViewMode = 'staff' | 'students' | 'unscheduled';

export function ScheduleBuilder() {
  const { state } = useScheduler();
  const [viewMode, setViewMode] = useState<ViewMode>('unscheduled');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedServiceForAssignment, setSelectedServiceForAssignment] = useState<{
    studentId: string;
    serviceId: string;
  } | null>(null);

  if (!state.school) {
    return (
      <div className="schedule-builder">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before building schedules.
          </p>
        </div>
      </div>
    );
  }

  // Get unscheduled services
  const unscheduledServices = useMemo(() => {
    const services: Array<{
      studentId: string;
      studentName: string;
      serviceId: string;
      contentArea: string;
      deliveryModel: string;
      minutesPerSession: number;
      frequencyPerWeek: number;
      scheduledDays: number;
    }> = [];

    state.students.forEach((student) => {
      student.services.forEach((service) => {
        const assignmentsForService = state.assignments.filter(
          (a) => a.studentServiceId === service.id
        );
        const scheduledDays = new Set(assignmentsForService.map((a) => a.dayOfWeek)).size;

        if (scheduledDays < service.frequencyPerWeek) {
          services.push({
            studentId: student.id,
            studentName: `${student.lastName}, ${student.firstName}`,
            serviceId: service.id,
            contentArea: CONTENT_AREA_LABELS[service.contentArea],
            deliveryModel: DELIVERY_MODEL_LABELS[service.deliveryModel],
            minutesPerSession: service.minutesPerSession,
            frequencyPerWeek: service.frequencyPerWeek,
            scheduledDays,
          });
        }
      });
    });

    return services.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [state.students, state.assignments]);

  const handleAssignService = (studentId: string, serviceId: string) => {
    setSelectedServiceForAssignment({ studentId, serviceId });
    setIsAssigning(true);
  };

  return (
    <div className="schedule-builder">
      <div className="builder-header">
        <div>
          <h2>Schedule Builder</h2>
          <p>Assign students to staff and manage the master schedule.</p>
        </div>
        <div className="view-switcher">
          <button
            className={`view-btn ${viewMode === 'unscheduled' ? 'view-btn--active' : ''}`}
            onClick={() => setViewMode('unscheduled')}
          >
            Unscheduled ({unscheduledServices.length})
          </button>
          <button
            className={`view-btn ${viewMode === 'staff' ? 'view-btn--active' : ''}`}
            onClick={() => setViewMode('staff')}
          >
            By Staff
          </button>
          <button
            className={`view-btn ${viewMode === 'students' ? 'view-btn--active' : ''}`}
            onClick={() => setViewMode('students')}
          >
            By Student
          </button>
        </div>
      </div>

      <div className="builder-content">
        {viewMode === 'unscheduled' && (
          <UnscheduledView
            services={unscheduledServices}
            onAssign={handleAssignService}
          />
        )}

        {viewMode === 'staff' && (
          <StaffScheduleView
            selectedStaffId={selectedStaffId}
            onSelectStaff={setSelectedStaffId}
          />
        )}

        {viewMode === 'students' && (
          <StudentScheduleView />
        )}
      </div>

      {isAssigning && selectedServiceForAssignment && (
        <AssignmentModal
          studentId={selectedServiceForAssignment.studentId}
          serviceId={selectedServiceForAssignment.serviceId}
          onClose={() => {
            setIsAssigning(false);
            setSelectedServiceForAssignment(null);
          }}
        />
      )}
    </div>
  );
}

interface UnscheduledViewProps {
  services: Array<{
    studentId: string;
    studentName: string;
    serviceId: string;
    contentArea: string;
    deliveryModel: string;
    minutesPerSession: number;
    frequencyPerWeek: number;
    scheduledDays: number;
  }>;
  onAssign: (studentId: string, serviceId: string) => void;
}

function UnscheduledView({ services, onAssign }: UnscheduledViewProps) {
  if (services.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">All Services Scheduled</div>
        <p className="empty-state-description">
          All student services have been fully scheduled. Use the Staff or Student views to review assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="unscheduled-view">
      <div className="section-header">
        <h3>Services Needing Scheduling</h3>
        <span className="section-count">{services.length} service{services.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Service</th>
              <th>Model</th>
              <th>Duration</th>
              <th>Frequency</th>
              <th>Scheduled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={`${service.studentId}-${service.serviceId}`}>
                <td className="student-name">{service.studentName}</td>
                <td>{service.contentArea}</td>
                <td>
                  <span className="badge badge-neutral">{service.deliveryModel}</span>
                </td>
                <td>{service.minutesPerSession} min</td>
                <td>{service.frequencyPerWeek}x/week</td>
                <td>
                  <span className={service.scheduledDays === 0 ? 'text-error' : 'text-warning'}>
                    {service.scheduledDays}/{service.frequencyPerWeek} days
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onAssign(service.studentId, service.serviceId)}
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StaffScheduleViewProps {
  selectedStaffId: string | null;
  onSelectStaff: (id: string | null) => void;
}

function StaffScheduleView({ selectedStaffId, onSelectStaff }: StaffScheduleViewProps) {
  const { state, getAssignmentsByStaff, getStudentById, getClassroomById } = useScheduler();

  const selectedStaff = selectedStaffId ? state.staff.find((s) => s.id === selectedStaffId) : null;
  const assignments = selectedStaff ? getAssignmentsByStaff(selectedStaff.id) : [];

  const assignmentsByDay = ALL_DAYS.reduce((acc, day) => {
    acc[day] = assignments
      .filter((a) => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<DayOfWeek, typeof assignments>);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="staff-schedule-view">
      <div className="staff-selector">
        <label className="form-label">Select Staff Member</label>
        <select
          className="form-select"
          value={selectedStaffId || ''}
          onChange={(e) => onSelectStaff(e.target.value || null)}
        >
          <option value="">Choose a staff member...</option>
          {state.staff.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.lastName}, {staff.firstName}
            </option>
          ))}
        </select>
      </div>

      {selectedStaff ? (
        <div className="weekly-grid">
          <div className="grid-header">
            {ALL_DAYS.map((day) => (
              <div key={day} className="grid-header-cell">
                {DAY_OF_WEEK_SHORT[day]}
              </div>
            ))}
          </div>
          <div className="grid-body">
            {ALL_DAYS.map((day) => (
              <div key={day} className="grid-column">
                {/* Lunch indicator */}
                <div className="grid-slot grid-slot--lunch">
                  <span className="slot-label">Lunch</span>
                  <span className="slot-time">
                    {formatTime(selectedStaff.lunchWindow.startTime)}
                  </span>
                </div>

                {assignmentsByDay[day].length === 0 ? (
                  <div className="no-assignments-cell">No assignments</div>
                ) : (
                  assignmentsByDay[day].map((assignment) => {
                    const student = getStudentById(assignment.studentId);
                    const classroom = assignment.classroomId
                      ? getClassroomById(assignment.classroomId)
                      : null;
                    const service = student?.services.find(
                      (s) => s.id === assignment.studentServiceId
                    );

                    return (
                      <div
                        key={assignment.id}
                        className={`grid-slot grid-slot--${assignment.location}`}
                      >
                        <span className="slot-time">
                          {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}
                        </span>
                        <span className="slot-label">
                          {service ? CONTENT_AREA_LABELS[service.contentArea] : 'Service'}
                        </span>
                        <span className="slot-detail">
                          {assignment.location === 'in_class'
                            ? classroom
                              ? `Rm ${classroom.roomNumber}`
                              : 'In-Class'
                            : 'Resource Room'}
                        </span>
                        {student && (
                          <span className="slot-student">
                            {student.firstName} {student.lastName.charAt(0)}.
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-title">Select a Staff Member</div>
          <p className="empty-state-description">
            Choose a staff member from the dropdown to view their schedule.
          </p>
        </div>
      )}
    </div>
  );
}

function StudentScheduleView() {
  const { state, getAssignmentsByStudent, getStaffById, getClassroomById } = useScheduler();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const selectedStudent = selectedStudentId
    ? state.students.find((s) => s.id === selectedStudentId)
    : null;
  const assignments = selectedStudent ? getAssignmentsByStudent(selectedStudent.id) : [];

  const assignmentsByDay = ALL_DAYS.reduce((acc, day) => {
    acc[day] = assignments
      .filter((a) => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<DayOfWeek, typeof assignments>);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="student-schedule-view">
      <div className="student-selector">
        <label className="form-label">Select Student</label>
        <select
          className="form-select"
          value={selectedStudentId || ''}
          onChange={(e) => setSelectedStudentId(e.target.value || null)}
        >
          <option value="">Choose a student...</option>
          {state.students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.lastName}, {student.firstName}
            </option>
          ))}
        </select>
      </div>

      {selectedStudent ? (
        <div className="weekly-grid">
          <div className="grid-header">
            {ALL_DAYS.map((day) => (
              <div key={day} className="grid-header-cell">
                {DAY_OF_WEEK_SHORT[day]}
              </div>
            ))}
          </div>
          <div className="grid-body">
            {ALL_DAYS.map((day) => (
              <div key={day} className="grid-column">
                {assignmentsByDay[day].length === 0 ? (
                  <div className="no-assignments-cell">No services</div>
                ) : (
                  assignmentsByDay[day].map((assignment) => {
                    const staff = getStaffById(assignment.staffId);
                    const classroom = assignment.classroomId
                      ? getClassroomById(assignment.classroomId)
                      : null;
                    const service = selectedStudent.services.find(
                      (s) => s.id === assignment.studentServiceId
                    );

                    return (
                      <div
                        key={assignment.id}
                        className={`grid-slot grid-slot--${assignment.location}`}
                      >
                        <span className="slot-time">
                          {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}
                        </span>
                        <span className="slot-label">
                          {service ? CONTENT_AREA_LABELS[service.contentArea] : 'Service'}
                        </span>
                        <span className="slot-detail">
                          {assignment.location === 'in_class'
                            ? classroom
                              ? `Rm ${classroom.roomNumber}`
                              : 'In-Class'
                            : 'Resource Room'}
                        </span>
                        {staff && (
                          <span className="slot-staff">
                            {staff.firstName} {staff.lastName.charAt(0)}.
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-title">Select a Student</div>
          <p className="empty-state-description">
            Choose a student from the dropdown to view their service schedule.
          </p>
        </div>
      )}
    </div>
  );
}

export default ScheduleBuilder;
