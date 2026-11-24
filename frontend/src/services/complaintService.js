import {
  INITIAL_COMPLAINTS,
  INITIAL_COMMUNITY_ISSUES,
  INITIAL_AUDIT_LOGS,
  INITIAL_AUTHORITIES,
} from '../data/mockData';

const COMPLAINTS_KEY = 'jansetu_demo_complaints';
const ISSUES_KEY = 'jansetu_demo_issues';
const AUDIT_LOGS_KEY = 'jansetu_demo_audit_logs';
const AUTHORITIES_KEY = 'jansetu_demo_authorities';

// Helper to safely read from localStorage
const getStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading key ${key} from storage:`, err);
    return fallback;
  }
};

const setStored = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing key ${key} to storage:`, err);
  }
};

export const complaintService = {
  getComplaints: () => {
    return getStored(COMPLAINTS_KEY, INITIAL_COMPLAINTS);
  },

  getCommunityIssues: () => {
    return getStored(ISSUES_KEY, INITIAL_COMMUNITY_ISSUES);
  },

  getAuditLogs: () => {
    return getStored(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
  },

  getAuthorities: () => {
    return getStored(AUTHORITIES_KEY, INITIAL_AUTHORITIES);
  },

  submitComplaint: (formData) => {
    const currentComplaints = getStored(COMPLAINTS_KEY, INITIAL_COMPLAINTS);
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    const newId = `JS-2026-${randomNumber}`;
    const newTrackingCode = `TRACK-${randomNumber.toString().slice(-3)}${randomSuffix}`;
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newComplaint = {
      id: newId,
      trackingCode: newTrackingCode,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category || 'Other',
      state: formData.state || 'Maharashtra',
      district: formData.district || 'Pune',
      area: formData.area.trim(),
      preferredLanguage: formData.preferredLanguage || 'English',
      contactInfo: formData.contactInfo ? formData.contactInfo.trim() : 'Anonymous Demo Citizen',
      priority: formData.priority || 'Medium',
      status: 'Submitted',
      submittedDate: formattedDate,
      aiConfidence: 91,
      recommendedAuthority: `Local ${formData.category || 'Civic'} Authority`,
      clusterId: null,
      timeline: [
        {
          status: 'Submitted',
          date: `${formattedDate} ${formattedTime}`,
          note: 'Demo complaint logged into JanSetu AI local browser storage.',
        },
      ],
    };

    const updatedComplaints = [newComplaint, ...currentComplaints];
    setStored(COMPLAINTS_KEY, updatedComplaints);

    // Also record audit log for demo
    const auditLogs = getStored(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
    const newLog = {
      id: `LOG-${Date.now()}`,
      action: 'CITIZEN_SUBMISSION',
      complaintId: newId,
      previousStatus: 'None',
      newStatus: 'Submitted',
      timestamp: `${formattedDate} ${formattedTime}`,
      adminUser: 'Public Citizen Portal',
      note: `New demo complaint registered in ${newComplaint.area}.`,
    };
    setStored(AUDIT_LOGS_KEY, [newLog, ...auditLogs]);

    return {
      success: true,
      complaint: newComplaint,
      trackingCode: newTrackingCode,
      referenceId: newId,
    };
  },

  trackComplaint: (referenceId, trackingCode) => {
    const complaints = getStored(COMPLAINTS_KEY, INITIAL_COMPLAINTS);
    const refClean = (referenceId || '').trim().toUpperCase();
    const codeClean = (trackingCode || '').trim().toUpperCase();

    if (!refClean || !codeClean) {
      return {
        success: false,
        error: 'Please enter both the Complaint Reference ID and the Secret Tracking Code.',
      };
    }

    const found = complaints.find(
      (c) =>
        c.id.toUpperCase() === refClean &&
        (c.trackingCode || '').toUpperCase() === codeClean
    );

    if (found) {
      return { success: true, complaint: found };
    }

    return {
      success: false,
      error: 'No complaint found matching this Reference ID and Tracking Code. Please verify your credentials or check sample demo IDs.',
    };
  },

  updateComplaintStatus: (complaintId, newStatus, adminNote = '') => {
    const complaints = getStored(COMPLAINTS_KEY, INITIAL_COMPLAINTS);
    const index = complaints.findIndex((c) => c.id === complaintId);

    if (index === -1) {
      return { success: false, error: 'Complaint not found.' };
    }

    const previousStatus = complaints[index].status;
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedTimeline = [
      ...complaints[index].timeline,
      {
        status: newStatus,
        date: `${formattedDate} ${formattedTime}`,
        note: adminNote.trim() || `Status updated from ${previousStatus} to ${newStatus} by Administrator.`,
      },
    ];

    const updatedComplaint = {
      ...complaints[index],
      status: newStatus,
      timeline: updatedTimeline,
    };

    complaints[index] = updatedComplaint;
    setStored(COMPLAINTS_KEY, complaints);

    // Record in audit log
    const auditLogs = getStored(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
    const newAuditEntry = {
      id: `LOG-${Date.now()}`,
      action: 'STATUS_UPDATE',
      complaintId: complaintId,
      previousStatus,
      newStatus,
      timestamp: `${formattedDate} ${formattedTime}`,
      adminUser: 'Admin Demo (Officer in Charge)',
      note: adminNote.trim() || `Status updated from ${previousStatus} to ${newStatus}.`,
    };
    setStored(AUDIT_LOGS_KEY, [newAuditEntry, ...auditLogs]);

    return {
      success: true,
      complaint: updatedComplaint,
      auditLog: newAuditEntry,
    };
  },

  resetDemoData: () => {
    setStored(COMPLAINTS_KEY, INITIAL_COMPLAINTS);
    setStored(ISSUES_KEY, INITIAL_COMMUNITY_ISSUES);
    setStored(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
    setStored(AUTHORITIES_KEY, INITIAL_AUTHORITIES);
    return true;
  },
};
