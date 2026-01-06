import { ContentArea, DeliveryModel } from '../types';

/**
 * Service Duration Matrix
 *
 * Based on district requirements:
 * - In-class support (Co-Teaching, Support Facilitation) uses shorter durations
 * - Resource Room uses full block times
 *
 * These are suggested defaults that can be overridden per student.
 */

type DurationMatrix = {
  [K in ContentArea]?: {
    [M in DeliveryModel]?: number;
  };
};

export const SERVICE_DURATION_MATRIX: DurationMatrix = {
  ela: {
    co_teaching: 45,
    support_facilitation: 45,
    resource_room: 90,
  },
  math: {
    co_teaching: 30,
    support_facilitation: 30,
    resource_room: 60,
  },
  science: {
    co_teaching: 25,
    support_facilitation: 25,
    resource_room: 25,
  },
  social_studies: {
    co_teaching: 10,
    support_facilitation: 10,
    resource_room: 10,
  },
  social_skills: {
    co_teaching: 30,
    support_facilitation: 30,
    resource_room: 30,
  },
  other: {
    co_teaching: 30,
    support_facilitation: 30,
    resource_room: 30,
  },
};

/**
 * Get suggested duration for a content area and delivery model combination
 */
export function getSuggestedDuration(
  contentArea: ContentArea,
  deliveryModel: DeliveryModel
): number | null {
  const areaConfig = SERVICE_DURATION_MATRIX[contentArea];
  if (!areaConfig) return null;
  return areaConfig[deliveryModel] ?? null;
}

/**
 * Default frequency options (days per week)
 */
export const FREQUENCY_OPTIONS = [
  { value: 1, label: '1 day/week' },
  { value: 2, label: '2 days/week' },
  { value: 3, label: '3 days/week' },
  { value: 4, label: '4 days/week' },
  { value: 5, label: '5 days/week (Daily)' },
];

/**
 * Calculate total weekly minutes from session minutes and frequency
 */
export function calculateTotalWeeklyMinutes(
  minutesPerSession: number,
  frequencyPerWeek: number
): number {
  return minutesPerSession * frequencyPerWeek;
}

/**
 * Resource room recommended maximum group sizes
 */
export const RESOURCE_ROOM_MAX_CAPACITY: Record<ContentArea, number> = {
  ela: 6,
  math: 6,
  science: 8,
  social_studies: 8,
  social_skills: 4,
  specials: 10,
  lunch: 0,
  recess: 0,
  other: 6,
};

/**
 * Get maximum recommended group size for a content area
 */
export function getMaxGroupSize(contentArea: ContentArea): number {
  return RESOURCE_ROOM_MAX_CAPACITY[contentArea] ?? 6;
}
