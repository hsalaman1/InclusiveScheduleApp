import { Student, StudentService, ContentArea, DeliveryModel, ServiceCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * FOCUS CSV column mapping interface
 */
export interface FocusColumnMapping {
  studentId: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  eseContentArea?: string;
  deliveryModel?: string;
  minutesPerWeek?: string;
  frequencyPerWeek?: string;
}

/**
 * Parsed CSV row interface
 */
export interface ParsedCSVRow {
  [key: string]: string;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  studentCount: number;
  serviceCount: number;
}

/**
 * Student import preview
 */
export interface StudentImportPreview {
  studentId: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  services: Array<{
    contentArea: string;
    deliveryModel: string;
    minutesPerWeek: number;
    frequencyPerWeek: number;
  }>;
  hasWarnings: boolean;
  warnings: string[];
}

/**
 * Parse CSV string into rows
 */
export function parseCSV(csvText: string): ParsedCSVRow[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = parseCSVLine(lines[0]);
  const rows: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: ParsedCSVRow = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Get column headers from CSV text
 */
export function getCSVHeaders(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return [];
  }
  return parseCSVLine(lines[0]).map((h) => h.trim());
}

/**
 * Map content area from FOCUS format to internal format
 */
function mapContentArea(focusValue: string): ContentArea {
  const value = focusValue.toLowerCase().trim();

  if (value.includes('reading') || value.includes('ela') || value.includes('language')) {
    return 'ela';
  }
  if (value.includes('math')) {
    return 'math';
  }
  if (value.includes('science')) {
    return 'science';
  }
  if (value.includes('social') && value.includes('studies')) {
    return 'social_studies';
  }
  if (value.includes('social') && value.includes('skill')) {
    return 'social_skills';
  }

  return 'other';
}

/**
 * Map delivery model from FOCUS format to internal format
 */
function mapDeliveryModel(focusValue: string): DeliveryModel {
  const value = focusValue.toLowerCase().trim();

  if (value.includes('co-teach') || value.includes('coteach')) {
    return 'co_teaching';
  }
  if (value.includes('support') || value.includes('consultation')) {
    return 'support_facilitation';
  }
  if (value.includes('resource') || value.includes('pullout') || value.includes('pull-out')) {
    return 'resource_room';
  }

  // Default to support facilitation
  return 'support_facilitation';
}

/**
 * Validate and preview import data
 */
export function validateAndPreviewImport(
  rows: ParsedCSVRow[],
  mapping: FocusColumnMapping
): {
  validation: ImportValidationResult;
  previews: StudentImportPreview[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const previews: StudentImportPreview[] = [];
  const studentMap = new Map<string, StudentImportPreview>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for 1-indexed and header row

    const studentId = row[mapping.studentId]?.trim();
    const firstName = row[mapping.firstName]?.trim();
    const lastName = row[mapping.lastName]?.trim();
    const gradeLevel = row[mapping.gradeLevel]?.trim();

    // Validate required fields
    if (!studentId) {
      errors.push(`Row ${rowNum}: Missing student ID`);
      return;
    }
    if (!firstName) {
      errors.push(`Row ${rowNum}: Missing first name`);
      return;
    }
    if (!lastName) {
      errors.push(`Row ${rowNum}: Missing last name`);
      return;
    }

    // Get or create student preview
    let preview = studentMap.get(studentId);
    if (!preview) {
      preview = {
        studentId,
        firstName,
        lastName,
        gradeLevel: gradeLevel || 'K',
        services: [],
        hasWarnings: false,
        warnings: [],
      };
      studentMap.set(studentId, preview);
    }

    // Parse service info if available
    if (mapping.eseContentArea && row[mapping.eseContentArea]) {
      const contentAreaRaw = row[mapping.eseContentArea];
      const deliveryModelRaw = mapping.deliveryModel ? row[mapping.deliveryModel] : '';
      const minutesPerWeekRaw = mapping.minutesPerWeek ? row[mapping.minutesPerWeek] : '0';
      const frequencyPerWeekRaw = mapping.frequencyPerWeek ? row[mapping.frequencyPerWeek] : '5';

      const minutesPerWeek = parseInt(minutesPerWeekRaw, 10) || 0;
      const frequencyPerWeek = parseInt(frequencyPerWeekRaw, 10) || 5;

      if (minutesPerWeek === 0) {
        preview.hasWarnings = true;
        preview.warnings.push(`Row ${rowNum}: No minutes specified, using default`);
      }

      preview.services.push({
        contentArea: contentAreaRaw,
        deliveryModel: deliveryModelRaw || 'Support Facilitation',
        minutesPerWeek: minutesPerWeek || 180, // Default 3 hrs/week
        frequencyPerWeek: Math.min(frequencyPerWeek, 5),
      });
    }
  });

  // Convert map to array
  studentMap.forEach((preview) => {
    previews.push(preview);
    if (preview.services.length === 0) {
      preview.hasWarnings = true;
      preview.warnings.push('No services found - student will be imported without services');
    }
  });

  const validation: ImportValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    studentCount: previews.length,
    serviceCount: previews.reduce((sum, p) => sum + p.services.length, 0),
  };

  return { validation, previews };
}

/**
 * Convert previews to actual Student objects
 */
export function convertPreviewsToStudents(
  previews: StudentImportPreview[],
  schoolId: string,
  defaultClassroomId: string
): Student[] {
  const now = new Date().toISOString();

  return previews.map((preview) => {
    const studentUuid = uuidv4();

    const services: StudentService[] = preview.services.map((svc) => {
      const contentArea = mapContentArea(svc.contentArea);
      const deliveryModel = mapDeliveryModel(svc.deliveryModel);
      const minutesPerSession = Math.round(svc.minutesPerWeek / svc.frequencyPerWeek);

      return {
        id: uuidv4(),
        studentId: studentUuid,
        contentArea,
        deliveryModel,
        minutesPerSession,
        frequencyPerWeek: svc.frequencyPerWeek,
        totalWeeklyMinutes: svc.minutesPerWeek,
        iepRequiredMinutes: svc.minutesPerWeek,
        serviceCategory: 'instructional' as ServiceCategory,
      };
    });

    return {
      id: studentUuid,
      firstName: preview.firstName,
      lastName: preview.lastName,
      studentId: preview.studentId,
      gradeLevel: preview.gradeLevel,
      schoolId,
      classroomId: defaultClassroomId,
      services,
      hasOneToOneParapro: false,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Detect likely column mappings based on header names
 */
export function detectColumnMappings(headers: string[]): Partial<FocusColumnMapping> {
  const mapping: Partial<FocusColumnMapping> = {};

  const patterns = {
    studentId: ['student id', 'studentid', 'student_id', 'id', 'student number', 'local id'],
    firstName: ['first name', 'firstname', 'first_name', 'fname', 'given name'],
    lastName: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'],
    gradeLevel: ['grade', 'grade level', 'gradelevel', 'grade_level', 'yr'],
    eseContentArea: ['ese area', 'content area', 'service area', 'subject', 'ese content', 'primary area'],
    deliveryModel: ['delivery model', 'service model', 'setting', 'service type', 'placement'],
    minutesPerWeek: ['minutes', 'weekly minutes', 'minutes per week', 'iep minutes', 'service minutes'],
    frequencyPerWeek: ['frequency', 'days', 'times per week', 'sessions'],
  };

  headers.forEach((header) => {
    const headerLower = header.toLowerCase().trim();

    for (const [field, keywords] of Object.entries(patterns)) {
      if (keywords.some((kw) => headerLower.includes(kw) || kw.includes(headerLower))) {
        if (!mapping[field as keyof FocusColumnMapping]) {
          mapping[field as keyof FocusColumnMapping] = header;
        }
      }
    }
  });

  return mapping;
}
