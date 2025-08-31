

import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// If you want to set axios defaults globally, uncomment and edit below:
// import axios from "axios";
// axios.defaults.baseURL = "http://localhost:5000";
// axios.defaults.withCredentials = false;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
