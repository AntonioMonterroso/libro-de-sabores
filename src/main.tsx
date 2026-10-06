import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { MusicProvider } from './features/music/MusicProvider.tsx'
import { handleCallback } from './features/music/spotifyAuth.ts'
import { TimerProvider } from './features/timers/TimerProvider.tsx'
import { AuthProvider } from './features/auth/AuthProvider.tsx'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })

await handleCallback().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <TimerProvider>
            <MusicProvider>
              <App />
            </MusicProvider>
          </TimerProvider>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
