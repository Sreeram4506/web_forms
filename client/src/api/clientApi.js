import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5051';

// Separate axios instance for the client portal so its auth header/token
// never collides with the admin app's global axios defaults (an admin
// testing a client link in another tab must not get logged out).
const clientApi = axios.create({ baseURL: API_URL });

clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('clientToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default clientApi;
