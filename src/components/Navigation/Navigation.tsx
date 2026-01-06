import { useScheduler } from '../../context/SchedulerContext';
import { ViewType } from '../../types';
import './Navigation.css';

interface NavItem {
  id: ViewType;
  label: string;
  requiresSchool: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'setup', label: 'Setup', requiresSchool: false },
  { id: 'classrooms', label: 'Classrooms', requiresSchool: true },
  { id: 'students', label: 'Students', requiresSchool: true },
  { id: 'staff', label: 'Staff', requiresSchool: true },
  { id: 'schedule', label: 'Schedule', requiresSchool: true },
  { id: 'compliance', label: 'Compliance', requiresSchool: true },
  { id: 'import', label: 'Import', requiresSchool: true },
];

export function Navigation() {
  const { state, dispatch } = useScheduler();
  const { currentView, school, conflicts } = state;

  const handleNavClick = (viewId: ViewType) => {
    dispatch({ type: 'SET_VIEW', payload: viewId });
  };

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  return (
    <header className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1 className="nav-title">Inclusive Scheduler</h1>
          {school && <span className="nav-school-name">{school.name}</span>}
        </div>

        <nav className="nav-tabs">
          {NAV_ITEMS.map((item) => {
            const isDisabled = item.requiresSchool && !school;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                className={`nav-tab ${isActive ? 'nav-tab--active' : ''} ${
                  isDisabled ? 'nav-tab--disabled' : ''
                }`}
                onClick={() => handleNavClick(item.id)}
                disabled={isDisabled}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {item.id === 'compliance' && (errorCount > 0 || warningCount > 0) && (
                  <span
                    className={`nav-badge ${
                      errorCount > 0 ? 'nav-badge--error' : 'nav-badge--warning'
                    }`}
                  >
                    {errorCount > 0 ? errorCount : warningCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="nav-actions">
          {school && (
            <span className="nav-school-type">
              {school.level === 'elementary' ? 'Elementary' : 'Secondary'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navigation;
