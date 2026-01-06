import {
  ScheduleConflict,
  ConflictType,
  ScheduleAssignment,
  Student,
} from '../types';
import { SchedulerState } from '../context/SchedulerContext';
// Default resource room max capacity
const DEFAULT_MAX_CAPACITY = 6;

/**
 * Validates the entire schedule and returns all conflicts
 */
export function validateSchedule(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Run all validation checks
  conflicts.push(...checkStaffDoubleBooking(state));
  conflicts.push(...checkStudentDoubleBooking(state));
  conflicts.push(...checkStaffLunchConflicts(state));
  conflicts.push(...checkResourceRoomCapacity(state));
  conflicts.push(...checkIEPMinutesCompliance(state));
  conflicts.push(...checkWrongContentBlockAssignments(state));

  return conflicts;
}

/**
 * Check if any staff member is double-booked (two assignments at the same time on the same day)
 */
function checkStaffDoubleBooking(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const staffAssignments = new Map<string, ScheduleAssignment[]>();

  // Group assignments by staff
  state.assignments.forEach((assignment) => {
    const existing = staffAssignments.get(assignment.staffId) || [];
    staffAssignments.set(assignment.staffId, [...existing, assignment]);
  });

  // Check each staff member for overlaps
  staffAssignments.forEach((assignments, staffId) => {
    const staff = state.staff.find((s) => s.id === staffId);
    if (!staff) return;

    // Check each day
    const dayGroups = groupByDay(assignments);
    dayGroups.forEach((dayAssignments, day) => {
      const sorted = dayAssignments.sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        if (timesOverlap(current.startTime, current.endTime, next.startTime, next.endTime)) {
          conflicts.push({
            id: `staff-double-${staffId}-${day}-${current.id}-${next.id}`,
            type: 'staff_double_booked' as ConflictType,
            severity: 'error',
            description: `${staff.firstName} ${staff.lastName} is double-booked on ${formatDay(day)} from ${formatTime(current.startTime)} to ${formatTime(next.endTime)}`,
            affectedEntities: [staffId, current.studentId, next.studentId],
            suggestedResolution: 'Reschedule one of the conflicting assignments to a different time slot',
          });
        }
      }
    });
  });

  return conflicts;
}

/**
 * Check if any student is double-booked (receiving services at the same time)
 */
function checkStudentDoubleBooking(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const studentAssignments = new Map<string, ScheduleAssignment[]>();

  // Group assignments by student
  state.assignments.forEach((assignment) => {
    const existing = studentAssignments.get(assignment.studentId) || [];
    studentAssignments.set(assignment.studentId, [...existing, assignment]);
  });

  // Check each student for overlaps
  studentAssignments.forEach((assignments, studentId) => {
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return;

    const dayGroups = groupByDay(assignments);
    dayGroups.forEach((dayAssignments, day) => {
      const sorted = dayAssignments.sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        if (timesOverlap(current.startTime, current.endTime, next.startTime, next.endTime)) {
          conflicts.push({
            id: `student-double-${studentId}-${day}-${current.id}-${next.id}`,
            type: 'student_double_booked' as ConflictType,
            severity: 'error',
            description: `${student.firstName} ${student.lastName} has overlapping services on ${formatDay(day)}`,
            affectedEntities: [studentId],
            suggestedResolution: 'Adjust service times so they do not overlap',
          });
        }
      }
    });
  });

  return conflicts;
}

/**
 * Check if any assignments conflict with staff lunch windows
 */
function checkStaffLunchConflicts(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  state.assignments.forEach((assignment) => {
    const staff = state.staff.find((s) => s.id === assignment.staffId);
    if (!staff) return;

    const lunchStart = staff.lunchWindow.startTime;
    const lunchEnd = staff.lunchWindow.endTime;

    if (timesOverlap(assignment.startTime, assignment.endTime, lunchStart, lunchEnd)) {
      conflicts.push({
        id: `lunch-conflict-${assignment.id}`,
        type: 'staff_lunch_conflict' as ConflictType,
        severity: 'warning',
        description: `Assignment for ${staff.firstName} ${staff.lastName} overlaps with their lunch window (${formatTime(lunchStart)} - ${formatTime(lunchEnd)})`,
        affectedEntities: [staff.id, assignment.studentId],
        suggestedResolution: 'Move the assignment outside the staff lunch window',
      });
    }
  });

  return conflicts;
}

/**
 * Check if any resource room time slot exceeds capacity
 */
function checkResourceRoomCapacity(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Get all resource room assignments
  const resourceAssignments = state.assignments.filter((a) => a.location === 'resource_room');

  // Group by staff, day, and time slot
  const timeSlots = new Map<string, ScheduleAssignment[]>();

  resourceAssignments.forEach((assignment) => {
    const key = `${assignment.staffId}-${assignment.dayOfWeek}-${assignment.startTime}`;
    const existing = timeSlots.get(key) || [];
    timeSlots.set(key, [...existing, assignment]);
  });

  // Check each time slot for capacity
  timeSlots.forEach((assignments, key) => {
    if (assignments.length > DEFAULT_MAX_CAPACITY) {
      const [staffId, day] = key.split('-');
      const staff = state.staff.find((s) => s.id === staffId);
      const studentIds = assignments.map((a) => a.studentId);

      conflicts.push({
        id: `capacity-${key}`,
        type: 'resource_room_over_capacity' as ConflictType,
        severity: 'error',
        description: `Resource room for ${staff?.firstName || 'Unknown'} ${staff?.lastName || ''} on ${formatDay(day)} at ${formatTime(assignments[0].startTime)} has ${assignments.length} students (max ${DEFAULT_MAX_CAPACITY})`,
        affectedEntities: [staffId, ...studentIds],
        suggestedResolution: `Remove ${assignments.length - DEFAULT_MAX_CAPACITY} student(s) from this time slot or create an additional group`,
      });
    }
  });

  return conflicts;
}

/**
 * Check if students are receiving their IEP-required minutes
 */
function checkIEPMinutesCompliance(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  state.students.forEach((student) => {
    student.services.forEach((service) => {
      // Get all assignments for this service
      const serviceAssignments = state.assignments.filter(
        (a) => a.studentServiceId === service.id
      );

      // Calculate scheduled days (unique days)
      const scheduledDays = new Set(serviceAssignments.map((a) => a.dayOfWeek)).size;

      // Calculate actual scheduled minutes
      const scheduledMinutes = serviceAssignments.reduce((total, assignment) => {
        return total + calculateDurationMinutes(assignment.startTime, assignment.endTime);
      }, 0);

      // Check if frequency is met
      if (scheduledDays < service.frequencyPerWeek) {
        conflicts.push({
          id: `iep-frequency-${student.id}-${service.id}`,
          type: 'iep_minutes_not_met' as ConflictType,
          severity: scheduledDays === 0 ? 'error' : 'warning',
          description: `${student.firstName} ${student.lastName} is scheduled for ${service.contentArea.toUpperCase()} ${scheduledDays}/${service.frequencyPerWeek} days per week`,
          affectedEntities: [student.id],
          suggestedResolution: `Schedule ${service.frequencyPerWeek - scheduledDays} more day(s) for this service`,
        });
      }

      // Check if total minutes meet IEP requirement
      const iepRequired = service.iepRequiredMinutes || service.totalWeeklyMinutes;
      if (scheduledMinutes < iepRequired) {
        conflicts.push({
          id: `iep-minutes-${student.id}-${service.id}`,
          type: 'iep_minutes_not_met' as ConflictType,
          severity: scheduledMinutes === 0 ? 'error' : 'warning',
          description: `${student.firstName} ${student.lastName} has ${scheduledMinutes}/${iepRequired} weekly minutes scheduled for ${service.contentArea.toUpperCase()}`,
          affectedEntities: [student.id],
          suggestedResolution: `Add ${iepRequired - scheduledMinutes} more minutes of service per week`,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Check if in-class assignments match the classroom content blocks
 */
function checkWrongContentBlockAssignments(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  const inClassAssignments = state.assignments.filter((a) => a.location === 'in_class');

  inClassAssignments.forEach((assignment) => {
    const student = state.students.find((s) => s.id === assignment.studentId);
    if (!student) return;

    const classroom = state.classrooms.find((c) => c.id === student.classroomId);
    if (!classroom) return;

    const service = student.services.find((s) => s.id === assignment.studentServiceId);
    if (!service) return;

    // Find matching content block for this day and time
    const matchingBlock = classroom.contentBlocks.find(
      (block) =>
        block.contentArea === service.contentArea &&
        block.daysOfWeek.includes(assignment.dayOfWeek) &&
        timesOverlap(block.startTime, block.endTime, assignment.startTime, assignment.endTime)
    );

    if (!matchingBlock) {
      conflicts.push({
        id: `wrong-block-${assignment.id}`,
        type: 'student_wrong_content_block' as ConflictType,
        severity: 'warning',
        description: `${student.firstName} ${student.lastName}'s in-class ${service.contentArea.toUpperCase()} service does not align with classroom ${service.contentArea.toUpperCase()} block on ${formatDay(assignment.dayOfWeek)}`,
        affectedEntities: [student.id],
        suggestedResolution: 'Adjust the service time to match the classroom content block schedule',
      });
    }
  });

  return conflicts;
}

// Helper functions

function groupByDay(assignments: ScheduleAssignment[]): Map<string, ScheduleAssignment[]> {
  const groups = new Map<string, ScheduleAssignment[]>();
  assignments.forEach((a) => {
    const existing = groups.get(a.dayOfWeek) || [];
    groups.set(a.dayOfWeek, [...existing, a]);
  });
  return groups;
}

function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDay(day: string): string {
  const dayNames: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
  };
  return dayNames[day] || day;
}

/**
 * Calculate LRE (Least Restrictive Environment) percentage for a student
 * LRE = (Gen Ed minutes / Total day minutes) x 100
 */
export function calculateLREPercentage(
  student: Student,
  assignments: ScheduleAssignment[],
  totalDayMinutes: number
): number {
  if (totalDayMinutes === 0) return 100;

  const studentAssignments = assignments.filter((a) => a.studentId === student.id);

  // Calculate minutes in resource room (out of gen ed)
  const resourceRoomMinutes = studentAssignments
    .filter((a) => a.location === 'resource_room')
    .reduce((total, a) => total + calculateDurationMinutes(a.startTime, a.endTime), 0);

  // Gen Ed minutes = Total day - Resource room time
  const genEdMinutes = totalDayMinutes - resourceRoomMinutes;

  return Math.round((genEdMinutes / totalDayMinutes) * 100);
}

/**
 * Get compliance status based on conflicts
 */
export function getComplianceStatus(
  conflicts: ScheduleConflict[]
): 'compliant' | 'warning' | 'non_compliant' {
  const hasErrors = conflicts.some((c) => c.severity === 'error');
  const hasWarnings = conflicts.some((c) => c.severity === 'warning');

  if (hasErrors) return 'non_compliant';
  if (hasWarnings) return 'warning';
  return 'compliant';
}

/**
 * Get student-specific compliance info
 */
export function getStudentCompliance(
  studentId: string,
  state: SchedulerState
): {
  conflicts: ScheduleConflict[];
  status: 'compliant' | 'warning' | 'non_compliant';
  scheduledMinutes: number;
  requiredMinutes: number;
  compliancePercentage: number;
} {
  const allConflicts = validateSchedule(state);
  const studentConflicts = allConflicts.filter(
    (c) => c.affectedEntities?.includes(studentId)
  );

  const student = state.students.find((s) => s.id === studentId);
  const studentAssignments = state.assignments.filter((a) => a.studentId === studentId);

  let scheduledMinutes = 0;
  let requiredMinutes = 0;

  if (student) {
    student.services.forEach((service) => {
      requiredMinutes += service.iepRequiredMinutes || service.totalWeeklyMinutes;

      const serviceAssignments = studentAssignments.filter(
        (a) => a.studentServiceId === service.id
      );
      serviceAssignments.forEach((a) => {
        scheduledMinutes += calculateDurationMinutes(a.startTime, a.endTime);
      });
    });
  }

  const compliancePercentage = requiredMinutes > 0
    ? Math.min(100, Math.round((scheduledMinutes / requiredMinutes) * 100))
    : 100;

  return {
    conflicts: studentConflicts,
    status: getComplianceStatus(studentConflicts),
    scheduledMinutes,
    requiredMinutes,
    compliancePercentage,
  };
}
