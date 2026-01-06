import { useState, useMemo } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { Student } from '../../types';
import './Students.css';

interface StudentListProps {
  onSelectStudent: (studentId: string) => void;
  onAddStudent: () => void;
}

export function StudentList({ onSelectStudent, onAddStudent }: StudentListProps) {
  const { state, getClassroomById } = useScheduler();
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');

  const filteredStudents = useMemo(() => {
    return state.students.filter((student) => {
      const matchesSearch =
        searchTerm === '' ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGrade = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
      const matchesClassroom = classroomFilter === 'all' || student.classroomId === classroomFilter;

      return matchesSearch && matchesGrade && matchesClassroom;
    });
  }, [state.students, searchTerm, gradeFilter, classroomFilter]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [filteredStudents]);

  const getComplianceStatus = (student: Student): 'compliant' | 'warning' | 'non_compliant' => {
    if (student.services.length === 0) return 'compliant';

    // Check if all services have scheduled minutes matching IEP requirements
    // For now, return warning if any service has IEP minutes but no assignments
    const hasUnscheduledServices = student.services.some(
      (service) => service.iepRequiredMinutes > 0
    );

    // This is a simplified check - the real validation will be in the validation engine
    const assignments = state.assignments.filter((a) => a.studentId === student.id);
    if (hasUnscheduledServices && assignments.length === 0) {
      return 'warning';
    }

    return 'compliant';
  };

  const uniqueGrades = useMemo(() => {
    const grades = new Set(state.students.map((s) => s.gradeLevel));
    return Array.from(grades).sort((a, b) => {
      if (a === 'K') return -1;
      if (b === 'K') return 1;
      return parseInt(a) - parseInt(b);
    });
  }, [state.students]);

  return (
    <div className="student-list">
      <div className="list-header">
        <div className="list-filters">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-select filter-select"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="all">All Grades</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
          <select
            className="form-select filter-select"
            value={classroomFilter}
            onChange={(e) => setClassroomFilter(e.target.value)}
          >
            <option value="all">All Classrooms</option>
            {state.classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.teacherName} (Rm {classroom.roomNumber})
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={onAddStudent}>
          Add Student
        </button>
      </div>

      {sortedStudents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {state.students.length === 0 ? 'No Students Yet' : 'No Matching Students'}
          </div>
          <p className="empty-state-description">
            {state.students.length === 0
              ? 'Add students to start configuring their services and building the schedule.'
              : 'Try adjusting your search or filters.'}
          </p>
          {state.students.length === 0 && (
            <button className="btn btn-primary" onClick={onAddStudent}>
              Add Your First Student
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Grade</th>
                <th>Classroom</th>
                <th>Services</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const classroom = getClassroomById(student.classroomId);
                const status = getComplianceStatus(student);
                const totalServices = student.services.length;
                const totalMinutes = student.services.reduce(
                  (sum, s) => sum + s.totalWeeklyMinutes,
                  0
                );

                return (
                  <tr key={student.id} onClick={() => onSelectStudent(student.id)}>
                    <td className="student-name">
                      {student.lastName}, {student.firstName}
                      {student.hasOneToOneParapro && (
                        <span className="badge badge-info">1:1</span>
                      )}
                    </td>
                    <td className="student-id">{student.studentId}</td>
                    <td>{student.gradeLevel}</td>
                    <td>
                      {classroom ? (
                        <span title={`Room ${classroom.roomNumber}`}>
                          {classroom.teacherName}
                        </span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {totalServices > 0 ? (
                        <span>
                          {totalServices} service{totalServices !== 1 ? 's' : ''} ({totalMinutes} min/wk)
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${status === 'compliant' ? 'success' : status === 'warning' ? 'warning' : 'error'}`}>
                        {status === 'compliant' ? 'OK' : status === 'warning' ? 'Needs Scheduling' : 'Non-Compliant'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student.id);
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
          Showing {sortedStudents.length} of {state.students.length} students
        </span>
      </div>
    </div>
  );
}

export default StudentList;
