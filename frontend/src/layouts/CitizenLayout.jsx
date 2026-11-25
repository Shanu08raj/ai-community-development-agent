import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CitizenNavbar } from '../components/layout/CitizenNavbar';
import { CitizenFooter } from '../components/layout/CitizenFooter';
import { ComplaintSubmissionModal } from '../components/complaints/ComplaintSubmissionModal';
import { ComplaintTrackingModal } from '../components/complaints/ComplaintTrackingModal';

export const CitizenLayout = () => {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [initialTrackingData, setInitialTrackingData] = useState(null);
  const [reportsRevision, setReportsRevision] = useState(0);

  const handleOpenSubmit = () => setSubmitModalOpen(true);
  const handleCloseSubmit = () => setSubmitModalOpen(false);
  const handleReportsChanged = () => setReportsRevision((n) => n + 1);

  const handleOpenTrack = (prefillData = null) => {
    setInitialTrackingData(prefillData);
    setTrackModalOpen(true);
  };
  const handleCloseTrack = () => {
    setTrackModalOpen(false);
    setInitialTrackingData(null);
  };

  const handleSubmissionSuccess = (complaintResult) => {
    setSubmitModalOpen(false);
    handleOpenTrack({
      referenceId: complaintResult.referenceId,
      trackingCode: complaintResult.trackingCode,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B1120] text-[#172033] dark:text-[#F8FAFC] transition-colors">
      <CitizenNavbar
        onOpenSubmitModal={handleOpenSubmit}
        onOpenTrackModal={() => handleOpenTrack()}
      />

      <main className="flex-1">
        <Outlet
          context={{
            onOpenSubmitModal: handleOpenSubmit,
            onOpenTrackModal: handleOpenTrack,
            reportsRevision,
            onReportsChanged: handleReportsChanged,
          }}
        />
      </main>

      <CitizenFooter />

      {/* Complaint Submission Modal */}
      <ComplaintSubmissionModal
        isOpen={submitModalOpen}
        onClose={handleCloseSubmit}
        onSuccess={handleSubmissionSuccess}
        onReportsChanged={handleReportsChanged}
      />

      {/* Complaint Tracking Modal */}
      <ComplaintTrackingModal
        isOpen={trackModalOpen}
        onClose={handleCloseTrack}
        initialData={initialTrackingData}
      />
    </div>
  );
};
