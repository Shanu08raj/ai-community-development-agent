const MY_REPORTS_STORAGE_KEY = 'jansetu_my_reports_v1';

function readRawList() {
  try {
    const raw = localStorage.getItem(MY_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRawList(items) {
  try {
    localStorage.setItem(MY_REPORTS_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function normalizeEntry(entry) {
  const referenceId = String(entry?.referenceId || entry?.id || '')
    .trim()
    .toUpperCase();
  const trackingCode = String(entry?.trackingCode || '')
    .trim()
    .toUpperCase();

  return {
    id: referenceId,
    referenceId,
    trackingCode,
    title: entry?.title || 'Community Issue Report',
    category: entry?.category || 'Other',
    area: entry?.area || 'Municipal Ward',
    state: entry?.state || 'Maharashtra',
    district: entry?.district || 'Pune',
    submittedDate: entry?.submittedDate || new Date().toISOString().split('T')[0],
    status: entry?.status || 'Submitted',
    priority: entry?.priority || 'Medium',
    savedAt: entry?.savedAt || new Date().toISOString(),
  };
}

export const myReportsService = {
  getSavedReports() {
    const list = readRawList();
    const seen = new Set();
    const deduped = [];

    for (const item of list) {
      const normalized = normalizeEntry(item);
      if (!normalized.referenceId || seen.has(normalized.referenceId)) continue;
      seen.add(normalized.referenceId);
      deduped.push(normalized);
    }

    return deduped;
  },

  /**
   * Saves a report ONLY after explicit citizen opt-in and confirmed backend creation.
   * Deduplicates by referenceId to prevent duplicate cards.
   */
  saveReport(report) {
    const normalized = normalizeEntry(report);
    if (!normalized.referenceId || !normalized.trackingCode) {
      return this.getSavedReports();
    }

    const current = this.getSavedReports().filter(
      (item) => item.referenceId !== normalized.referenceId
    );
    const updated = [normalized, ...current];
    writeRawList(updated);
    return updated;
  },

  /**
   * Refreshes local cached metadata from a verified backend tracking response
   * while keeping the stored tracking credential intact.
   */
  syncReportFromBackend(referenceId, backendComplaint) {
    const refUpper = String(referenceId || '').trim().toUpperCase();
    const current = this.getSavedReports();
    const next = current.map((item) => {
      if (item.referenceId !== refUpper) return item;
      return {
        ...item,
        title: backendComplaint.title || item.title,
        category: backendComplaint.category || item.category,
        area: backendComplaint.area || item.area,
        state: backendComplaint.state || item.state,
        district: backendComplaint.district || item.district,
        submittedDate: backendComplaint.submittedDate || item.submittedDate,
        status: backendComplaint.status || item.status,
        priority: backendComplaint.priority || item.priority,
      };
    });
    writeRawList(next);
    return next;
  },

  /**
   * Updates only the locally stored trackingCode when re-entered by the citizen.
   */
  updateTrackingCode(referenceId, newTrackingCode) {
    const refUpper = String(referenceId || '').trim().toUpperCase();
    const codeUpper = String(newTrackingCode || '').trim().toUpperCase();
    const current = this.getSavedReports();
    const next = current.map((item) =>
      item.referenceId === refUpper ? { ...item, trackingCode: codeUpper } : item
    );
    writeRawList(next);
    return next;
  },

  /**
   * Deletes a report and its locally stored credentials permanently from this device.
   */
  removeReport(referenceId) {
    const refUpper = String(referenceId || '').trim().toUpperCase();
    const updated = this.getSavedReports().filter(
      (item) => item.referenceId !== refUpper
    );
    writeRawList(updated);
    return updated;
  },
};
