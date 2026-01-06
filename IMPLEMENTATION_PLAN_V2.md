# Inclusive Scheduler - Implementation Plan v2
## Elementary School Scheduling Complexities & District Requirements

**Date:** January 6, 2026
**Status:** DRAFT - Awaiting Review

---

## Executive Summary

This plan addresses the real-world scheduling complexities discovered during consultation with ESE scheduling staff. The current app is a template viewer MVP; this plan transforms it into a functional scheduling tool that handles:

- Elementary vs. Secondary school differences
- Classroom-level "flip schedules"
- Service configuration (content area, delivery model, minutes, frequency)
- Staff assignment and conflict detection
- IEP compliance tracking
- FOCUS CSV import

---

## Phase 1: Data Model Foundation (HIGH PRIORITY)

### 1.1 New Type Definitions

We need to create comprehensive data models to support the scheduling requirements.

**File: `src/types/index.ts`** - Expand with:

```typescript
// ============================================
// SCHOOL & CLASSROOM TYPES
// ============================================

export type SchoolLevel = 'elementary' | 'secondary';
export type SchoolType = 'elementary' | 'middle' | 'high';

export interface School {
  id: string;
  name: string;
  level: SchoolLevel;
  schoolType: SchoolType;
  bellSchedule: WeeklyBellSchedule;
  gradeLevels: string[];
}

export interface WeeklyBellSchedule {
  id: string;
  schoolId: string;
  regularStartTime: string;      // "08:20"
  regularEndTime: string;        // "15:20"
  earlyDismissalDays: DayOfWeek[]; // ['wednesday', 'friday']
  earlyDismissalEndTime: string; // "14:30"
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

// ============================================
// CLASSROOM TYPES (Critical for Elementary)
// ============================================

export interface Classroom {
  id: string;
  schoolId: string;
  teacherName: string;           // General ed teacher
  roomNumber: string;
  gradeLevel: string;            // 'K', '1', '2', etc.
  contentBlocks: ContentBlock[]; // The flip schedule
}

export interface ContentBlock {
  id: string;
  classroomId: string;
  contentArea: ContentArea;
  startTime: string;             // "08:30"
  endTime: string;               // "10:00"
  durationMinutes: number;       // Calculated
  daysOfWeek: DayOfWeek[];       // Which days this block applies
}

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

// ============================================
// STUDENT & SERVICE TYPES
// ============================================

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;             // District ID
  gradeLevel: string;
  schoolId: string;
  classroomId: string;           // Assigned classroom (for flip schedule lookup)
  services: StudentService[];
  hasOneToOneParapro: boolean;
  paraprofessionalId?: string;
}

export interface StudentService {
  id: string;
  studentId: string;
  contentArea: ContentArea;
  deliveryModel: DeliveryModel;
  minutesPerSession: number;
  frequencyPerWeek: number;      // 1-5
  totalWeeklyMinutes: number;    // Calculated: minutes × frequency
  iepRequiredMinutes: number;    // From IEP for compliance check
  serviceCategory: ServiceCategory;
}

export type DeliveryModel =
  | 'co_teaching'
  | 'support_facilitation'
  | 'resource_room';

export type ServiceCategory =
  | 'instructional'              // ELA, Math, Science, SS
  | 'related';                   // Speech, OT, PT

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
  blockedTimes: TimeWindow[];    // Planning periods, duties, etc.
  maxCaseloadMinutes?: number;   // Weekly capacity
}

export type StaffType =
  | 'ese_teacher'
  | 'paraprofessional'
  | 'speech_therapist'
  | 'occupational_therapist'
  | 'physical_therapist'
  | 'other_related_service';

export interface TimeWindow {
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
}

// ============================================
// SCHEDULE ASSIGNMENT TYPES
// ============================================

export interface ScheduleAssignment {
  id: string;
  studentServiceId: string;
  staffId: string;
  classroomId?: string;          // For in-class support
  location: 'in_class' | 'resource_room';
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  groupId?: string;              // For grouping students in resource room
}

export interface ResourceRoomGroup {
  id: string;
  staffId: string;
  contentArea: ContentArea;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  studentIds: string[];
  maxCapacity: number;           // Recommended ratio limit
}

// ============================================
// VALIDATION & COMPLIANCE TYPES
// ============================================

export interface ComplianceStatus {
  studentId: string;
  services: ServiceComplianceStatus[];
  overallStatus: 'compliant' | 'warning' | 'non_compliant';
  lrePercentage: number;         // Auto-calculated
}

export interface ServiceComplianceStatus {
  serviceId: string;
  iepRequiredMinutes: number;
  scheduledMinutes: number;
  percentageScheduled: number;
  status: 'compliant' | 'warning' | 'non_compliant';
}

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  description: string;
  affectedEntities: string[];    // IDs of students/staff involved
  suggestedResolution?: string;
}

export type ConflictType =
  | 'staff_double_booked'
  | 'student_wrong_content_block'
  | 'resource_room_over_capacity'
  | 'staff_lunch_conflict'
  | 'iep_minutes_not_met'
  | 'student_double_booked';
```

### 1.2 Service Duration Matrix

**File: `src/data/serviceDurations.ts`** - New file

```typescript
// Auto-suggest durations based on content area + delivery model
export const SERVICE_DURATION_MATRIX: Record<ContentArea, Record<DeliveryModel, number>> = {
  ela: {
    co_teaching: 45,
    support_facilitation: 45,
    resource_room: 90,
  },
  math: {
    co_teaching: 30,
    support_facilitation: 30,
    resource_room: 60,
  },
  science: {
    co_teaching: 25,
    support_facilitation: 25,
    resource_room: 25,  // Typically in-class only
  },
  social_studies: {
    co_teaching: 10,
    support_facilitation: 10,
    resource_room: 10,  // Typically in-class only
  },
  social_skills: {
    co_teaching: 30,
    support_facilitation: 30,
    resource_room: 30,
  },
  // ... other content areas
};
```

---

## Phase 2: State Management & Persistence (HIGH PRIORITY)

### 2.1 Context-Based State Management

Create a central state management system using React Context.

**File: `src/context/SchedulerContext.tsx`** - New file

```typescript
interface SchedulerState {
  // School setup
  school: School | null;
  classrooms: Classroom[];

  // People
  students: Student[];
  staff: Staff[];

  // Schedule
  assignments: ScheduleAssignment[];
  resourceRoomGroups: ResourceRoomGroup[];

  // Validation
  conflicts: ScheduleConflict[];
  complianceStatuses: ComplianceStatus[];

  // UI State
  currentView: 'setup' | 'classrooms' | 'students' | 'staff' | 'schedule' | 'compliance';
  selectedStudentId: string | null;
  selectedStaffId: string | null;
}
```

### 2.2 localStorage Persistence

**File: `src/utils/storage.ts`** - New file

- Save/load full scheduler state to localStorage
- Auto-save on state changes (debounced)
- Export as JSON for backup
- Import from JSON for restore

---

## Phase 3: Elementary Classroom Schedule Input (HIGH PRIORITY)

### 3.1 School Setup Wizard

**New Component: `src/components/SchoolSetup/SchoolSetupWizard.tsx`**

Step 1: Basic Info
- School name
- School level: Elementary or Secondary (Middle/High)
- Grade levels served

Step 2: Bell Schedule
- Regular start/end times
- Early dismissal days selection (checkboxes for each day)
- Early dismissal end time

Step 3: (Elementary Only) Classroom Setup
- Add classrooms with teacher name, room number, grade level
- For each classroom, define content blocks with times
- Provide "Copy from Template" option for common patterns
- Provide "Copy from Another Classroom" for flip schedules

### 3.2 Classroom Content Block Editor

**New Component: `src/components/ClassroomEditor/ClassroomEditor.tsx`**

Features:
- Visual timeline showing the school day
- Drag-and-drop content blocks
- Validation for overlapping times
- "Flip Schedule" quick action: Swap ELA and Math blocks with one click
- Copy schedule from another classroom

UI Mockup:
```
┌─────────────────────────────────────────────────────────────┐
│ Mrs. Smith - 4th Grade (Room 101)                    [Edit] │
├─────────────────────────────────────────────────────────────┤
│ 8:20  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3:20  │
│       │▓▓▓▓ ELA ▓▓▓▓│░░░│▓▓ Math ▓▓│ L │▓ Sci ▓│▓SS▓│      │
│       8:30      10:00    11:00 12:00     1:00  1:25 1:35    │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Block]  [Copy from Template]  [Flip ELA/Math]        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Classroom Templates

**File: `src/data/classroomTemplates.ts`** - New file

Pre-built templates:
- "Standard Elementary (ELA Morning)"
- "Standard Elementary (Math Morning)" - Flipped version
- Allow schools to save custom templates

---

## Phase 4: Student & Service Management (HIGH PRIORITY)

### 4.1 Student List View

**New Component: `src/components/Students/StudentList.tsx`**

Features:
- Table view of all students
- Columns: Name, Grade, Classroom, # Services, Compliance Status
- Filter by grade, classroom, compliance status
- Search by name
- Quick add button
- Bulk import button (FOCUS CSV)

### 4.2 Student Detail / Service Configuration

**New Component: `src/components/Students/StudentDetail.tsx`**

Features:
- Student info header (name, ID, grade, classroom)
- Services table with add/edit/delete
- Each service row shows:
  - Content Area (dropdown)
  - Delivery Model (dropdown)
  - Minutes per Session (auto-suggested, editable)
  - Frequency (1-5 dropdown)
  - Total Weekly Minutes (calculated, displayed)
  - IEP Required Minutes (input for compliance tracking)
- Paraprofessional assignment section (if 1:1)
- Compliance status summary
- LRE percentage display (auto-calculated)

### 4.3 Service Add/Edit Modal

**New Component: `src/components/Students/ServiceModal.tsx`**

```
┌─────────────────────────────────────────────────────────────┐
│ Add Service for: John Smith                          [X]    │
├─────────────────────────────────────────────────────────────┤
│ Content Area:    [ELA            ▼]                         │
│                                                             │
│ Delivery Model:  [Support Facilitation ▼]                   │
│                                                             │
│ Minutes/Session: [45    ] (Suggested: 45 for ELA In-Class)  │
│                                                             │
│ Frequency:       [5 days/week ▼]                            │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ Total Weekly Minutes: 225                                   │
│ IEP Required Minutes: [225   ]                              │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Service Category: ○ Instructional  ○ Related Service        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Service]       │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Handling Dual Services (In-Class + Resource Room)

For students needing BOTH in-class support AND resource room for the same subject:

**Approach:** Create two separate service records

Example for Student A needing ELA support in both settings:
1. Service 1: ELA → Support Facilitation → 45 min → 5x/week
2. Service 2: ELA → Resource Room → 45 min → 5x/week

The scheduler will place these in different time slots. The compliance checker will sum both when checking IEP minutes.

---

## Phase 5: Staff Management (HIGH PRIORITY)

### 5.1 Staff List View

**New Component: `src/components/Staff/StaffList.tsx`**

Features:
- Table of all ESE staff
- Columns: Name, Type, Certifications, Lunch Time, Assigned Minutes
- Add/edit/delete staff
- Capacity indicator (assigned vs. available minutes)

### 5.2 Staff Detail / Availability

**New Component: `src/components/Staff/StaffDetail.tsx`**

Features:
- Staff info (name, type, certifications)
- Lunch window configuration
- Blocked times (planning, duties)
- Weekly schedule view (what they're assigned to)
- Caseload summary

---

## Phase 6: Schedule Builder & Assignment (HIGH PRIORITY)

### 6.1 Schedule Builder View

**New Component: `src/components/Schedule/ScheduleBuilder.tsx`**

This is the main scheduling interface. Two views:

**View A: By Staff Member**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Ms. Martinez - Weekly Schedule                                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Time     │ Monday   │ Tuesday  │ Wednesday│ Thursday │ Friday           │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ 8:30-9:15│ Rm 101   │ Rm 101   │ Rm 101   │ Rm 101   │ Rm 101           │
│          │ ELA-SF   │ ELA-SF   │ ELA-SF   │ ELA-SF   │ ELA-SF           │
│          │ 3 students│ 3 students│ 3 students│ 3 students│ 3 students    │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ 9:15-10:00│ Rm 102  │ Rm 102   │ Rm 102   │ Rm 102   │ Rm 102           │
│          │ Math-SF  │ Math-SF  │ Math-SF  │ Math-SF  │ Math-SF          │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ 11:30-12:00│ ████ LUNCH ████████████████████████████████████████████████│
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ 1:00-2:30│ Resource │ Resource │ Resource │ Resource │ Resource         │
│          │ ELA      │ ELA      │ ELA-Short│ ELA      │ ELA-Short        │
│          │ 4 students│ 4 students│ 4 students│ 4 students│ 4 students    │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────────────┘
```

**View B: By Student**
Show individual student's weekly service schedule

### 6.2 Assignment Logic

**File: `src/utils/schedulingEngine.ts`** - New file

Functions:
- `findAvailableSlots(student, service)`: Returns possible time slots
  - Looks up student's classroom content blocks
  - Finds staff available during those times
  - Checks resource room capacity if applicable

- `suggestAssignment(student, service)`: Auto-suggest best placement
  - Prioritizes times with existing groups (efficiency)
  - Considers staff workload balance

- `assignService(assignment)`: Create assignment with validation
  - Check all constraints before confirming

### 6.3 New Student Workflow

**New Component: `src/components/Students/NewStudentWizard.tsx`**

Streamlined flow for adding a student mid-schedule:

1. Enter student info + classroom assignment
2. Add services needed
3. System shows available placement options:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ Placement Options for: New Student - ELA Support Fac.      │
   ├─────────────────────────────────────────────────────────────┤
   │ ✓ Option 1: Ms. Martinez, 8:30-9:15 (Rm 101)               │
   │   └─ Joins existing group of 3 students                    │
   │                                                             │
   │ ✓ Option 2: Mr. Thompson, 8:30-9:15 (Rm 101)               │
   │   └─ New assignment (Mr. T has availability)               │
   │                                                             │
   │ ⚠ Option 3: Ms. Martinez, 1:00-1:45 (Resource Room)        │
   │   └─ Warning: Student's ELA block is 8:30-10:00            │
   ├─────────────────────────────────────────────────────────────┤
   │                              [Cancel]  [Assign to Option 1] │
   └─────────────────────────────────────────────────────────────┘
   ```

---

## Phase 7: Conflict Detection & Validation (HIGH PRIORITY)

### 7.1 Validation Engine

**File: `src/utils/validationEngine.ts`** - New file

Real-time validation checks:

```typescript
function validateSchedule(state: SchedulerState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // 1. Staff double-booking
  conflicts.push(...checkStaffDoubleBooking(state));

  // 2. Student scheduled during wrong content block
  conflicts.push(...checkStudentContentBlockAlignment(state));

  // 3. Resource room over capacity
  conflicts.push(...checkResourceRoomCapacity(state));

  // 4. Staff lunch conflicts
  conflicts.push(...checkStaffLunchConflicts(state));

  // 5. Student double-booking
  conflicts.push(...checkStudentDoubleBooking(state));

  return conflicts;
}
```

### 7.2 Conflict Display

**New Component: `src/components/Validation/ConflictList.tsx`**

- List of all current conflicts
- Severity badges (Error = red, Warning = yellow)
- Click to navigate to affected entity
- Suggested resolutions where possible

---

## Phase 8: Compliance Dashboard (MEDIUM PRIORITY)

### 8.1 Dashboard View

**New Component: `src/components/Compliance/ComplianceDashboard.tsx`**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Compliance Overview                                          [Export]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │     45      │  │     12      │  │      3      │  │     60      │    │
│  │  ✓ Green    │  │  ⚠ Yellow   │  │  ✗ Red      │  │   Total     │    │
│  │   100%      │  │   80-99%    │  │   <80%      │  │  Students   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Students Needing Attention                                              │
├──────────────────────┬────────┬────────────┬────────────┬──────────────┤
│ Student              │ Grade  │ Service    │ IEP Mins   │ Scheduled    │
├──────────────────────┼────────┼────────────┼────────────┼──────────────┤
│ ✗ Johnson, Mike      │ 3      │ ELA-RR     │ 450        │ 360 (80%)    │
│ ✗ Williams, Sarah    │ 4      │ Math-SF    │ 150        │ 90 (60%)     │
│ ⚠ Davis, Tom         │ 2      │ ELA-SF     │ 225        │ 180 (80%)    │
└──────────────────────┴────────┴────────────┴────────────┴──────────────┘
```

### 8.2 LRE Auto-Calculation

**Formula:**
```typescript
function calculateLREPercentage(student: Student, assignments: ScheduleAssignment[]): number {
  const totalSchoolMinutes = getTotalSchoolDayMinutes(student.schoolId);

  const resourceRoomMinutes = assignments
    .filter(a => a.studentServiceId === student.id && a.location === 'resource_room')
    .reduce((sum, a) => sum + getDurationMinutes(a), 0);

  const generalEdMinutes = totalSchoolMinutes - resourceRoomMinutes;

  return Math.round((generalEdMinutes / totalSchoolMinutes) * 100);
}
```

Display: "LRE: 85% (student spends 85% of day in general education setting)"

---

## Phase 9: FOCUS CSV Import (MEDIUM PRIORITY)

### 9.1 Import Wizard

**New Component: `src/components/Import/FocusImportWizard.tsx`**

Step 1: File Upload
- Accept CSV file
- Preview first 10 rows

Step 2: Column Mapping
```
┌─────────────────────────────────────────────────────────────┐
│ Map CSV Columns to Fields                                   │
├─────────────────────────────────────────────────────────────┤
│ CSV Column          →    System Field                       │
├─────────────────────────────────────────────────────────────┤
│ "Student Name"      →    [First Name + Last Name ▼]         │
│ "ID"                →    [Student ID           ▼]           │
│ "Grade"             →    [Grade Level          ▼]           │
│ "School"            →    [School               ▼]           │
│ "ELA_Model"         →    [ELA Delivery Model   ▼]           │
│ "ELA_Freq"          →    [ELA Frequency        ▼]           │
│ "Math_Model"        →    [Math Delivery Model  ▼]           │
│ "Math_Freq"         →    [Math Frequency       ▼]           │
└─────────────────────────────────────────────────────────────┘
```

Step 3: Data Validation
- Show rows with issues (missing data, invalid values)
- Allow inline corrections

Step 4: Manual Data Entry
- For fields not in FOCUS export (minutes, etc.)
- Bulk edit capability: "Set all ELA Support Facilitation to 45 minutes"

Step 5: Import Confirmation
- Summary of what will be imported
- Confirm and import

---

## Phase 10: Early Dismissal Day Support (MEDIUM PRIORITY)

### 10.1 Bell Schedule Enhancement

Already included in Phase 1 data model:
- `earlyDismissalDays: DayOfWeek[]`
- `earlyDismissalEndTime: string`

### 10.2 Visual Indicators

- Weekly schedule view shows shortened days
- Gray out times after early dismissal
- Validation warns if service scheduled after early dismissal

### 10.3 Service Adjustment

Option to auto-adjust services on early dismissal days:
- Skip service that day (frequency -1)
- Shorten service duration
- Reschedule to different day

---

## Phase 11: Related Services (Speech, OT, PT) (MEDIUM PRIORITY)

### 11.1 Related Service Provider Management

Extend Staff type with `serviceCategory`:
- ESE Teachers → `instructional`
- Speech, OT, PT → `related`

### 11.2 Related Service Scheduling

Same workflow as instructional services, but:
- Different provider pool
- Different duration defaults
- May have different location options (therapy room vs. classroom)
- Often have district-set schedules (therapist rotates between schools)

### 11.3 Integration Option

Allow marking related services as:
- **Internally Scheduled**: This app schedules them
- **Externally Scheduled**: Just block the student's time, provider manages their own schedule

---

## Phase 12: Print & Export (LOW PRIORITY)

### 12.1 Print Views

- Individual teacher schedule (weekly)
- Individual student schedule (weekly)
- Master schedule by grade level
- Compliance report

### 12.2 Export Options

- PDF export of any print view
- CSV export of master schedule
- JSON export of full data (backup)

---

## Phase 13: Secondary School Workflow (LOW PRIORITY)

### 13.1 Simplified Period-Based Entry

For secondary schools, skip classroom content block setup:
- Use period numbers (1-8) instead of time blocks
- Assume all students in a grade have same period schedule
- Simpler assignment: "Student A gets ELA support during Period 3"

---

## UI Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Inclusive Scheduler                                    [School: Highland]│
├─────────────────────────────────────────────────────────────────────────┤
│ [Setup] [Classrooms] [Students] [Staff] [Schedule] [Compliance] [Import]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        < Main Content Area >                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Navigation Tabs:
1. **Setup** - School info, bell schedule, early dismissal config
2. **Classrooms** - (Elementary) Content block schedules per classroom
3. **Students** - Student list, service configuration
4. **Staff** - ESE staff list, availability, assignments
5. **Schedule** - Main scheduling builder, assignments
6. **Compliance** - Dashboard, conflict list
7. **Import** - FOCUS CSV import wizard

---

## Implementation Order & Estimates

### Sprint 1: Foundation (Phases 1-2)
- [ ] New type definitions
- [ ] Context-based state management
- [ ] localStorage persistence
- [ ] Basic navigation structure

### Sprint 2: School & Classroom Setup (Phase 3)
- [ ] School setup wizard
- [ ] Bell schedule configuration
- [ ] Classroom editor (elementary)
- [ ] Content block management

### Sprint 3: Students & Services (Phase 4)
- [ ] Student list view
- [ ] Student detail view
- [ ] Service configuration modal
- [ ] Dual service support

### Sprint 4: Staff & Scheduling (Phases 5-6)
- [ ] Staff management views
- [ ] Schedule builder interface
- [ ] Assignment logic
- [ ] New student workflow

### Sprint 5: Validation & Compliance (Phases 7-8)
- [ ] Validation engine
- [ ] Conflict detection & display
- [ ] Compliance dashboard
- [ ] LRE calculation

### Sprint 6: Import & Polish (Phases 9-12)
- [ ] FOCUS CSV import
- [ ] Early dismissal handling
- [ ] Related services
- [ ] Print/export functionality

---

## Questions Resolved

### Q1: Students with BOTH in-class AND resource room for same subject?
**A:** Model as two separate service records. Each gets scheduled independently. Compliance checker sums both when checking IEP minutes.

### Q2: Auto-calculate LRE percentage?
**A:** Yes. Formula: `(General Ed Minutes / Total School Day) × 100`. Display on student detail and compliance dashboard.

### Q3: Track paraprofessional assignments?
**A:** Yes, for 1:1 assignments. Add `hasOneToOneParapro` and `paraprofessionalId` to Student. Parapros are a staff type with their own entity.

### Q4: Handle related services (Speech, OT, PT)?
**A:** Include as service category `'related'` with separate provider types. Support both "internally scheduled" and "externally scheduled" modes.

---

## Technical Decisions

1. **State Management**: React Context + useReducer (not Redux - app isn't complex enough to warrant it)
2. **Persistence**: localStorage for now, structured for easy backend migration later
3. **Styling**: Continue with CSS modules pattern (consistent with existing code)
4. **Validation**: Run on every state change, display conflicts in real-time
5. **IDs**: Continue using UUID v4 for all entities

---

## File Structure After Implementation

```
src/
├── components/
│   ├── BellScheduleSelector/     # Existing (may deprecate)
│   ├── ScheduleDisplay/          # Existing (may repurpose)
│   ├── Navigation/               # NEW: Top nav bar
│   ├── SchoolSetup/              # NEW: Setup wizard
│   ├── ClassroomEditor/          # NEW: Content block editor
│   ├── Students/                 # NEW: Student management
│   │   ├── StudentList.tsx
│   │   ├── StudentDetail.tsx
│   │   ├── ServiceModal.tsx
│   │   └── NewStudentWizard.tsx
│   ├── Staff/                    # NEW: Staff management
│   │   ├── StaffList.tsx
│   │   └── StaffDetail.tsx
│   ├── Schedule/                 # NEW: Schedule builder
│   │   ├── ScheduleBuilder.tsx
│   │   ├── StaffScheduleView.tsx
│   │   └── StudentScheduleView.tsx
│   ├── Compliance/               # NEW: Compliance views
│   │   ├── ComplianceDashboard.tsx
│   │   └── ConflictList.tsx
│   └── Import/                   # NEW: CSV import
│       └── FocusImportWizard.tsx
├── context/
│   └── SchedulerContext.tsx      # NEW: Global state
├── data/
│   ├── bellScheduleTemplates.ts  # Existing
│   ├── serviceDurations.ts       # NEW: Duration matrix
│   └── classroomTemplates.ts     # NEW: Classroom templates
├── types/
│   └── index.ts                  # EXPANDED: All new types
├── utils/
│   ├── scheduleUtils.ts          # Existing
│   ├── storage.ts                # NEW: localStorage
│   ├── schedulingEngine.ts       # NEW: Assignment logic
│   └── validationEngine.ts       # NEW: Conflict detection
├── App.tsx
├── App.css
└── main.tsx
```

---

## Next Steps

Please review this plan and let me know:

1. **Priorities**: Does the implementation order make sense for your needs?
2. **Scope**: Are there any features we should add or remove?
3. **Design Decisions**: Do the answers to your questions work for your district?
4. **UI/UX**: Any specific preferences for the interface design?
5. **Data**: Should I use the sample data you provided for testing?

Once approved, I'll begin implementation starting with Phase 1 (Data Model Foundation).
