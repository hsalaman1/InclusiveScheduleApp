import { useScheduler } from './context/SchedulerContext';
import { Navigation } from './components/Navigation';
import { SchoolSetup } from './components/SchoolSetup';
import { ClassroomEditor } from './components/ClassroomEditor';
import { Students } from './components/Students';
import { Staff } from './components/Staff';
import { ScheduleBuilder } from './components/Schedule';
import { Compliance } from './components/Compliance';
import { Import } from './components/Import';

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
        return <Compliance />;
      case 'import':
        return <Import />;
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
