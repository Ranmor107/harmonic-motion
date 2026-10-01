import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './ui/styles.css'
import './ui/ink.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
