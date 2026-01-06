// ============================================
// BASE TYPES
// ============================================

export type SchoolLevel = 'elementary' | 'secondary';
export type SchoolType = 'elementary' | 'middle' | 'high';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type ContentArea =
  | 'ela'
  | 'math'
  | 'science'
  | 'social_studies'
  | 'specials'
  | 'lunch'
  | 'recess'
  | 'social_skills'
  | 'other';

export type DeliveryModel =
  | 'co_teaching'
  | 'support_facilitation'
  | 'resource_room';

export type ServiceCategory =
  | 'instructional'
  | 'related';

export type StaffType =
  | 'ese_teacher'
  | 'paraprofessional'
  | 'speech_therapist'
  | 'occupational_therapist'
  | 'physical_therapist'
  | 'other_related_service';

export type ConflictType =
  | 'staff_double_booked'
  | 'student_wrong_content_block'
  | 'resource_room_over_capacity'
  | 'staff_lunch_conflict'
  | 'iep_minutes_not_met'
  | 'student_double_booked';

export type ComplianceLevel = 'compliant' | 'warning' | 'non_compliant';

export type ServiceLocation = 'in_class' | 'resource_room';

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export interface Period {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isInstructional: boolean;
  durationMinutes: number;
}

export interface BellSchedule {
  id: string;
  schoolType: SchoolType;
  name: string;
  gradeLevels: string[];
  periods: Period[];
  totalInstructionalMinutes: number;
}

// ============================================
// SCHOOL & BELL SCHEDULE TYPES
// ============================================

export interface School {
  id: string;
  name: string;
  level: SchoolLevel;
  schoolType: SchoolType;
  gradeLevels: string[];
  bellSchedule: WeeklyBellSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyBellSchedule {
  id: string;
  schoolId: string;
  regularStartTime: string;
  regularEndTime: string;
  earlyDismissalDays: DayOfWeek[];
  earlyDismissalEndTime: string;
}

// ============================================
// CLASSROOM TYPES
// ============================================

export interface Classroom {
  id: string;
  schoolId: string;
  teacherName: string;
  roomNumber: string;
  gradeLevel: string;
  contentBlocks: ContentBlock[];
}

export interface ContentBlock {
  id: string;
  classroomId: string;
  contentArea: ContentArea;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  daysOfWeek: DayOfWeek[];
}

// ============================================
// STUDENT & SERVICE TYPES
// ============================================

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  gradeLevel: string;
  schoolId: string;
  classroomId: string;
  services: StudentService[];
  hasOneToOneParapro: boolean;
  paraprofessionalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentService {
  id: string;
  studentId: string;
  contentArea: ContentArea;
  deliveryModel: DeliveryModel;
  minutesPerSession: number;
  frequencyPerWeek: number;
  totalWeeklyMinutes: number;
  iepRequiredMinutes: number;
  serviceCategory: ServiceCategory;
}

// ============================================
// STAFF TYPES
// ============================================

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  staffType: StaffType;
  certifications: string[];
  schoolId: string;
  lunchWindow: TimeWindow;
  blockedTimes: TimeWindow[];
  maxCaseloadMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeWindow {
  id: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  label?: string;
}

// ============================================
// SCHEDULE ASSIGNMENT TYPES
// ============================================

export interface ScheduleAssignment {
  id: string;
  studentServiceId: string;
  studentId: string;
  staffId: string;
  classroomId?: string;
  location: ServiceLocation;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  groupId?: string;
}

export interface ResourceRoomGroup {
  id: string;
  name: string;
  staffId: string;
  contentArea: ContentArea;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  studentIds: string[];
  maxCapacity: number;
}

// ============================================
// VALIDATION & COMPLIANCE TYPES
// ============================================

export interface ComplianceStatus {
  studentId: string;
  studentName: string;
  services: ServiceComplianceStatus[];
  overallStatus: ComplianceLevel;
  lrePercentage: number;
}

export interface ServiceComplianceStatus {
  serviceId: string;
  contentArea: ContentArea;
  deliveryModel: DeliveryModel;
  iepRequiredMinutes: number;
  scheduledMinutes: number;
  percentageScheduled: number;
  status: ComplianceLevel;
}

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  description: string;
  affectedEntities: string[];
  suggestedResolution?: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export type ViewType =
  | 'setup'
  | 'classrooms'
  | 'students'
  | 'staff'
  | 'schedule'
  | 'compliance'
  | 'import';

// ============================================
// DISPLAY HELPERS
// ============================================

export const CONTENT_AREA_LABELS: Record<ContentArea, string> = {
  ela: 'ELA',
  math: 'Math',
  science: 'Science',
  social_studies: 'Social Studies',
  specials: 'Specials',
  lunch: 'Lunch',
  recess: 'Recess',
  social_skills: 'Social Skills',
  other: 'Other',
};

export const DELIVERY_MODEL_LABELS: Record<DeliveryModel, string> = {
  co_teaching: 'Co-Teaching',
  support_facilitation: 'Support Facilitation',
  resource_room: 'Resource Room',
};

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  ese_teacher: 'ESE Teacher',
  paraprofessional: 'Paraprofessional',
  speech_therapist: 'Speech Therapist',
  occupational_therapist: 'Occupational Therapist',
  physical_therapist: 'Physical Therapist',
  other_related_service: 'Other Related Service',
};

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export const DAY_OF_WEEK_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

export const ALL_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export const ELEMENTARY_GRADES = ['K', '1', '2', '3', '4', '5'];
export const MIDDLE_GRADES = ['6', '7', '8'];
export const HIGH_GRADES = ['9', '10', '11', '12'];
