import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

const safeReq = async (req) => {
  try { return (await req).data; }
  catch (e) { return { success: false, data: {}, error: e.message }; }
};

export const getTransactions = () => safeReq(api.get('/transactions/'));
export const getAlerts = () => safeReq(api.get('/alerts/'));
export const getGraph = (accountId) => safeReq(api.get(`/graph/?account_id=${accountId}`));
export const simulateData = () => safeReq(api.post('/simulate/'));
export const clearHolds = () => safeReq(api.post('/simulate/clear'));
export const propagateHold = (accountId) => safeReq(api.post('/hold/propagate', { account_id: accountId }));
export const confirmFraud = (accountId) => safeReq(api.post('/hold/confirm-fraud', { account_id: accountId }));
