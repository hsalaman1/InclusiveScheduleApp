import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  Classroom,
  ContentBlock,
  ContentArea,
  CONTENT_AREA_LABELS,
  ALL_DAYS,
  DayOfWeek,
} from '../../types';
import './ClassroomEditor.css';

export function ClassroomEditor() {
  const { state, createClassroom, createContentBlock, dispatch, getStudentsByClassroom } = useScheduler();
  const [isAddingClassroom, setIsAddingClassroom] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);

  const school = state.school;

  if (!school) {
    return (
      <div className="classroom-editor">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before managing classrooms.
          </p>
        </div>
      </div>
    );
  }

  const handleAddClassroom = (data: { teacherName: string; roomNumber: string; gradeLevel: string }) => {
    createClassroom({
      schoolId: school.id,
      teacherName: data.teacherName,
      roomNumber: data.roomNumber,
      gradeLevel: data.gradeLevel,
      contentBlocks: [],
    });
    setIsAddingClassroom(false);
  };

  const handleAddContentBlock = (classroomId: string, data: Omit<ContentBlock, 'id' | 'classroomId'>) => {
    createContentBlock(classroomId, data);
  };

  const handleDeleteClassroom = (classroomId: string) => {
    const studentsInClassroom = getStudentsByClassroom(classroomId);
    if (studentsInClassroom.length > 0) {
      if (!confirm(`This classroom has ${studentsInClassroom.length} students assigned. Deleting it will also remove those students. Continue?`)) {
        return;
      }
    }
    dispatch({ type: 'DELETE_CLASSROOM', payload: classroomId });
  };

  const handleDeleteContentBlock = (classroomId: string, blockId: string) => {
    dispatch({ type: 'DELETE_CONTENT_BLOCK', payload: { classroomId, blockId } });
  };

  const classroomsByGrade = state.classrooms.reduce((acc, classroom) => {
    if (!acc[classroom.gradeLevel]) {
      acc[classroom.gradeLevel] = [];
    }
    acc[classroom.gradeLevel].push(classroom);
    return acc;
  }, {} as Record<string, Classroom[]>);

  return (
    <div className="classroom-editor">
      <div className="editor-header">
        <div>
          <h2>Classrooms</h2>
          <p>
            {school.level === 'elementary'
              ? 'Manage classroom content block schedules for each teacher.'
              : 'Manage classroom assignments for students.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddingClassroom(true)}>
          Add Classroom
        </button>
      </div>

      {state.classrooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No Classrooms Yet</div>
          <p className="empty-state-description">
            Add classrooms to start configuring content block schedules.
            {school.level === 'elementary' && (
              <> Each classroom can have different content block times to support flip schedules.</>
            )}
          </p>
          <button className="btn btn-primary" onClick={() => setIsAddingClassroom(true)}>
            Add Your First Classroom
          </button>
        </div>
      ) : (
        <div className="classrooms-grid">
          {school.gradeLevels.map((grade) => {
            const gradeClassrooms = classroomsByGrade[grade] || [];
            return (
              <div key={grade} className="grade-section">
                <div className="grade-header">
                  <h3>Grade {grade}</h3>
                  <span className="classroom-count">
                    {gradeClassrooms.length} classroom{gradeClassrooms.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {gradeClassrooms.length === 0 ? (
                  <div className="no-classrooms">No classrooms for this grade</div>
                ) : (
                  <div className="classroom-cards">
                    {gradeClassrooms.map((classroom) => (
                      <ClassroomCard
                        key={classroom.id}
                        classroom={classroom}
                        isElementary={school.level === 'elementary'}
                        isEditing={editingClassroomId === classroom.id}
                        onEdit={() => setEditingClassroomId(classroom.id)}
                        onClose={() => setEditingClassroomId(null)}
                        onDelete={() => handleDeleteClassroom(classroom.id)}
                        onAddBlock={(data) => handleAddContentBlock(classroom.id, data)}
                        onDeleteBlock={(blockId) => handleDeleteContentBlock(classroom.id, blockId)}
                        studentCount={getStudentsByClassroom(classroom.id).length}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAddingClassroom && (
        <AddClassroomModal
          availableGrades={school.gradeLevels}
          onAdd={handleAddClassroom}
          onClose={() => setIsAddingClassroom(false)}
        />
      )}
    </div>
  );
}

interface ClassroomCardProps {
  classroom: Classroom;
  isElementary: boolean;
  isEditing: boolean;
  studentCount: number;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onAddBlock: (data: Omit<ContentBlock, 'id' | 'classroomId'>) => void;
  onDeleteBlock: (blockId: string) => void;
}

function ClassroomCard({
  classroom,
  isElementary,
  isEditing,
  studentCount,
  onEdit,
  onClose,
  onDelete,
  onAddBlock,
  onDeleteBlock,
}: ClassroomCardProps) {
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const sortedBlocks = [...classroom.contentBlocks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  return (
    <div className={`classroom-card ${isEditing ? 'classroom-card--editing' : ''}`}>
      <div className="classroom-card-header">
        <div className="classroom-info">
          <div className="classroom-teacher">{classroom.teacherName}</div>
          <div className="classroom-details">
            Room {classroom.roomNumber} | {studentCount} student{studentCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="classroom-actions">
          {isEditing ? (
            <button className="btn btn-sm btn-secondary" onClick={onClose}>
              Done
            </button>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {isElementary && (
        <div className="content-blocks">
          {sortedBlocks.length === 0 ? (
            <div className="no-blocks">No content blocks defined</div>
          ) : (
            <div className="blocks-timeline">
              {sortedBlocks.map((block) => (
                <div key={block.id} className={`block-item block-item--${block.contentArea}`}>
                  <div className="block-time">
                    {formatTime(block.startTime)} - {formatTime(block.endTime)}
                  </div>
                  <div className="block-content">
                    <span className="block-label">{CONTENT_AREA_LABELS[block.contentArea]}</span>
                    <span className="block-duration">{block.durationMinutes} min</span>
                  </div>
                  {isEditing && (
                    <button
                      className="block-delete"
                      onClick={() => onDeleteBlock(block.id)}
                      title="Remove block"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditing && (
            <div className="block-actions">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setIsAddingBlock(true)}
              >
                Add Content Block
              </button>
              <button className="btn btn-sm btn-danger" onClick={onDelete}>
                Delete Classroom
              </button>
            </div>
          )}
        </div>
      )}

      {!isElementary && isEditing && (
        <div className="classroom-edit-actions">
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete Classroom
          </button>
        </div>
      )}

      {isAddingBlock && (
        <AddContentBlockModal
          onAdd={(data) => {
            onAddBlock(data);
            setIsAddingBlock(false);
          }}
          onClose={() => setIsAddingBlock(false)}
        />
      )}
    </div>
  );
}

interface AddClassroomModalProps {
  availableGrades: string[];
  onAdd: (data: { teacherName: string; roomNumber: string; gradeLevel: string }) => void;
  onClose: () => void;
}

function AddClassroomModal({ availableGrades, onAdd, onClose }: AddClassroomModalProps) {
  const [teacherName, setTeacherName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState(availableGrades[0] || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!teacherName.trim()) {
      newErrors.teacherName = 'Teacher name is required';
    }
    if (!roomNumber.trim()) {
      newErrors.roomNumber = 'Room number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd({ teacherName: teacherName.trim(), roomNumber: roomNumber.trim(), gradeLevel });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Classroom</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Teacher Name</label>
              <input
                type="text"
                className={`form-input ${errors.teacherName ? 'form-input--error' : ''}`}
                placeholder="e.g., Mrs. Smith"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                autoFocus
              />
              {errors.teacherName && <div className="form-error">{errors.teacherName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input
                type="text"
                className={`form-input ${errors.roomNumber ? 'form-input--error' : ''}`}
                placeholder="e.g., 101"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
              {errors.roomNumber && <div className="form-error">{errors.roomNumber}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Grade Level</label>
              <select
                className="form-select"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddContentBlockModalProps {
  onAdd: (data: Omit<ContentBlock, 'id' | 'classroomId'>) => void;
  onClose: () => void;
}

function AddContentBlockModal({ onAdd, onClose }: AddContentBlockModalProps) {
  const [contentArea, setContentArea] = useState<ContentArea>('ela');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:00');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([...ALL_DAYS]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleDay = (day: DayOfWeek) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const calculateDuration = (): number => {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    return (endHours * 60 + endMins) - (startHours * 60 + startMins);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const duration = calculateDuration();
    if (duration <= 0) {
      newErrors.endTime = 'End time must be after start time';
    }
    if (daysOfWeek.length === 0) {
      newErrors.daysOfWeek = 'Select at least one day';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd({
      contentArea,
      startTime,
      endTime,
      durationMinutes: duration,
      daysOfWeek,
    });
  };

  const contentAreaOptions: ContentArea[] = ['ela', 'math', 'science', 'social_studies', 'specials', 'lunch', 'recess', 'other'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Content Block</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Content Area</label>
              <select
                className="form-select"
                value={contentArea}
                onChange={(e) => setContentArea(e.target.value as ContentArea)}
              >
                {contentAreaOptions.map((area) => (
                  <option key={area} value={area}>
                    {CONTENT_AREA_LABELS[area]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className={`form-input ${errors.endTime ? 'form-input--error' : ''}`}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
                {errors.endTime && <div className="form-error">{errors.endTime}</div>}
              </div>
            </div>

            {calculateDuration() > 0 && (
              <div className="duration-preview">
                Duration: {calculateDuration()} minutes
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Days</label>
              <div className="days-selector">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`day-btn ${daysOfWeek.includes(day) ? 'day-btn--selected' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              {errors.daysOfWeek && <div className="form-error">{errors.daysOfWeek}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassroomEditor;
