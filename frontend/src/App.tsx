import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ResidentsPage from './pages/ResidentsPage'
import ResidentDetailPage from './pages/ResidentDetailPage'
import NewResidentPage from './pages/NewResidentPage'
import RoomsPage from './pages/RoomsPage'
import ContractsPage from './pages/ContractsPage'
import FinancePage from './pages/FinancePage'
import NewPaymentPage from './pages/NewPaymentPage'
import ReportsPage from './pages/ReportsPage'
import AuditPage from './pages/AuditPage'
import AccessPage from './pages/AccessPage'
import UsersPage from './pages/UsersPage'
import BuildingsPage from './pages/BuildingsPage'
import FloorsPage from './pages/FloorsPage'

export default function App() {
  const { user, loading, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-accent text-lg">Загрузка...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage onLogin={login} />}
        />
        {user ? (
          <Route element={<Layout user={user} onLogout={logout} />}>
            <Route index element={<DashboardPage />} />
            <Route path="residents" element={<ResidentsPage />} />
            <Route path="residents/new" element={<NewResidentPage />} />
            <Route path="residents/:id" element={<ResidentDetailPage />} />
            <Route path="buildings" element={<BuildingsPage />} />
            <Route path="buildings/:buildingId/floors" element={<FloorsPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/payment/new" element={<NewPaymentPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="access" element={<AccessPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}
