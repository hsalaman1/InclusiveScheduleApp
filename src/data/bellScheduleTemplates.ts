import { BellSchedule, Period } from '../types';
import { v4 as uuidv4 } from 'uuid';

const createPeriod = (
  name: string,
  startTime: string,
  endTime: string,
  isInstructional: boolean = true
): Period => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  return {
    id: uuidv4(),
    name,
    startTime,
    endTime,
    isInstructional,
    durationMinutes
  };
};

export const elementaryTemplate: BellSchedule = {
  id: 'elementary-template',
  schoolType: 'elementary',
  name: 'Standard Elementary Schedule',
  gradeLevels: ['K', '1', '2', '3', '4', '5'],
  periods: [
    createPeriod('Morning Meeting', '08:20', '08:50', true),
    createPeriod('ELA Block', '08:50', '10:20', true),
    createPeriod('Specials Connection', '10:20', '10:50', true),
    createPeriod('Intervention/Enrichment', '10:50', '11:20', true),
    createPeriod('Math Block', '11:20', '12:20', true),
    createPeriod('Lunch', '12:20', '12:50', false),
    createPeriod('Recess', '12:50', '13:20', false),
    createPeriod('Science/Social Studies', '13:20', '14:20', true),
    createPeriod('Specials', '14:20', '14:50', true),
    createPeriod('Closing/Dismissal', '14:50', '15:20', false),
  ],
  totalInstructionalMinutes: 330
};

export const middleSchoolTemplate: BellSchedule = {
  id: 'middle-template',
  schoolType: 'middle',
  name: 'Standard Middle School Schedule',
  gradeLevels: ['6', '7', '8'],
  periods: [
    createPeriod('Period 1', '09:30', '10:20', true),
    createPeriod('Period 2', '10:25', '11:15', true),
    createPeriod('Period 3', '11:20', '12:10', true),
    createPeriod('Period 4', '12:15', '13:05', true),
    createPeriod('Lunch', '13:05', '13:35', false),
    createPeriod('Period 5', '13:40', '14:30', true),
    createPeriod('Period 6', '14:35', '15:25', true),
    createPeriod('Period 7', '15:30', '16:20', true),
  ],
  totalInstructionalMinutes: 350
};

export const highSchoolTemplate: BellSchedule = {
  id: 'high-template',
  schoolType: 'high',
  name: 'Standard High School Schedule',
  gradeLevels: ['9', '10', '11', '12'],
  periods: [
    createPeriod('Period 1', '07:15', '08:10', true),
    createPeriod('Period 2', '08:15', '09:10', true),
    createPeriod('Period 3', '09:15', '10:10', true),
    createPeriod('Period 4', '10:15', '11:10', true),
    createPeriod('Lunch', '11:10', '11:40', false),
    createPeriod('Period 5', '11:45', '12:40', true),
    createPeriod('Period 6', '12:45', '13:40', true),
    createPeriod('Period 7', '13:45', '14:40', true),
  ],
  totalInstructionalMinutes: 385
};

export const bellScheduleTemplates: BellSchedule[] = [
  elementaryTemplate,
  middleSchoolTemplate,
  highSchoolTemplate
];
