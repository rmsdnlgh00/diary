import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { initGameSounds } from '@/systems/gameSounds'
import '@/styles/global.css'
import '@/styles/game.css'
import '@/styles/ui.css'

initGameSounds()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
