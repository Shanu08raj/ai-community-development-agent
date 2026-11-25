import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { myReportsService } from '../services/myReportsService';
import { buildReceiptContent, downloadComplaintReceipt } from '../utils/receiptGenerator';

describe('myReportsService unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty or corrupted localStorage gracefully', () => {
    expect(myReportsService.getSavedReports()).toEqual([]);
    localStorage.setItem('jansetu_my_reports_v1', '{not valid json');
    expect(myReportsService.getSavedReports()).toEqual([]);
    localStorage.setItem('jansetu_my_reports_v1', JSON.stringify({ not: 'an array' }));
    expect(myReportsService.getSavedReports()).toEqual([]);
  });

  it('saves normalized report metadata and deduplicates by case-insensitive referenceId', () => {
    myReportsService.saveReport({
      referenceId: 'js-2026-1001',
      trackingCode: 'TRACK-AAA1',
      title: 'First title',
      category: 'Road & Infrastructure',
      area: 'Ward 3',
      status: 'Submitted',
      priority: 'Medium',
      submittedDate: '2026-11-25',
    });

    const afterSecondSave = myReportsService.saveReport({
      referenceId: 'JS-2026-1001',
      trackingCode: 'TRACK-BBB2',
      title: 'Updated title',
      category: 'Water Supply',
      area: 'Ward 4',
      status: 'Verified',
      priority: 'High',
      submittedDate: '2026-11-25',
    });

    expect(afterSecondSave).toHaveLength(1);
    expect(afterSecondSave[0].referenceId).toBe('JS-2026-1001');
    expect(afterSecondSave[0].trackingCode).toBe('TRACK-BBB2');
    expect(afterSecondSave[0].status).toBe('Verified');
  });

  it('syncs latest backend fields without discarding saved trackingCode', () => {
    myReportsService.saveReport({
      referenceId: 'JS-2026-2002',
      trackingCode: 'TRACK-KEEP9',
      title: 'Original title',
      category: 'Electricity & Streetlights',
      area: 'Ward 8',
      status: 'Submitted',
      priority: 'Low',
      submittedDate: '2026-11-24',
    });

    const synced = myReportsService.syncReportFromBackend('JS-2026-2002', {
      title: 'Original title',
      category: 'Electricity & Streetlights',
      area: 'Ward 8',
      state: 'Maharashtra',
      district: 'Pune',
      status: 'In Progress',
      priority: 'High',
      submittedDate: '2026-11-24',
    });

    expect(synced[0].status).toBe('In Progress');
    expect(synced[0].priority).toBe('High');
    expect(synced[0].trackingCode).toBe('TRACK-KEEP9');
  });

  it('updates tracking code and removes report completely', () => {
    myReportsService.saveReport({
      referenceId: 'JS-2026-3003',
      trackingCode: 'TRACK-OLD',
      title: 'Streetlight dark corner',
      category: 'Electricity & Streetlights',
      area: 'Ward 10',
      status: 'Submitted',
      priority: 'Medium',
    });

    const updated = myReportsService.updateTrackingCode('JS-2026-3003', 'track-new1');
    expect(updated[0].trackingCode).toBe('TRACK-NEW1');

    const remaining = myReportsService.removeReport('JS-2026-3003');
    expect(remaining).toEqual([]);
    expect(myReportsService.getSavedReports()).toEqual([]);
  });
});

describe('receiptGenerator unit tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats a complete offline receipt containing credentials and confidentiality warning', () => {
    const content = buildReceiptContent({
      referenceId: 'JS-2026-7777',
      trackingCode: 'TRACK-XYZ9',
      title: 'Broken footpath near school gate',
      category: 'Road & Infrastructure',
      area: 'Ward 7',
      district: 'Pune',
      state: 'Maharashtra',
      submittedDate: '2026-11-25',
    });

    expect(content).toContain('JANSETU AI - CITIZEN COMPLAINT RECEIPT');
    expect(content).toContain('Complaint Reference ID : JS-2026-7777');
    expect(content).toContain('Private Tracking Code  : TRACK-XYZ9');
    expect(content).toContain('Broken footpath near school gate');
    expect(content).toContain('Area / Ward            : Ward 7');
    expect(content).toContain('Location               : Pune, Maharashtra');
    expect(content).toContain('CONFIDENTIALITY WARNING:');
    expect(content).toContain('independent civic-tech intelligence');
  });

  it('downloads receipt via Blob URL and revokes object URL cleanly', () => {
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    const createObjectUrlSpy = vi.fn(() => 'blob:mock-receipt-url');
    const revokeObjectUrlSpy = vi.fn();
    URL.createObjectURL = createObjectUrlSpy;
    URL.revokeObjectURL = revokeObjectUrlSpy;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      const result = downloadComplaintReceipt({
        referenceId: 'JS-2026-7777',
        trackingCode: 'TRACK-XYZ9',
        title: 'Broken footpath near school gate',
        category: 'Road & Infrastructure',
        area: 'Ward 7',
        district: 'Pune',
        state: 'Maharashtra',
        submittedDate: '2026-11-25',
      });

      expect(result.filename).toBe('JanSetu-Receipt-JS-2026-7777.txt');
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-receipt-url');
    } finally {
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    }
  });
});
