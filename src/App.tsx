import { useState, useEffect, useCallback } from 'react';
import { BellSchedule } from './types';
import { BellScheduleSelector } from './components/BellScheduleSelector';
import { ScheduleDisplay } from './components/ScheduleDisplay';
import { ScheduleActions } from './components/ScheduleActions';
import { ExportPanel } from './components/ExportPanel';
import { SavedSchedules } from './components/SavedSchedules';
import { DataManagement } from './components/DataManagement';
import { scheduleRepository, SavedScheduleEntry } from './services';

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<BellSchedule | null>(null);
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'saved' | 'reports'>('templates');

  // Load saved schedules on mount
  useEffect(() => {
    loadSavedSchedules();
  }, []);

  const loadSavedSchedules = useCallback(() => {
    const entries = scheduleRepository.getAll();
    setSavedSchedules(entries);
  }, []);

  const handleDeleteSchedule = useCallback((id: string) => {
    scheduleRepository.delete(id);
    loadSavedSchedules();
    // Clear selection if deleted schedule was selected
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate, loadSavedSchedules]);

  const handleSelectSavedSchedule = useCallback((schedule: BellSchedule) => {
    setSelectedTemplate(schedule);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Inclusive Schedule App</h1>
        <p>Bell Schedule Template System with Database & Reporting</p>
      </header>

      <main className="app-main">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved ({savedSchedules.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports & Data
          </button>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            <BellScheduleSelector
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
            />

            {selectedTemplate && (
              <>
                <ScheduleActions
                  schedule={selectedTemplate}
                  onScheduleSaved={loadSavedSchedules}
                />
                <ScheduleDisplay schedule={selectedTemplate} />
              </>
            )}
          </>
        )}

        {/* Saved Schedules Tab */}
        {activeTab === 'saved' && (
          <>
            <SavedSchedules
              entries={savedSchedules}
              onSelectSchedule={handleSelectSavedSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              selectedScheduleId={selectedTemplate?.id}
            />

            {selectedTemplate && (
              <>
                <ScheduleActions
                  schedule={selectedTemplate}
                  onScheduleSaved={loadSavedSchedules}
                />
                <ScheduleDisplay schedule={selectedTemplate} />
              </>
            )}
          </>
        )}

        {/* Reports & Data Tab */}
        {activeTab === 'reports' && (
          <>
            <ExportPanel
              schedule={selectedTemplate}
              savedSchedules={savedSchedules.map(e => e.schedule)}
            />

            <DataManagement
              onDataImported={loadSavedSchedules}
              onClearAll={loadSavedSchedules}
            />

            {selectedTemplate && (
              <ScheduleDisplay schedule={selectedTemplate} />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          {selectedTemplate
            ? `Viewing: ${selectedTemplate.name}`
            : 'Select a template or saved schedule to view'}
        </p>
      </footer>
    </div>
  );
}

export default App;
