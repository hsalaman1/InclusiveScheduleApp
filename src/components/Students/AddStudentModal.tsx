import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import './Students.css';

interface AddStudentModalProps {
  onClose: () => void;
  onStudentAdded: (studentId: string) => void;
}

export function AddStudentModal({ onClose, onStudentAdded }: AddStudentModalProps) {
  const { state, createStudent } = useScheduler();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [gradeLevel, setGradeLevel] = useState(state.school?.gradeLevels[0] || 'K');
  const [classroomId, setClassroomId] = useState('');
  const [hasOneToOneParapro, setHasOneToOneParapro] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classroomsForGrade = state.classrooms.filter(
    (c) => c.gradeLevel === gradeLevel
  );

  const handleGradeChange = (newGrade: string) => {
    setGradeLevel(newGrade);
    // Reset classroom if current selection is not in new grade
    const newGradeClassrooms = state.classrooms.filter((c) => c.gradeLevel === newGrade);
    if (!newGradeClassrooms.find((c) => c.id === classroomId)) {
      setClassroomId(newGradeClassrooms[0]?.id || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }
    if (!classroomId) {
      newErrors.classroomId = 'Please select a classroom';
    }

    // Check for duplicate student ID
    if (state.students.some((s) => s.studentId === studentId.trim())) {
      newErrors.studentId = 'A student with this ID already exists';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create the student and get the ID
    const newStudent = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentId: studentId.trim(),
      gradeLevel,
      schoolId: state.school?.id || '',
      classroomId,
      hasOneToOneParapro,
      paraprofessionalId: undefined,
    };

    createStudent(newStudent);

    // Find the newly created student to get their ID
    // Since createStudent uses uuidv4, we need to find by other fields
    setTimeout(() => {
      const createdStudent = state.students.find(
        (s) =>
          s.firstName === firstName.trim() &&
          s.lastName === lastName.trim() &&
          s.studentId === studentId.trim()
      );
      if (createdStudent) {
        onStudentAdded(createdStudent.id);
      } else {
        onClose();
      }
    }, 100);

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Student</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className={`form-input ${errors.firstName ? 'form-input--error' : ''}`}
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
                {errors.firstName && <div className="form-error">{errors.firstName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className={`form-input ${errors.lastName ? 'form-input--error' : ''}`}
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {errors.lastName && <div className="form-error">{errors.lastName}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Student ID</label>
              <input
                type="text"
                className={`form-input ${errors.studentId ? 'form-input--error' : ''}`}
                placeholder="Enter district student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              {errors.studentId && <div className="form-error">{errors.studentId}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Grade Level</label>
                <select
                  className="form-select"
                  value={gradeLevel}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  {state.school?.gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Classroom</label>
                <select
                  className={`form-select ${errors.classroomId ? 'form-input--error' : ''}`}
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                >
                  <option value="">Select classroom...</option>
                  {classroomsForGrade.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.teacherName} (Room {classroom.roomNumber})
                    </option>
                  ))}
                </select>
                {errors.classroomId && <div className="form-error">{errors.classroomId}</div>}
                {classroomsForGrade.length === 0 && (
                  <div className="form-hint text-warning">
                    No classrooms found for Grade {gradeLevel}. Please add classrooms first.
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={hasOneToOneParapro}
                  onChange={(e) => setHasOneToOneParapro(e.target.checked)}
                />
                <span>Student has 1:1 paraprofessional assignment</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStudentModal;
