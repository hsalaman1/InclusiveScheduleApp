import { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { StaffList } from './StaffList';
import { StaffDetail } from './StaffDetail';
import { AddStaffModal } from './AddStaffModal';
import './Staff.css';

export function Staff() {
  const { state } = useScheduler();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  if (!state.school) {
    return (
      <div className="staff-page">
        <div className="empty-state">
          <div className="empty-state-title">No School Configured</div>
          <p className="empty-state-description">
            Please set up your school first before managing staff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-page">
      {selectedStaffId ? (
        <StaffDetail
          staffId={selectedStaffId}
          onBack={() => setSelectedStaffId(null)}
        />
      ) : (
        <>
          <div className="page-header">
            <h2>Staff</h2>
            <p>Manage ESE teachers, paraprofessionals, and related service providers.</p>
          </div>
          <StaffList
            onSelectStaff={setSelectedStaffId}
            onAddStaff={() => setIsAddingStaff(true)}
          />
        </>
      )}

      {isAddingStaff && (
        <AddStaffModal onClose={() => setIsAddingStaff(false)} />
      )}
    </div>
  );
}

export default Staff;
