import { BellSchedule, SchoolType } from '../../types';
import { bellScheduleTemplates } from '../../data/bellScheduleTemplates';
import { getSchoolTypeLabel } from '../../utils/scheduleUtils';
import './BellScheduleSelector.css';

interface BellScheduleSelectorProps {
  selectedTemplate: BellSchedule | null;
  onSelectTemplate: (template: BellSchedule) => void;
}

export const BellScheduleSelector = ({
  selectedTemplate,
  onSelectTemplate
}: BellScheduleSelectorProps) => {
  return (
    <div className="bell-schedule-selector">
      <h2>Select a Schedule Template</h2>
      <div className="template-grid">
        {bellScheduleTemplates.map(template => (
          <div
            key={template.id}
            className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="template-icon">
              {getSchoolIcon(template.schoolType)}
            </div>
            <h3>{template.name}</h3>
            <p className="school-type">{getSchoolTypeLabel(template.schoolType)}</p>
            <div className="template-details">
              <span className="grade-levels">
                Grades: {template.gradeLevels.join(', ')}
              </span>
              <span className="instructional-minutes">
                {template.totalInstructionalMinutes} instructional min
              </span>
            </div>
            <p className="period-count">{template.periods.length} periods</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const getSchoolIcon = (schoolType: SchoolType): string => {
  const icons: Record<SchoolType, string> = {
    elementary: '🏫',
    middle: '🏛️',
    high: '🎓'
  };
  return icons[schoolType];
};
