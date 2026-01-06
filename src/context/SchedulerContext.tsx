import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  School,
  Classroom,
  Student,
  Staff,
  StudentService,
  ScheduleAssignment,
  ResourceRoomGroup,
  ScheduleConflict,
  ComplianceStatus,
  ViewType,
  ContentBlock,
} from '../types';
import { loadState, saveState } from '../utils/storage';

// ============================================
// STATE INTERFACE
// ============================================

export interface SchedulerState {
  // School setup
  school: School | null;
  classrooms: Classroom[];

  // People
  students: Student[];
  staff: Staff[];

  // Schedule
  assignments: ScheduleAssignment[];
  resourceRoomGroups: ResourceRoomGroup[];

  // Validation (computed)
  conflicts: ScheduleConflict[];
  complianceStatuses: ComplianceStatus[];

  // UI State
  currentView: ViewType;
  selectedStudentId: string | null;
  selectedStaffId: string | null;
  selectedClassroomId: string | null;

  // App state
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

// ============================================
// ACTION TYPES
// ============================================

type Action =
  // School actions
  | { type: 'SET_SCHOOL'; payload: School }
  | { type: 'UPDATE_SCHOOL'; payload: Partial<School> }
  | { type: 'CLEAR_SCHOOL' }

  // Classroom actions
  | { type: 'ADD_CLASSROOM'; payload: Classroom }
  | { type: 'UPDATE_CLASSROOM'; payload: { id: string; updates: Partial<Classroom> } }
  | { type: 'DELETE_CLASSROOM'; payload: string }
  | { type: 'ADD_CONTENT_BLOCK'; payload: { classroomId: string; block: ContentBlock } }
  | { type: 'UPDATE_CONTENT_BLOCK'; payload: { classroomId: string; blockId: string; updates: Partial<ContentBlock> } }
  | { type: 'DELETE_CONTENT_BLOCK'; payload: { classroomId: string; blockId: string } }

  // Student actions
  | { type: 'ADD_STUDENT'; payload: Student }
  | { type: 'UPDATE_STUDENT'; payload: { id: string; updates: Partial<Student> } }
  | { type: 'DELETE_STUDENT'; payload: string }
  | { type: 'ADD_SERVICE'; payload: { studentId: string; service: StudentService } }
  | { type: 'UPDATE_SERVICE'; payload: { studentId: string; serviceId: string; updates: Partial<StudentService> } }
  | { type: 'DELETE_SERVICE'; payload: { studentId: string; serviceId: string } }
  | { type: 'IMPORT_STUDENTS'; payload: Student[] }

  // Staff actions
  | { type: 'ADD_STAFF'; payload: Staff }
  | { type: 'UPDATE_STAFF'; payload: { id: string; updates: Partial<Staff> } }
  | { type: 'DELETE_STAFF'; payload: string }

  // Assignment actions
  | { type: 'ADD_ASSIGNMENT'; payload: ScheduleAssignment }
  | { type: 'UPDATE_ASSIGNMENT'; payload: { id: string; updates: Partial<ScheduleAssignment> } }
  | { type: 'DELETE_ASSIGNMENT'; payload: string }
  | { type: 'CLEAR_ASSIGNMENTS' }

  // Resource room group actions
  | { type: 'ADD_RESOURCE_GROUP'; payload: ResourceRoomGroup }
  | { type: 'UPDATE_RESOURCE_GROUP'; payload: { id: string; updates: Partial<ResourceRoomGroup> } }
  | { type: 'DELETE_RESOURCE_GROUP'; payload: string }

  // Validation actions
  | { type: 'SET_CONFLICTS'; payload: ScheduleConflict[] }
  | { type: 'SET_COMPLIANCE_STATUSES'; payload: ComplianceStatus[] }

  // UI actions
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'SELECT_STUDENT'; payload: string | null }
  | { type: 'SELECT_STAFF'; payload: string | null }
  | { type: 'SELECT_CLASSROOM'; payload: string | null }

  // App state actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'LOAD_STATE'; payload: Partial<SchedulerState> }
  | { type: 'RESET_STATE' };

// ============================================
// INITIAL STATE
// ============================================

const initialState: SchedulerState = {
  school: null,
  classrooms: [],
  students: [],
  staff: [],
  assignments: [],
  resourceRoomGroups: [],
  conflicts: [],
  complianceStatuses: [],
  currentView: 'setup',
  selectedStudentId: null,
  selectedStaffId: null,
  selectedClassroomId: null,
  isLoading: true,
  hasUnsavedChanges: false,
};

// ============================================
// REDUCER
// ============================================

function schedulerReducer(state: SchedulerState, action: Action): SchedulerState {
  switch (action.type) {
    // School actions
    case 'SET_SCHOOL':
      return { ...state, school: action.payload, hasUnsavedChanges: true };

    case 'UPDATE_SCHOOL':
      if (!state.school) return state;
      return {
        ...state,
        school: { ...state.school, ...action.payload, updatedAt: new Date().toISOString() },
        hasUnsavedChanges: true,
      };

    case 'CLEAR_SCHOOL':
      return { ...initialState, isLoading: false };

    // Classroom actions
    case 'ADD_CLASSROOM':
      return {
        ...state,
        classrooms: [...state.classrooms, action.payload],
        hasUnsavedChanges: true,
      };

    case 'UPDATE_CLASSROOM':
      return {
        ...state,
        classrooms: state.classrooms.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
        hasUnsavedChanges: true,
      };

    case 'DELETE_CLASSROOM':
      return {
        ...state,
        classrooms: state.classrooms.filter((c) => c.id !== action.payload),
        // Also remove students in this classroom
        students: state.students.filter((s) => s.classroomId !== action.payload),
        hasUnsavedChanges: true,
      };

    case 'ADD_CONTENT_BLOCK': {
      return {
        ...state,
        classrooms: state.classrooms.map((c) =>
          c.id === action.payload.classroomId
            ? { ...c, contentBlocks: [...c.contentBlocks, action.payload.block] }
            : c
        ),
        hasUnsavedChanges: true,
      };
    }

    case 'UPDATE_CONTENT_BLOCK': {
      return {
        ...state,
        classrooms: state.classrooms.map((c) =>
          c.id === action.payload.classroomId
            ? {
                ...c,
                contentBlocks: c.contentBlocks.map((b) =>
                  b.id === action.payload.blockId ? { ...b, ...action.payload.updates } : b
                ),
              }
            : c
        ),
        hasUnsavedChanges: true,
      };
    }

    case 'DELETE_CONTENT_BLOCK': {
      return {
        ...state,
        classrooms: state.classrooms.map((c) =>
          c.id === action.payload.classroomId
            ? {
                ...c,
                contentBlocks: c.contentBlocks.filter((b) => b.id !== action.payload.blockId),
              }
            : c
        ),
        hasUnsavedChanges: true,
      };
    }

    // Student actions
    case 'ADD_STUDENT':
      return {
        ...state,
        students: [...state.students, action.payload],
        hasUnsavedChanges: true,
      };

    case 'UPDATE_STUDENT':
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : s
        ),
        hasUnsavedChanges: true,
      };

    case 'DELETE_STUDENT':
      return {
        ...state,
        students: state.students.filter((s) => s.id !== action.payload),
        // Also remove assignments for this student
        assignments: state.assignments.filter((a) => a.studentId !== action.payload),
        hasUnsavedChanges: true,
      };

    case 'ADD_SERVICE': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.payload.studentId
            ? {
                ...s,
                services: [...s.services, action.payload.service],
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
        hasUnsavedChanges: true,
      };
    }

    case 'UPDATE_SERVICE': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.payload.studentId
            ? {
                ...s,
                services: s.services.map((svc) =>
                  svc.id === action.payload.serviceId ? { ...svc, ...action.payload.updates } : svc
                ),
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
        hasUnsavedChanges: true,
      };
    }

    case 'DELETE_SERVICE': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.payload.studentId
            ? {
                ...s,
                services: s.services.filter((svc) => svc.id !== action.payload.serviceId),
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
        // Also remove assignments for this service
        assignments: state.assignments.filter(
          (a) => a.studentServiceId !== action.payload.serviceId
        ),
        hasUnsavedChanges: true,
      };
    }

    case 'IMPORT_STUDENTS':
      return {
        ...state,
        students: [...state.students, ...action.payload],
        hasUnsavedChanges: true,
      };

    // Staff actions
    case 'ADD_STAFF':
      return {
        ...state,
        staff: [...state.staff, action.payload],
        hasUnsavedChanges: true,
      };

    case 'UPDATE_STAFF':
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : s
        ),
        hasUnsavedChanges: true,
      };

    case 'DELETE_STAFF':
      return {
        ...state,
        staff: state.staff.filter((s) => s.id !== action.payload),
        // Also remove assignments for this staff member
        assignments: state.assignments.filter((a) => a.staffId !== action.payload),
        hasUnsavedChanges: true,
      };

    // Assignment actions
    case 'ADD_ASSIGNMENT':
      return {
        ...state,
        assignments: [...state.assignments, action.payload],
        hasUnsavedChanges: true,
      };

    case 'UPDATE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
        hasUnsavedChanges: true,
      };

    case 'DELETE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.filter((a) => a.id !== action.payload),
        hasUnsavedChanges: true,
      };

    case 'CLEAR_ASSIGNMENTS':
      return {
        ...state,
        assignments: [],
        hasUnsavedChanges: true,
      };

    // Resource room group actions
    case 'ADD_RESOURCE_GROUP':
      return {
        ...state,
        resourceRoomGroups: [...state.resourceRoomGroups, action.payload],
        hasUnsavedChanges: true,
      };

    case 'UPDATE_RESOURCE_GROUP':
      return {
        ...state,
        resourceRoomGroups: state.resourceRoomGroups.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        ),
        hasUnsavedChanges: true,
      };

    case 'DELETE_RESOURCE_GROUP':
      return {
        ...state,
        resourceRoomGroups: state.resourceRoomGroups.filter((g) => g.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Validation actions
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.payload };

    case 'SET_COMPLIANCE_STATUSES':
      return { ...state, complianceStatuses: action.payload };

    // UI actions
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'SELECT_STUDENT':
      return { ...state, selectedStudentId: action.payload };

    case 'SELECT_STAFF':
      return { ...state, selectedStaffId: action.payload };

    case 'SELECT_CLASSROOM':
      return { ...state, selectedClassroomId: action.payload };

    // App state actions
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };

    case 'LOAD_STATE':
      return { ...state, ...action.payload, isLoading: false };

    case 'RESET_STATE':
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface SchedulerContextValue {
  state: SchedulerState;
  dispatch: React.Dispatch<Action>;

  // Helper functions
  createSchool: (school: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => void;
  createClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  createStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'services'>) => void;
  createStaff: (staff: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => void;
  createService: (studentId: string, service: Omit<StudentService, 'id' | 'studentId'>) => void;
  createAssignment: (assignment: Omit<ScheduleAssignment, 'id'>) => void;
  createContentBlock: (classroomId: string, block: Omit<ContentBlock, 'id' | 'classroomId'>) => void;

  // Lookup helpers
  getStudentById: (id: string) => Student | undefined;
  getStaffById: (id: string) => Staff | undefined;
  getClassroomById: (id: string) => Classroom | undefined;
  getStudentsByClassroom: (classroomId: string) => Student[];
  getAssignmentsByStudent: (studentId: string) => ScheduleAssignment[];
  getAssignmentsByStaff: (staffId: string) => ScheduleAssignment[];
}

const SchedulerContext = createContext<SchedulerContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface SchedulerProviderProps {
  children: ReactNode;
}

export function SchedulerProvider({ children }: SchedulerProviderProps) {
  const [state, dispatch] = useReducer(schedulerReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!state.isLoading && state.hasUnsavedChanges) {
      const stateToSave = {
        school: state.school,
        classrooms: state.classrooms,
        students: state.students,
        staff: state.staff,
        assignments: state.assignments,
        resourceRoomGroups: state.resourceRoomGroups,
        currentView: state.currentView,
      };
      saveState(stateToSave);
      dispatch({ type: 'MARK_SAVED' });
    }
  }, [state]);

  // Helper functions
  const createSchool = (school: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    dispatch({
      type: 'SET_SCHOOL',
      payload: {
        ...school,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const createClassroom = (classroom: Omit<Classroom, 'id'>) => {
    dispatch({
      type: 'ADD_CLASSROOM',
      payload: {
        ...classroom,
        id: uuidv4(),
      },
    });
  };

  const createStudent = (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'services'>) => {
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_STUDENT',
      payload: {
        ...student,
        id: uuidv4(),
        services: [],
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const createStaff = (staff: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_STAFF',
      payload: {
        ...staff,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const createService = (studentId: string, service: Omit<StudentService, 'id' | 'studentId'>) => {
    dispatch({
      type: 'ADD_SERVICE',
      payload: {
        studentId,
        service: {
          ...service,
          id: uuidv4(),
          studentId,
        },
      },
    });
  };

  const createAssignment = (assignment: Omit<ScheduleAssignment, 'id'>) => {
    dispatch({
      type: 'ADD_ASSIGNMENT',
      payload: {
        ...assignment,
        id: uuidv4(),
      },
    });
  };

  const createContentBlock = (classroomId: string, block: Omit<ContentBlock, 'id' | 'classroomId'>) => {
    dispatch({
      type: 'ADD_CONTENT_BLOCK',
      payload: {
        classroomId,
        block: {
          ...block,
          id: uuidv4(),
          classroomId,
        },
      },
    });
  };

  // Lookup helpers
  const getStudentById = (id: string) => state.students.find((s) => s.id === id);
  const getStaffById = (id: string) => state.staff.find((s) => s.id === id);
  const getClassroomById = (id: string) => state.classrooms.find((c) => c.id === id);
  const getStudentsByClassroom = (classroomId: string) =>
    state.students.filter((s) => s.classroomId === classroomId);
  const getAssignmentsByStudent = (studentId: string) =>
    state.assignments.filter((a) => a.studentId === studentId);
  const getAssignmentsByStaff = (staffId: string) =>
    state.assignments.filter((a) => a.staffId === staffId);

  const value: SchedulerContextValue = {
    state,
    dispatch,
    createSchool,
    createClassroom,
    createStudent,
    createStaff,
    createService,
    createAssignment,
    createContentBlock,
    getStudentById,
    getStaffById,
    getClassroomById,
    getStudentsByClassroom,
    getAssignmentsByStudent,
    getAssignmentsByStaff,
  };

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useScheduler() {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
}

export default SchedulerContext;
