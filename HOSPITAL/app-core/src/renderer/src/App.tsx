import { Loader2 } from 'lucide-react'
import { useAuth } from './features/auth/useAuth'
import { LoginScreen } from './features/auth/LoginScreen'
import { AppShell } from './features/shell/AppShell'

function App(): JSX.Element {
  const { session, loading, error, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!session) {
    return <LoginScreen onLogin={login} error={error} />
  }

  return <AppShell session={session} onLogout={logout} />
}

export default App
