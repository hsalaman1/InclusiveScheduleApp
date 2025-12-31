export interface Period {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isInstructional: boolean;
  durationMinutes: number;
}

export interface BellSchedule {
  id: string;
  schoolType: 'elementary' | 'middle' | 'high';
  name: string;
  gradeLevels: string[];
  periods: Period[];
  totalInstructionalMinutes: number;
}

export type SchoolType = 'elementary' | 'middle' | 'high';
