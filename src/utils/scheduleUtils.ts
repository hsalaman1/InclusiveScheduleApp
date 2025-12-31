import { v4 as uuidv4 } from 'uuid';
import { BellSchedule, Period, SchoolType } from '../types';
import { bellScheduleTemplates } from '../data/bellScheduleTemplates';

export const calculateInstructionalMinutes = (periods: Period[]): number => {
  return periods
    .filter(p => p.isInstructional)
    .reduce((total, p) => total + p.durationMinutes, 0);
};

export const getTemplateBySchoolType = (
  schoolType: SchoolType
): BellSchedule | undefined => {
  return bellScheduleTemplates.find(template => template.schoolType === schoolType);
};

export const cloneTemplate = (
  template: BellSchedule,
  newId: string,
  newName: string
): BellSchedule => {
  return {
    ...template,
    id: newId,
    name: newName,
    periods: template.periods.map(period => ({
      ...period,
      id: uuidv4()
    }))
  };
};

export const getTemplatesForGrade = (grade: string): BellSchedule[] => {
  return bellScheduleTemplates.filter(template =>
    template.gradeLevels.includes(grade)
  );
};

export const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const getSchoolTypeLabel = (schoolType: SchoolType): string => {
  const labels: Record<SchoolType, string> = {
    elementary: 'Elementary School',
    middle: 'Middle School',
    high: 'High School'
  };
  return labels[schoolType];
};
