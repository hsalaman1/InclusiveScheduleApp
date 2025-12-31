import { useState } from 'react';
import { BellSchedule } from './types';
import { BellScheduleSelector } from './components/BellScheduleSelector';
import { ScheduleDisplay } from './components/ScheduleDisplay';

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<BellSchedule | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Inclusive Schedule App</h1>
        <p>Bell Schedule Template System</p>
      </header>

      <main className="app-main">
        <BellScheduleSelector
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />

        {selectedTemplate && (
          <ScheduleDisplay schedule={selectedTemplate} />
        )}
      </main>

      <footer className="app-footer">
        <p>Select a template above to view the daily schedule</p>
      </footer>
    </div>
  );
}

export default App;
