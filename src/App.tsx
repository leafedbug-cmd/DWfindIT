// src/App.tsx
import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { StoreProvider } from './contexts/StoreContext'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { ListsPage } from './pages/ListsPage'
import { ListDetailPage } from './pages/ListDetailPage'
import { ScanPage } from './pages/ScanPage'
import { ProfilePage } from './pages/ProfilePage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore()

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { refreshSession } = useAuthStore()

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lists"
            element={
              <ProtectedRoute>
                <ListsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/list/:id"
            element={
              <ProtectedRoute>
                <ListDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  )
}

export default App