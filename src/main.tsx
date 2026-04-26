import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
// main.jsx
import { clarity } from 'clarity-js';
import { StrictMode } from 'react';


if (
  import.meta.env.VITE_ENV === 'production' &&
  localStorage.getItem('disable_clarity') !== 'true'
) {
  clarity.start({
    projectId: import.meta.env.VITE_CLARITY_PROJECT_ID,
    upload: 'https://m.clarity.ms/collect',
    track: true,
    content: true,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(<App />);
