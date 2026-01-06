import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  StudentService,
  CONTENT_AREA_LABELS,
  DELIVERY_MODEL_LABELS,
} from '../../types';
import { ServiceModal } from './ServiceModal';
import './Students.css';

interface StudentDetailProps {
  studentId: string;
  onBack: () => void;
}

export function StudentDetail({ studentId, onBack }: StudentDetailProps) {
  const { state, dispatch, getClassroomById, getAssignmentsByStudent } = useScheduler();
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const student = state.students.find((s) => s.id === studentId);
  const classroom = student ? getClassroomById(student.classroomId) : null;
  const assignments = student ? getAssignmentsByStudent(student.id) : [];

  if (!student) {
    return (
      <div className="student-detail">
        <div className="empty-state">
          <div className="empty-state-title">Student Not Found</div>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteStudent = () => {
    if (confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This will also remove all their service assignments.`)) {
      dispatch({ type: 'DELETE_STUDENT', payload: student.id });
      onBack();
    }
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service? Any schedule assignments for this service will also be removed.')) {
      dispatch({
        type: 'DELETE_SERVICE',
        payload: { studentId: student.id, serviceId },
      });
    }
  };

  const calculateLREPercentage = (): number => {
    if (!state.school) return 100;

    // Calculate total school day minutes
    const [startHours, startMins] = state.school.bellSchedule.regularStartTime.split(':').map(Number);
    const [endHours, endMins] = state.school.bellSchedule.regularEndTime.split(':').map(Number);
    const totalSchoolMinutes = (endHours * 60 + endMins) - (startHours * 60 + startMins);
    const weeklySchoolMinutes = totalSchoolMinutes * 5;

    // Calculate resource room minutes per week
    const resourceRoomMinutes = student.services
      .filter((s) => s.deliveryModel === 'resource_room')
      .reduce((sum, s) => sum + s.totalWeeklyMinutes, 0);

    // LRE = time in general ed / total time
    const generalEdMinutes = weeklySchoolMinutes - resourceRoomMinutes;
    return Math.round((generalEdMinutes / weeklySchoolMinutes) * 100);
  };

  const totalIEPMinutes = student.services.reduce((sum, s) => sum + s.iepRequiredMinutes, 0);
  const totalScheduledMinutes = student.services.reduce((sum, s) => sum + s.totalWeeklyMinutes, 0);
  const lrePercentage = calculateLREPercentage();

  return (
    <div className="student-detail">
      <div className="detail-header">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          Back to Students
        </button>
        <div className="detail-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
          {isEditing && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteStudent}>
              Delete Student
            </button>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {student.firstName} {student.lastName}
              </h2>
              {student.hasOneToOneParapro && (
                <span className="badge badge-info">1:1 Paraprofessional</span>
              )}
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Student ID</div>
                  <div className="info-value">{student.studentId}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Grade</div>
                  <div className="info-value">{student.gradeLevel}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Classroom</div>
                  <div className="info-value">
                    {classroom
                      ? `${classroom.teacherName} (Room ${classroom.roomNumber})`
                      : 'Unassigned'}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">LRE Percentage</div>
                  <div className="info-value">
                    <span className={lrePercentage >= 80 ? 'text-success' : 'text-warning'}>
                      {lrePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h3 className="card-title">Services ({student.services.length})</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddingService(true)}
              >
                Add Service
              </button>
            </div>
            <div className="card-body">
              {student.services.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No Services</div>
                  <p className="empty-state-description">
                    Add services from the student's IEP to begin scheduling.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsAddingService(true)}
                  >
                    Add First Service
                  </button>
                </div>
              ) : (
                <div className="services-list">
                  {student.services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onEdit={() => setEditingServiceId(service.id)}
                      onDelete={() => handleDeleteService(service.id)}
                      showActions={isEditing}
                    />
                  ))}
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
                <div className="summary-label">Total IEP Minutes</div>
                <div className="summary-value">{totalIEPMinutes} min/week</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Scheduled Minutes</div>
                <div className="summary-value">{totalScheduledMinutes} min/week</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Schedule Assignments</div>
                <div className="summary-value">{assignments.length}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">LRE</div>
                <div className={`summary-value ${lrePercentage >= 80 ? 'text-success' : 'text-warning'}`}>
                  {lrePercentage}%
                </div>
              </div>
            </div>
          </div>

          {classroom && classroom.contentBlocks.length > 0 && (
            <div className="card mt-4">
              <div className="card-header">
                <h3 className="card-title">Classroom Schedule</h3>
              </div>
              <div className="card-body">
                <div className="classroom-schedule-preview">
                  {[...classroom.contentBlocks]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((block) => (
                      <div key={block.id} className="schedule-block-preview">
                        <span className="block-preview-time">
                          {formatTime(block.startTime)}
                        </span>
                        <span className="block-preview-label">
                          {CONTENT_AREA_LABELS[block.contentArea]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddingService && (
        <ServiceModal
          studentId={student.id}
          onClose={() => setIsAddingService(false)}
        />
      )}

      {editingServiceId && (
        <ServiceModal
          studentId={student.id}
          serviceId={editingServiceId}
          onClose={() => setEditingServiceId(null)}
        />
      )}
    </div>
  );
}

interface ServiceCardProps {
  service: StudentService;
  onEdit: () => void;
  onDelete: () => void;
  showActions: boolean;
}

function ServiceCard({ service, onEdit, onDelete, showActions }: ServiceCardProps) {
  return (
    <div className="service-card">
      <div className="service-header">
        <div className="service-title">
          {CONTENT_AREA_LABELS[service.contentArea]}
        </div>
        <span className="badge badge-neutral">
          {DELIVERY_MODEL_LABELS[service.deliveryModel]}
        </span>
      </div>
      <div className="service-details">
        <div className="service-detail">
          <span className="detail-label">Per Session:</span>
          <span className="detail-value">{service.minutesPerSession} min</span>
        </div>
        <div className="service-detail">
          <span className="detail-label">Frequency:</span>
          <span className="detail-value">{service.frequencyPerWeek}x/week</span>
        </div>
        <div className="service-detail">
          <span className="detail-label">Weekly Total:</span>
          <span className="detail-value">{service.totalWeeklyMinutes} min</span>
        </div>
        <div className="service-detail">
          <span className="detail-label">IEP Required:</span>
          <span className="detail-value">{service.iepRequiredMinutes} min</span>
        </div>
      </div>
      {showActions && (
        <div className="service-actions">
          <button className="btn btn-sm btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default StudentDetail;
