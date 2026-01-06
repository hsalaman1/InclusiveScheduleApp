import { useState, useEffect } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  ContentArea,
  DeliveryModel,
  ServiceCategory,
  CONTENT_AREA_LABELS,
  DELIVERY_MODEL_LABELS,
} from '../../types';
import { getSuggestedDuration, FREQUENCY_OPTIONS, calculateTotalWeeklyMinutes } from '../../data/serviceDurations';
import './Students.css';

interface ServiceModalProps {
  studentId: string;
  serviceId?: string;
  onClose: () => void;
}

export function ServiceModal({ studentId, serviceId, onClose }: ServiceModalProps) {
  const { state, createService, dispatch } = useScheduler();

  const student = state.students.find((s) => s.id === studentId);
  const existingService = serviceId
    ? student?.services.find((s) => s.id === serviceId)
    : null;

  const [contentArea, setContentArea] = useState<ContentArea>(
    existingService?.contentArea || 'ela'
  );
  const [deliveryModel, setDeliveryModel] = useState<DeliveryModel>(
    existingService?.deliveryModel || 'support_facilitation'
  );
  const [minutesPerSession, setMinutesPerSession] = useState<number>(
    existingService?.minutesPerSession || 45
  );
  const [frequencyPerWeek, setFrequencyPerWeek] = useState<number>(
    existingService?.frequencyPerWeek || 5
  );
  const [iepRequiredMinutes, setIepRequiredMinutes] = useState<number>(
    existingService?.iepRequiredMinutes || 0
  );
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    existingService?.serviceCategory || 'instructional'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-suggest duration when content area or delivery model changes
  useEffect(() => {
    if (!existingService) {
      const suggested = getSuggestedDuration(contentArea, deliveryModel);
      if (suggested) {
        setMinutesPerSession(suggested);
      }
    }
  }, [contentArea, deliveryModel, existingService]);

  // Calculate total weekly minutes
  const totalWeeklyMinutes = calculateTotalWeeklyMinutes(minutesPerSession, frequencyPerWeek);

  // Auto-set IEP required minutes to match calculated if not set
  useEffect(() => {
    if (!existingService && iepRequiredMinutes === 0) {
      setIepRequiredMinutes(totalWeeklyMinutes);
    }
  }, [totalWeeklyMinutes, existingService, iepRequiredMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (minutesPerSession <= 0) {
      newErrors.minutesPerSession = 'Minutes must be greater than 0';
    }
    if (frequencyPerWeek < 1 || frequencyPerWeek > 5) {
      newErrors.frequencyPerWeek = 'Frequency must be between 1 and 5';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const serviceData = {
      contentArea,
      deliveryModel,
      minutesPerSession,
      frequencyPerWeek,
      totalWeeklyMinutes,
      iepRequiredMinutes,
      serviceCategory,
    };

    if (existingService) {
      dispatch({
        type: 'UPDATE_SERVICE',
        payload: {
          studentId,
          serviceId: existingService.id,
          updates: serviceData,
        },
      });
    } else {
      createService(studentId, serviceData);
    }

    onClose();
  };

  const contentAreaOptions: ContentArea[] = [
    'ela',
    'math',
    'science',
    'social_studies',
    'social_skills',
    'other',
  ];

  const deliveryModelOptions: DeliveryModel[] = [
    'co_teaching',
    'support_facilitation',
    'resource_room',
  ];

  const suggestedMinutes = getSuggestedDuration(contentArea, deliveryModel);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {existingService ? 'Edit Service' : 'Add Service'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
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

              <div className="form-group">
                <label className="form-label">Delivery Model</label>
                <select
                  className="form-select"
                  value={deliveryModel}
                  onChange={(e) => setDeliveryModel(e.target.value as DeliveryModel)}
                >
                  {deliveryModelOptions.map((model) => (
                    <option key={model} value={model}>
                      {DELIVERY_MODEL_LABELS[model]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Minutes per Session</label>
                <input
                  type="number"
                  className={`form-input ${errors.minutesPerSession ? 'form-input--error' : ''}`}
                  value={minutesPerSession}
                  onChange={(e) => setMinutesPerSession(parseInt(e.target.value) || 0)}
                  min="1"
                  max="180"
                />
                {suggestedMinutes && (
                  <div className="form-hint">
                    Suggested: {suggestedMinutes} min for {CONTENT_AREA_LABELS[contentArea]} {DELIVERY_MODEL_LABELS[deliveryModel]}
                  </div>
                )}
                {errors.minutesPerSession && (
                  <div className="form-error">{errors.minutesPerSession}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  className="form-select"
                  value={frequencyPerWeek}
                  onChange={(e) => setFrequencyPerWeek(parseInt(e.target.value))}
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.frequencyPerWeek && (
                  <div className="form-error">{errors.frequencyPerWeek}</div>
                )}
              </div>
            </div>

            <div className="calculated-total">
              <span className="total-label">Total Weekly Minutes:</span>
              <span className="total-value">{totalWeeklyMinutes} min/week</span>
            </div>

            <div className="form-group">
              <label className="form-label">IEP Required Minutes (per week)</label>
              <input
                type="number"
                className="form-input"
                value={iepRequiredMinutes}
                onChange={(e) => setIepRequiredMinutes(parseInt(e.target.value) || 0)}
                min="0"
              />
              <div className="form-hint">
                Enter the total weekly minutes required by the IEP for compliance tracking.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Service Category</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="serviceCategory"
                    value="instructional"
                    checked={serviceCategory === 'instructional'}
                    onChange={() => setServiceCategory('instructional')}
                  />
                  <span>Instructional (ELA, Math, Science, Social Studies)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="serviceCategory"
                    value="related"
                    checked={serviceCategory === 'related'}
                    onChange={() => setServiceCategory('related')}
                  />
                  <span>Related Service (Speech, OT, PT, Social Skills)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {existingService ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceModal;
