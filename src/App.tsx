import { useScheduler } from './context/SchedulerContext';
import { Navigation } from './components/Navigation';
import { SchoolSetup } from './components/SchoolSetup';
import { ClassroomEditor } from './components/ClassroomEditor';
import { Students } from './components/Students';
import { Staff } from './components/Staff';
import { ScheduleBuilder } from './components/Schedule';

// Placeholder components - will be replaced with full implementations in later sprints

function CompliancePlaceholder() {
  const { state } = useScheduler();
  return (
    <div className="placeholder-view">
      <h2>Compliance Dashboard</h2>
      <p>Monitor IEP compliance and resolve scheduling conflicts.</p>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{state.conflicts.filter(c => c.severity === 'error').length}</div>
          <div className="stat-label">Errors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{state.conflicts.filter(c => c.severity === 'warning').length}</div>
          <div className="stat-label">Warnings</div>
        </div>
      </div>
      <p className="placeholder-note">Compliance dashboard coming in Sprint 5.</p>
    </div>
  );
}

function ImportPlaceholder() {
  return (
    <div className="placeholder-view">
      <h2>Import Data</h2>
      <p>Import student data from FOCUS CSV exports.</p>
      <p className="placeholder-note">CSV import wizard coming in Sprint 6.</p>
    </div>
  );
}

function App() {
  const { state } = useScheduler();

  if (state.isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'setup':
        return <SchoolSetup />;
      case 'classrooms':
        return <ClassroomEditor />;
      case 'students':
        return <Students />;
      case 'staff':
        return <Staff />;
      case 'schedule':
        return <ScheduleBuilder />;
      case 'compliance':
        return <CompliancePlaceholder />;
      case 'import':
        return <ImportPlaceholder />;
      default:
        return <SchoolSetup />;
    }
  };

  return (
    <div className="app">
      <Navigation />
      <main className="app-main">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
