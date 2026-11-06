import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase';
supabase.auth.getSession().then(({ error }) =>
  console.log(error ? 'GAGAL: ' + error.message : 'Terhubung ke Supabase')
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
