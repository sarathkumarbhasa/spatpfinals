import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

const safeReq = async (req) => {
  try { return (await req).data; }
  catch (e) { return { success: false, data: {}, error: e.message }; }
};

export const getTransactions = () => safeReq(api.get('/transactions/'));
export const getGraph = (accountId) => safeReq(api.get(`/graph/?account_id=${accountId}`));
export const loadRealCase = () => safeReq(api.post('/transactions/load-real-case'));
export const propagateHold = (accountId) => safeReq(api.post('/hold/propagate', { account_id: accountId }));
export const confirmFraud = (accountId) => safeReq(api.post('/hold/confirm-fraud', { account_id: accountId }));
