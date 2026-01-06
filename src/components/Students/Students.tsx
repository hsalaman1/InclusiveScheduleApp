import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { StudentList } from './StudentList';
import { StudentDetail } from './StudentDetail';
import { AddStudentModal } from './AddStudentModal';
import './Students.css';

export function Students() {
  const { state } = useScheduler();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  if (!state.school) {
    return (
      <div className="students-page">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before managing students.
          </p>
        </div>
      </div>
    );
  }

  if (state.classrooms.length === 0) {
    return (
      <div className="students-page">
        <div className="empty-state">
          <div className="empty-state-title">No Classrooms Yet</div>
          <p className="empty-state-description">
            Please add classrooms before adding students. Students need to be assigned to a classroom.
          </p>
        </div>
      </div>
    );
  }

  const handleStudentAdded = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsAddingStudent(false);
  };

  return (
    <div className="students-page">
      {selectedStudentId ? (
        <StudentDetail
          studentId={selectedStudentId}
          onBack={() => setSelectedStudentId(null)}
        />
      ) : (
        <>
          <div className="page-header">
            <h2>Students</h2>
            <p>Manage students and their IEP service configurations.</p>
          </div>
          <StudentList
            onSelectStudent={setSelectedStudentId}
            onAddStudent={() => setIsAddingStudent(true)}
          />
        </>
      )}

      {isAddingStudent && (
        <AddStudentModal
          onClose={() => setIsAddingStudent(false)}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </div>
  );
}

export default Students;
