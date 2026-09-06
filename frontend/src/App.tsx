import type React from 'react'
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
import IncomePage from './pages/IncomePage'
import ReportsPage from './pages/ReportsPage'
import AuditPage from './pages/AuditPage'
import AccessPage from './pages/AccessPage'
import UsersPage from './pages/UsersPage'
import BuildingsPage from './pages/BuildingsPage'
import FloorsPage from './pages/FloorsPage'
import UniversitiesPage from './pages/UniversitiesPage'
import AdmissionPage from './pages/AdmissionPage'
import { CurrentUserProvider } from './hooks/useCurrentUser'
import UniversityGate from './components/UniversityGate'
import { useTranslation } from './i18n'

export default function App() {
  const { user, loading, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-accent text-lg">Загрузка...</div>
      </div>
    )
  }

  const isMinistry = user?.role?.name === 'ministry'
  const { t } = useTranslation()
  // Pages that belong to one university: global roles pick the university first.
  const gate = (key: Parameters<typeof t>[0], el: React.ReactNode) => <UniversityGate title={t(key)}>{el}</UniversityGate>

  return (
    <CurrentUserProvider user={user}>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage onLogin={login} />}
        />
        {user ? (
          <Route element={<Layout user={user} onLogout={logout} />}>
            <Route index element={isMinistry ? <UniversitiesPage /> : <DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="universities" element={<UniversitiesPage />} />
            <Route path="residents" element={<ResidentsPage />} />
            <Route path="residents/new" element={<NewResidentPage />} />
            <Route path="residents/:id" element={<ResidentDetailPage />} />
            <Route path="buildings" element={gate('navBuildings', <BuildingsPage />)} />
            <Route path="buildings/:buildingId/floors" element={gate('navBuildings', <FloorsPage />)} />
            <Route path="rooms" element={gate('navRooms', <RoomsPage />)} />
            <Route path="contracts" element={gate('navContracts', <ContractsPage />)} />
            <Route path="admission" element={gate('navAdmission', <AdmissionPage />)} />
            <Route path="finance" element={gate('navFinance', <FinancePage />)} />
            <Route path="finance/payment/new" element={gate('navFinance', <NewPaymentPage />)} />
            <Route path="finance/income" element={gate('navFinance', <IncomePage />)} />
            <Route path="reports" element={gate('navReports', <ReportsPage />)} />
            <Route path="access" element={gate('navAccess', <AccessPage />)} />
            <Route path="audit" element={gate('navAudit', <AuditPage />)} />
            <Route path="users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
    </CurrentUserProvider>
  )
}
