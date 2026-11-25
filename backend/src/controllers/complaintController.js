import { createComplaint, trackComplaint } from '../services/complaintService.js';
import { sendSuccess } from '../utils/response.js';

export async function submitComplaint(req, res) {
  const result = await createComplaint(req.body, req.ip || '127.0.0.1');
  return sendSuccess(res, 201, result);
}

export async function trackComplaintStatus(req, res) {
  const { referenceId, trackingCode } = req.body;
  const result = await trackComplaint(referenceId, trackingCode);
  return sendSuccess(res, 200, result);
}
