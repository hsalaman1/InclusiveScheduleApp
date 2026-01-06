import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { StaffType, STAFF_TYPE_LABELS, ALL_DAYS } from '../../types';
import './Staff.css';

interface AddStaffModalProps {
  onClose: () => void;
}

const CERTIFICATION_OPTIONS = [
  'K-5 ESE',
  'K-12 ESE',
  '6-12 ESE',
  'Reading Endorsed',
  'Math Endorsed',
  'ESOL',
  'Autism Spectrum Disorder',
  'Emotional/Behavioral Disorders',
  'Intellectual Disabilities',
];

export function AddStaffModal({ onClose }: AddStaffModalProps) {
  const { state, createStaff } = useScheduler();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffType, setStaffType] = useState<StaffType>('ese_teacher');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [lunchStart, setLunchStart] = useState('11:30');
  const [lunchEnd, setLunchEnd] = useState('12:00');
  const [maxCaseloadMinutes, setMaxCaseloadMinutes] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleCertification = (cert: string) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
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
    if (lunchStart >= lunchEnd) {
      newErrors.lunchEnd = 'Lunch end must be after start';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createStaff({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      staffType,
      certifications,
      schoolId: state.school?.id || '',
      lunchWindow: {
        id: '',
        startTime: lunchStart,
        endTime: lunchEnd,
        daysOfWeek: [...ALL_DAYS],
        label: 'Lunch',
      },
      blockedTimes: [],
      maxCaseloadMinutes: maxCaseloadMinutes === '' ? undefined : maxCaseloadMinutes,
    });

    onClose();
  };

  const staffTypeOptions: StaffType[] = [
    'ese_teacher',
    'paraprofessional',
    'speech_therapist',
    'occupational_therapist',
    'physical_therapist',
    'other_related_service',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Staff Member</h3>
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
              <label className="form-label">Staff Type</label>
              <select
                className="form-select"
                value={staffType}
                onChange={(e) => setStaffType(e.target.value as StaffType)}
              >
                {staffTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {STAFF_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Certifications</label>
              <div className="checkbox-grid">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <label key={cert} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={certifications.includes(cert)}
                      onChange={() => toggleCertification(cert)}
                    />
                    <span>{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Lunch Start</label>
                <input
                  type="time"
                  className="form-input"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lunch End</label>
                <input
                  type="time"
                  className={`form-input ${errors.lunchEnd ? 'form-input--error' : ''}`}
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                />
                {errors.lunchEnd && <div className="form-error">{errors.lunchEnd}</div>}
              </div>
            </div>
            <div className="form-hint">
              Staff cannot be scheduled during their lunch window (minimum 30 minutes required).
            </div>

            <div className="form-group">
              <label className="form-label">Max Weekly Caseload (minutes, optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Leave blank for no limit"
                value={maxCaseloadMinutes}
                onChange={(e) => setMaxCaseloadMinutes(e.target.value === '' ? '' : parseInt(e.target.value))}
                min="0"
              />
              <div className="form-hint">
                Set a maximum number of service minutes this staff member can be assigned per week.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStaffModal;
