import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5051';

// Generous by default: the API may be on a host that spins down when idle,
// so a cold start can take tens of seconds before any response arrives.
// Template uploads pass their own longer timeout on top of this, since they
// also parse the document and classify every detected field server-side.
const instance = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export const UPLOAD_TIMEOUT_MS = 180000;

export default instance;
