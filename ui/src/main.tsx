import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Baseline from './responses/baselineA.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <Baseline /> { /* Just testing dev env right now using the baseline script */}
  </StrictMode>,
)
