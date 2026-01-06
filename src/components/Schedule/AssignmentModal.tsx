import { useState, useMemo } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  DayOfWeek,
  ALL_DAYS,
  DAY_OF_WEEK_LABELS,
  CONTENT_AREA_LABELS,
  DELIVERY_MODEL_LABELS,
  ServiceLocation,
} from '../../types';

interface AssignmentModalProps {
  studentId: string;
  serviceId: string;
  onClose: () => void;
}

export function AssignmentModal({ studentId, serviceId, onClose }: AssignmentModalProps) {
  const { state, getStudentById, getClassroomById, createAssignment } = useScheduler();

  const student = getStudentById(studentId);
  const service = student?.services.find((s) => s.id === serviceId);
  const classroom = student ? getClassroomById(student.classroomId) : null;

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | ''>('');
  const [startTime, setStartTime] = useState('');
  const [location, setLocation] = useState<ServiceLocation>('in_class');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get existing assignments for this service to show which days are already scheduled
  const existingAssignments = useMemo(() => {
    return state.assignments.filter((a) => a.studentServiceId === serviceId);
  }, [state.assignments, serviceId]);

  const scheduledDays = new Set(existingAssignments.map((a) => a.dayOfWeek));
  const remainingDays = service ? service.frequencyPerWeek - scheduledDays.size : 0;

  // Filter staff by content area certification
  const eligibleStaff = useMemo(() => {
    if (!service) return [];
    return state.staff.filter((staff) =>
      staff.certifications.includes(service.contentArea)
    );
  }, [state.staff, service]);

  // Get available time slots based on classroom schedule and staff availability
  const availableSlots = useMemo(() => {
    if (!selectedStaffId || !selectedDay || !classroom || !service) return [];

    const selectedStaff = state.staff.find((s) => s.id === selectedStaffId);
    if (!selectedStaff) return [];

    // Get content blocks for the selected day
    const dayBlocks = classroom.contentBlocks
      .filter((block) => block.daysOfWeek.includes(selectedDay))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find blocks that match the service content area (for in-class) or any time (for resource)
    const slots: Array<{ startTime: string; endTime: string; label: string }> = [];

    if (location === 'in_class') {
      // For in-class, find matching content blocks
      dayBlocks
        .filter((block) => block.contentArea === service.contentArea)
        .forEach((block) => {
          slots.push({
            startTime: block.startTime,
            endTime: block.endTime,
            label: `${formatTime(block.startTime)} - ${formatTime(block.endTime)} (${CONTENT_AREA_LABELS[block.contentArea]})`,
          });
        });
    } else {
      // For resource room, show available time slots based on staff availability
      // Generate 30-minute slots throughout the day
      const dayStart = '08:00';
      const dayEnd = '15:00';
      let current = dayStart;

      while (current < dayEnd) {
        const slotEnd = addMinutes(current, service.minutesPerSession);
        if (slotEnd <= dayEnd) {
          // Check if slot conflicts with staff lunch
          const lunchStart = selectedStaff.lunchWindow.startTime;
          const lunchEnd = selectedStaff.lunchWindow.endTime;

          if (!(current < lunchEnd && slotEnd > lunchStart)) {
            slots.push({
              startTime: current,
              endTime: slotEnd,
              label: `${formatTime(current)} - ${formatTime(slotEnd)}`,
            });
          }
        }
        current = addMinutes(current, 30);
      }
    }

    return slots;
  }, [selectedStaffId, selectedDay, classroom, service, location, state.staff]);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedStaffId) {
      newErrors.staff = 'Please select a staff member';
    }

    if (!selectedDay) {
      newErrors.day = 'Please select a day';
    } else if (scheduledDays.has(selectedDay)) {
      newErrors.day = 'This service is already scheduled for this day';
    }

    if (!startTime) {
      newErrors.time = 'Please select a time slot';
    }

    // Check for staff conflicts
    if (selectedStaffId && selectedDay && startTime && service) {
      const endTime = addMinutes(startTime, service.minutesPerSession);
      const staffConflicts = state.assignments.filter(
        (a) =>
          a.staffId === selectedStaffId &&
          a.dayOfWeek === selectedDay &&
          ((startTime >= a.startTime && startTime < a.endTime) ||
            (endTime > a.startTime && endTime <= a.endTime) ||
            (startTime <= a.startTime && endTime >= a.endTime))
      );

      if (staffConflicts.length > 0) {
        newErrors.time = 'Staff member has a conflict at this time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !service || !selectedDay) return;

    const endTime = addMinutes(startTime, service.minutesPerSession);

    createAssignment({
      studentId,
      staffId: selectedStaffId,
      studentServiceId: serviceId,
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      location,
      classroomId: location === 'in_class' ? student?.classroomId : undefined,
    });

    onClose();
  };

  if (!student || !service) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Schedule Service</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Service Info */}
            <div className="assignment-info">
              <div className="info-row">
                <span className="info-label">Student:</span>
                <span className="info-value">
                  {student.firstName} {student.lastName}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Service:</span>
                <span className="info-value">
                  {CONTENT_AREA_LABELS[service.contentArea]} - {DELIVERY_MODEL_LABELS[service.deliveryModel]}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration:</span>
                <span className="info-value">{service.minutesPerSession} minutes</span>
              </div>
              <div className="info-row">
                <span className="info-label">Progress:</span>
                <span className="info-value">
                  {scheduledDays.size}/{service.frequencyPerWeek} days scheduled
                  {remainingDays > 0 && ` (${remainingDays} remaining)`}
                </span>
              </div>
            </div>

            {/* Staff Selection */}
            <div className="form-group">
              <label className="form-label">Staff Member *</label>
              <select
                className={`form-select ${errors.staff ? 'form-input--error' : ''}`}
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setStartTime('');
                }}
              >
                <option value="">Select staff member...</option>
                {eligibleStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.lastName}, {staff.firstName} ({staff.staffType === 'ese_teacher' ? 'Teacher' : 'Para'})
                  </option>
                ))}
              </select>
              {errors.staff && <span className="form-error">{errors.staff}</span>}
              {eligibleStaff.length === 0 && (
                <span className="form-hint text-warning">
                  No staff members are certified for {CONTENT_AREA_LABELS[service.contentArea]}
                </span>
              )}
            </div>

            {/* Location Selection */}
            <div className="form-group">
              <label className="form-label">Location *</label>
              <div className="radio-group-horizontal">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="location"
                    value="in_class"
                    checked={location === 'in_class'}
                    onChange={() => {
                      setLocation('in_class');
                      setStartTime('');
                    }}
                  />
                  <span>In-Class (Gen Ed)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="location"
                    value="resource_room"
                    checked={location === 'resource_room'}
                    onChange={() => {
                      setLocation('resource_room');
                      setStartTime('');
                    }}
                  />
                  <span>Resource Room</span>
                </label>
              </div>
            </div>

            {/* Day Selection */}
            <div className="form-group">
              <label className="form-label">Day of Week *</label>
              <select
                className={`form-select ${errors.day ? 'form-input--error' : ''}`}
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value as DayOfWeek);
                  setStartTime('');
                }}
              >
                <option value="">Select day...</option>
                {ALL_DAYS.map((day) => (
                  <option
                    key={day}
                    value={day}
                    disabled={scheduledDays.has(day)}
                  >
                    {DAY_OF_WEEK_LABELS[day]}
                    {scheduledDays.has(day) ? ' (already scheduled)' : ''}
                  </option>
                ))}
              </select>
              {errors.day && <span className="form-error">{errors.day}</span>}
            </div>

            {/* Time Slot Selection */}
            <div className="form-group">
              <label className="form-label">Time Slot *</label>
              {!selectedStaffId || !selectedDay ? (
                <p className="form-hint">Select staff and day first to see available slots</p>
              ) : availableSlots.length === 0 ? (
                <p className="form-hint text-warning">
                  No available time slots for this configuration
                </p>
              ) : (
                <select
                  className={`form-select ${errors.time ? 'form-input--error' : ''}`}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  <option value="">Select time slot...</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              )}
              {errors.time && <span className="form-error">{errors.time}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedStaffId || !selectedDay || !startTime}
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignmentModal;
