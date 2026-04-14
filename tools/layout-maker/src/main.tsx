import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/maker.css'
// Portal design tokens — needed for block CSS variables (--bg-surface, --spacing-xl, etc.)
import '../../../packages/ui/src/theme/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
