import { HashRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import { LoginScreen } from './features/auth/LoginScreen'
import { OnboardingScreen } from './features/auth/OnboardingScreen'
import { lazy, Suspense } from 'react'
import { Home } from './pages/Home'
import { RecipeWizard } from './features/recipes/RecipeWizard'
import { RecipePage } from './pages/RecipePage'
import { EditRecipe } from './pages/EditRecipe'
import { CookingPage } from './pages/CookingPage'
import { Explore } from './pages/Explore'
import { Cooks, CookProfilePage } from './pages/Cooks'
import { Favorites } from './pages/Favorites'
import { Settings } from './pages/Settings'
import { Notifications } from './pages/Notifications'
import { TabBar } from './components/TabBar'
import { TimerDock } from './features/timers/TimerDock'

const Demo = import.meta.env.DEV ? lazy(() => import('./dev/DemoRecipe')) : null
const DemoExplore = import.meta.env.DEV ? lazy(() => import('./dev/DemoExplore')) : null
const DemoInstall = import.meta.env.DEV ? lazy(() => import('./dev/DemoInstall')) : null
const DemoCook = import.meta.env.DEV ? lazy(() => import('./dev/DemoCooking')) : null

function Gate() {
  const { session, profile, loading } = useAuth()
  if (Demo && location.hash === '#/demo') return <Suspense fallback={null}><Demo /></Suspense>
  if (DemoExplore && location.hash === '#/demo-explorar') return <Suspense fallback={null}><DemoExplore /></Suspense>
  if (DemoInstall && location.hash === '#/demo-instalar') return <Suspense fallback={null}><DemoInstall /></Suspense>
  if (DemoCook && location.hash === '#/demo-cocina') return <Suspense fallback={null}><DemoCook /><TimerDock /></Suspense>
  if (loading) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  if (!session) return <LoginScreen />
  if (!profile) return <OnboardingScreen />
  return (
    <>
    <TimerDock />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/nueva" element={<RecipeWizard />} />
      <Route path="/receta/:id" element={<RecipePage />} />
      <Route path="/editar/:id" element={<EditRecipe />} />
      <Route path="/cocinar/:id" element={<CookingPage />} />
      <Route path="/explorar" element={<Explore />} />
      <Route path="/cocineros" element={<Cooks />} />
      <Route path="/cocinero/:id" element={<CookProfilePage />} />
      <Route path="/favoritas" element={<Favorites />} />
      <Route path="/ajustes" element={<Settings />} />
      <Route path="/avisos" element={<Notifications />} />
      <Route path="*" element={<Home />} />
    </Routes>
    <TabBar />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Gate />
    </HashRouter>
  )
}
