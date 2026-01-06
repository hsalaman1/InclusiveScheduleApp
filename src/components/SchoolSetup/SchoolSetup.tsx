import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  SchoolLevel,
  SchoolType,
  DayOfWeek,
  DAY_OF_WEEK_LABELS,
  ELEMENTARY_GRADES,
  MIDDLE_GRADES,
  HIGH_GRADES,
  ALL_DAYS,
} from '../../types';
import './SchoolSetup.css';

type SetupStep = 'basic' | 'schedule' | 'review';

interface FormData {
  name: string;
  level: SchoolLevel;
  schoolType: SchoolType;
  gradeLevels: string[];
  regularStartTime: string;
  regularEndTime: string;
  earlyDismissalDays: DayOfWeek[];
  earlyDismissalEndTime: string;
}

const initialFormData: FormData = {
  name: '',
  level: 'elementary',
  schoolType: 'elementary',
  gradeLevels: [],
  regularStartTime: '08:20',
  regularEndTime: '15:20',
  earlyDismissalDays: [],
  earlyDismissalEndTime: '14:30',
};

export function SchoolSetup() {
  const { state, createSchool, dispatch } = useScheduler();
  const [currentStep, setCurrentStep] = useState<SetupStep>('basic');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If school already exists, show the edit view
  if (state.school) {
    return <SchoolEditView />;
  }

  const validateBasicStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'School name is required';
    }
    if (formData.gradeLevels.length === 0) {
      newErrors.gradeLevels = 'Select at least one grade level';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateScheduleStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.regularStartTime) {
      newErrors.regularStartTime = 'Start time is required';
    }
    if (!formData.regularEndTime) {
      newErrors.regularEndTime = 'End time is required';
    }
    if (formData.regularStartTime >= formData.regularEndTime) {
      newErrors.regularEndTime = 'End time must be after start time';
    }
    if (formData.earlyDismissalDays.length > 0 && !formData.earlyDismissalEndTime) {
      newErrors.earlyDismissalEndTime = 'Early dismissal time is required';
    }
    if (formData.earlyDismissalDays.length > 0 && formData.earlyDismissalEndTime >= formData.regularEndTime) {
      newErrors.earlyDismissalEndTime = 'Early dismissal must be before regular end time';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'basic' && validateBasicStep()) {
      setCurrentStep('schedule');
    } else if (currentStep === 'schedule' && validateScheduleStep()) {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'schedule') {
      setCurrentStep('basic');
    } else if (currentStep === 'review') {
      setCurrentStep('schedule');
    }
  };

  const handleSubmit = () => {
    createSchool({
      name: formData.name,
      level: formData.level,
      schoolType: formData.schoolType,
      gradeLevels: formData.gradeLevels,
      bellSchedule: {
        id: '',
        schoolId: '',
        regularStartTime: formData.regularStartTime,
        regularEndTime: formData.regularEndTime,
        earlyDismissalDays: formData.earlyDismissalDays,
        earlyDismissalEndTime: formData.earlyDismissalEndTime,
      },
    });
    dispatch({ type: 'SET_VIEW', payload: 'classrooms' });
  };

  const handleLevelChange = (level: SchoolLevel) => {
    let schoolType: SchoolType;
    let defaultGrades: string[];
    let defaultStartTime: string;
    let defaultEndTime: string;

    if (level === 'elementary') {
      schoolType = 'elementary';
      defaultGrades = [...ELEMENTARY_GRADES];
      defaultStartTime = '08:20';
      defaultEndTime = '15:20';
    } else {
      schoolType = 'middle';
      defaultGrades = [...MIDDLE_GRADES];
      defaultStartTime = '09:30';
      defaultEndTime = '16:20';
    }

    setFormData({
      ...formData,
      level,
      schoolType,
      gradeLevels: defaultGrades,
      regularStartTime: defaultStartTime,
      regularEndTime: defaultEndTime,
    });
  };

  const handleSchoolTypeChange = (schoolType: SchoolType) => {
    let defaultGrades: string[];
    if (schoolType === 'elementary') {
      defaultGrades = [...ELEMENTARY_GRADES];
    } else if (schoolType === 'middle') {
      defaultGrades = [...MIDDLE_GRADES];
    } else {
      defaultGrades = [...HIGH_GRADES];
    }
    setFormData({ ...formData, schoolType, gradeLevels: defaultGrades });
  };

  const toggleGrade = (grade: string) => {
    const newGrades = formData.gradeLevels.includes(grade)
      ? formData.gradeLevels.filter((g) => g !== grade)
      : [...formData.gradeLevels, grade];
    setFormData({ ...formData, gradeLevels: newGrades });
  };

  const toggleEarlyDismissalDay = (day: DayOfWeek) => {
    const newDays = formData.earlyDismissalDays.includes(day)
      ? formData.earlyDismissalDays.filter((d) => d !== day)
      : [...formData.earlyDismissalDays, day];
    setFormData({ ...formData, earlyDismissalDays: newDays });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const availableGrades =
    formData.level === 'elementary'
      ? ELEMENTARY_GRADES
      : formData.schoolType === 'middle'
      ? MIDDLE_GRADES
      : HIGH_GRADES;

  return (
    <div className="school-setup">
      <div className="setup-header">
        <h2>School Setup</h2>
        <p>Configure your school settings to get started with scheduling.</p>
      </div>

      <div className="setup-progress">
        <div className={`progress-step ${currentStep === 'basic' ? 'active' : 'completed'}`}>
          <div className="step-number">1</div>
          <div className="step-label">Basic Info</div>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${currentStep === 'schedule' ? 'active' : currentStep === 'review' ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Bell Schedule</div>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${currentStep === 'review' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Review</div>
        </div>
      </div>

      <div className="setup-content">
        {currentStep === 'basic' && (
          <div className="setup-step">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label className="form-label">School Name</label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                placeholder="Enter school name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">School Level</label>
              <div className="level-selector">
                <button
                  type="button"
                  className={`level-option ${formData.level === 'elementary' ? 'level-option--selected' : ''}`}
                  onClick={() => handleLevelChange('elementary')}
                >
                  <div className="level-title">Elementary</div>
                  <div className="level-description">
                    Time-block scheduling with classroom-level content blocks
                  </div>
                </button>
                <button
                  type="button"
                  className={`level-option ${formData.level === 'secondary' ? 'level-option--selected' : ''}`}
                  onClick={() => handleLevelChange('secondary')}
                >
                  <div className="level-title">Secondary</div>
                  <div className="level-description">
                    Period-based scheduling for middle and high schools
                  </div>
                </button>
              </div>
            </div>

            {formData.level === 'secondary' && (
              <div className="form-group">
                <label className="form-label">School Type</label>
                <div className="type-selector">
                  <button
                    type="button"
                    className={`type-option ${formData.schoolType === 'middle' ? 'type-option--selected' : ''}`}
                    onClick={() => handleSchoolTypeChange('middle')}
                  >
                    Middle School
                  </button>
                  <button
                    type="button"
                    className={`type-option ${formData.schoolType === 'high' ? 'type-option--selected' : ''}`}
                    onClick={() => handleSchoolTypeChange('high')}
                  >
                    High School
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Grade Levels</label>
              <div className="grade-selector">
                {availableGrades.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    className={`grade-option ${formData.gradeLevels.includes(grade) ? 'grade-option--selected' : ''}`}
                    onClick={() => toggleGrade(grade)}
                  >
                    {grade}
                  </button>
                ))}
              </div>
              {errors.gradeLevels && <div className="form-error">{errors.gradeLevels}</div>}
            </div>
          </div>
        )}

        {currentStep === 'schedule' && (
          <div className="setup-step">
            <h3>Bell Schedule</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Regular Start Time</label>
                <input
                  type="time"
                  className={`form-input ${errors.regularStartTime ? 'form-input--error' : ''}`}
                  value={formData.regularStartTime}
                  onChange={(e) => setFormData({ ...formData, regularStartTime: e.target.value })}
                />
                {errors.regularStartTime && <div className="form-error">{errors.regularStartTime}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Regular End Time</label>
                <input
                  type="time"
                  className={`form-input ${errors.regularEndTime ? 'form-input--error' : ''}`}
                  value={formData.regularEndTime}
                  onChange={(e) => setFormData({ ...formData, regularEndTime: e.target.value })}
                />
                {errors.regularEndTime && <div className="form-error">{errors.regularEndTime}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Early Dismissal Days</label>
              <p className="form-hint">Select days with early dismissal (optional)</p>
              <div className="day-selector">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`day-option ${formData.earlyDismissalDays.includes(day) ? 'day-option--selected' : ''}`}
                    onClick={() => toggleEarlyDismissalDay(day)}
                  >
                    {DAY_OF_WEEK_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            {formData.earlyDismissalDays.length > 0 && (
              <div className="form-group">
                <label className="form-label">Early Dismissal Time</label>
                <input
                  type="time"
                  className={`form-input ${errors.earlyDismissalEndTime ? 'form-input--error' : ''}`}
                  value={formData.earlyDismissalEndTime}
                  onChange={(e) => setFormData({ ...formData, earlyDismissalEndTime: e.target.value })}
                />
                {errors.earlyDismissalEndTime && <div className="form-error">{errors.earlyDismissalEndTime}</div>}
              </div>
            )}
          </div>
        )}

        {currentStep === 'review' && (
          <div className="setup-step">
            <h3>Review Your Settings</h3>

            <div className="review-section">
              <h4>School Information</h4>
              <div className="review-grid">
                <div className="review-item">
                  <div className="review-label">School Name</div>
                  <div className="review-value">{formData.name}</div>
                </div>
                <div className="review-item">
                  <div className="review-label">School Level</div>
                  <div className="review-value">
                    {formData.level === 'elementary' ? 'Elementary' : 'Secondary'}
                  </div>
                </div>
                {formData.level === 'secondary' && (
                  <div className="review-item">
                    <div className="review-label">School Type</div>
                    <div className="review-value">
                      {formData.schoolType === 'middle' ? 'Middle School' : 'High School'}
                    </div>
                  </div>
                )}
                <div className="review-item">
                  <div className="review-label">Grade Levels</div>
                  <div className="review-value">{formData.gradeLevels.join(', ')}</div>
                </div>
              </div>
            </div>

            <div className="review-section">
              <h4>Bell Schedule</h4>
              <div className="review-grid">
                <div className="review-item">
                  <div className="review-label">Regular Hours</div>
                  <div className="review-value">
                    {formatTime(formData.regularStartTime)} - {formatTime(formData.regularEndTime)}
                  </div>
                </div>
                {formData.earlyDismissalDays.length > 0 && (
                  <>
                    <div className="review-item">
                      <div className="review-label">Early Dismissal Days</div>
                      <div className="review-value">
                        {formData.earlyDismissalDays.map((d) => DAY_OF_WEEK_LABELS[d]).join(', ')}
                      </div>
                    </div>
                    <div className="review-item">
                      <div className="review-label">Early Dismissal Time</div>
                      <div className="review-value">{formatTime(formData.earlyDismissalEndTime)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="review-note">
              {formData.level === 'elementary' ? (
                <p>
                  After creating your school, you will set up classroom schedules with content
                  blocks to handle flip schedules and different classroom configurations.
                </p>
              ) : (
                <p>
                  After creating your school, you can begin adding students and staff
                  to start building your schedule.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="setup-actions">
        {currentStep !== 'basic' && (
          <button type="button" className="btn btn-secondary" onClick={handleBack}>
            Back
          </button>
        )}
        <div className="setup-actions-right">
          {currentStep !== 'review' ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Create School
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SchoolEditView() {
  const { state, dispatch } = useScheduler();
  const school = state.school!;

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      dispatch({ type: 'RESET_STATE' });
    }
  };

  return (
    <div className="school-setup">
      <div className="setup-header">
        <h2>School Settings</h2>
        <p>Review and manage your school configuration.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">School Information</h3>
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">School Name</div>
              <div className="info-value">{school.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">School Level</div>
              <div className="info-value">
                {school.level === 'elementary' ? 'Elementary' : 'Secondary'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">School Type</div>
              <div className="info-value">
                {school.schoolType === 'elementary'
                  ? 'Elementary School'
                  : school.schoolType === 'middle'
                  ? 'Middle School'
                  : 'High School'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Grade Levels</div>
              <div className="info-value">{school.gradeLevels.join(', ')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Bell Schedule</h3>
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Regular Hours</div>
              <div className="info-value">
                {formatTime(school.bellSchedule.regularStartTime)} -{' '}
                {formatTime(school.bellSchedule.regularEndTime)}
              </div>
            </div>
            {school.bellSchedule.earlyDismissalDays.length > 0 && (
              <>
                <div className="info-item">
                  <div className="info-label">Early Dismissal Days</div>
                  <div className="info-value">
                    {school.bellSchedule.earlyDismissalDays
                      .map((d) => DAY_OF_WEEK_LABELS[d])
                      .join(', ')}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Early Dismissal Time</div>
                  <div className="info-value">
                    {formatTime(school.bellSchedule.earlyDismissalEndTime)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Data Summary</h3>
        </div>
        <div className="card-body">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{state.classrooms.length}</div>
              <div className="stat-label">Classrooms</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{state.students.length}</div>
              <div className="stat-label">Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{state.staff.length}</div>
              <div className="stat-label">Staff</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{state.assignments.length}</div>
              <div className="stat-label">Assignments</div>
            </div>
          </div>
        </div>
      </div>

      <div className="danger-zone mt-4">
        <h3>Danger Zone</h3>
        <p>Reset all data and start fresh. This action cannot be undone.</p>
        <button type="button" className="btn btn-danger" onClick={handleReset}>
          Reset All Data
        </button>
      </div>
    </div>
  );
}

export default SchoolSetup;
