import { useState, useCallback } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import {
  parseCSV,
  getCSVHeaders,
  detectColumnMappings,
  validateAndPreviewImport,
  convertPreviewsToStudents,
  FocusColumnMapping,
  StudentImportPreview,
  ImportValidationResult,
  ParsedCSVRow,
} from '../../utils/csvImport';
import './Import.css';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'complete';

export function Import() {
  const { state, dispatch } = useScheduler();
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvRows, setCsvRows] = useState<ParsedCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<FocusColumnMapping>>({});
  const [previews, setPreviews] = useState<StudentImportPreview[]>([]);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string>('');

  const defaultClassroomId = state.classrooms[0]?.id || '';

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;

        const parsedHeaders = getCSVHeaders(text);
        setHeaders(parsedHeaders);

        const rows = parseCSV(text);
        setCsvRows(rows);

        const detectedMapping = detectColumnMappings(parsedHeaders);
        setMapping(detectedMapping);

        setStep('mapping');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  }, []);

  const handleMappingChange = (field: keyof FocusColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleValidateMapping = () => {
    if (!mapping.studentId || !mapping.firstName || !mapping.lastName) {
      setError('Student ID, First Name, and Last Name are required mappings');
      return;
    }

    setError('');

    const result = validateAndPreviewImport(
      csvRows,
      mapping as FocusColumnMapping
    );

    setValidation(result.validation);
    setPreviews(result.previews);
    setStep('preview');
  };

  const handleImport = () => {
    if (!state.school) {
      setError('No school configured');
      return;
    }

    const students = convertPreviewsToStudents(
      previews,
      state.school.id,
      defaultClassroomId
    );

    dispatch({ type: 'IMPORT_STUDENTS', payload: students });
    setImportedCount(students.length);
    setStep('complete');
  };

  const handleReset = () => {
    setStep('upload');
    setCsvRows([]);
    setHeaders([]);
    setMapping({});
    setPreviews([]);
    setValidation(null);
    setImportedCount(0);
    setError('');
  };

  if (!state.school) {
    return (
      <div className="import-page">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before importing students.
          </p>
        </div>
      </div>
    );
  }

  if (state.classrooms.length === 0) {
    return (
      <div className="import-page">
        <div className="empty-state">
          <div className="empty-state-title">No Classrooms Available</div>
          <p className="empty-state-description">
            Please create at least one classroom before importing students.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="import-page">
      <div className="page-header">
        <h2>Import Students</h2>
        <p>Import student data from FOCUS CSV exports.</p>
      </div>

      {/* Progress Steps */}
      <div className="import-progress">
        <div className={`progress-step ${step === 'upload' ? 'active' : 'completed'}`}>
          <span className="step-number">1</span>
          <span className="step-label">Upload File</span>
        </div>
        <div className={`progress-step ${step === 'mapping' ? 'active' : ['preview', 'complete'].includes(step) ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Map Columns</span>
        </div>
        <div className={`progress-step ${step === 'preview' ? 'active' : step === 'complete' ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Review</span>
        </div>
        <div className={`progress-step ${step === 'complete' ? 'active' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">Complete</span>
        </div>
      </div>

      {error && (
        <div className="import-error">
          {error}
        </div>
      )}

      <div className="import-content">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="import-step upload-step">
            <div className="upload-zone">
              <div className="upload-icon">CSV</div>
              <h3>Upload FOCUS Export</h3>
              <p>Select a CSV file exported from FOCUS containing student ESE service data.</p>
              <label className="btn btn-primary upload-btn">
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  hidden
                />
              </label>
            </div>

            <div className="upload-info">
              <h4>Expected CSV Format</h4>
              <p>The CSV should include columns for:</p>
              <ul>
                <li>Student ID (required)</li>
                <li>First Name (required)</li>
                <li>Last Name (required)</li>
                <li>Grade Level</li>
                <li>ESE Content Area</li>
                <li>Delivery Model / Service Setting</li>
                <li>Minutes per Week</li>
                <li>Frequency per Week</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="import-step mapping-step">
            <h3>Map CSV Columns</h3>
            <p>Match your CSV columns to the required fields. Fields with * are required.</p>

            <div className="mapping-grid">
              <div className="mapping-row">
                <label className="mapping-label">Student ID *</label>
                <select
                  className="form-select"
                  value={mapping.studentId || ''}
                  onChange={(e) => handleMappingChange('studentId', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">First Name *</label>
                <select
                  className="form-select"
                  value={mapping.firstName || ''}
                  onChange={(e) => handleMappingChange('firstName', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">Last Name *</label>
                <select
                  className="form-select"
                  value={mapping.lastName || ''}
                  onChange={(e) => handleMappingChange('lastName', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">Grade Level</label>
                <select
                  className="form-select"
                  value={mapping.gradeLevel || ''}
                  onChange={(e) => handleMappingChange('gradeLevel', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">ESE Content Area</label>
                <select
                  className="form-select"
                  value={mapping.eseContentArea || ''}
                  onChange={(e) => handleMappingChange('eseContentArea', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">Delivery Model</label>
                <select
                  className="form-select"
                  value={mapping.deliveryModel || ''}
                  onChange={(e) => handleMappingChange('deliveryModel', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">Minutes per Week</label>
                <select
                  className="form-select"
                  value={mapping.minutesPerWeek || ''}
                  onChange={(e) => handleMappingChange('minutesPerWeek', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-row">
                <label className="mapping-label">Frequency per Week</label>
                <select
                  className="form-select"
                  value={mapping.frequencyPerWeek || ''}
                  onChange={(e) => handleMappingChange('frequencyPerWeek', e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="csv-preview">
              <h4>CSV Preview (First 5 Rows)</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.map((h) => (
                          <td key={h}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={handleReset}>
                Start Over
              </button>
              <button className="btn btn-primary" onClick={handleValidateMapping}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && validation && (
          <div className="import-step preview-step">
            <h3>Review Import</h3>

            {/* Validation Summary */}
            <div className="validation-summary">
              <div className={`summary-item ${validation.valid ? 'success' : 'error'}`}>
                <span className="summary-label">Status</span>
                <span className="summary-value">
                  {validation.valid ? 'Ready to Import' : 'Validation Errors'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Students</span>
                <span className="summary-value">{validation.studentCount}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Services</span>
                <span className="summary-value">{validation.serviceCount}</span>
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="validation-errors">
                <h4>Errors</h4>
                <ul>
                  {validation.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validation.errors.length > 10 && (
                    <li>... and {validation.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            <div className="preview-table">
              <h4>Students to Import</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Grade</th>
                      <th>Services</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.slice(0, 20).map((preview) => (
                      <tr key={preview.studentId}>
                        <td className="monospace">{preview.studentId}</td>
                        <td>{preview.lastName}, {preview.firstName}</td>
                        <td>{preview.gradeLevel}</td>
                        <td>{preview.services.length} service(s)</td>
                        <td>
                          {preview.hasWarnings ? (
                            <span className="text-warning" title={preview.warnings.join(', ')}>
                              Warning
                            </span>
                          ) : (
                            <span className="text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previews.length > 20 && (
                  <p className="table-note">Showing first 20 of {previews.length} students</p>
                )}
              </div>
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('mapping')}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!validation.valid}
              >
                Import {validation.studentCount} Students
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="import-step complete-step">
            <div className="complete-icon">OK</div>
            <h3>Import Complete</h3>
            <p>Successfully imported {importedCount} students.</p>
            <p className="complete-note">
              Students have been assigned to the default classroom. You can reassign them in the Students section.
            </p>
            <div className="step-actions">
              <button className="btn btn-primary" onClick={handleReset}>
                Import More
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'students' })}
              >
                View Students
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Import;
