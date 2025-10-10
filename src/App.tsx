// src/App.tsx
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { StoreProvider } from './contexts/StoreContext';
import { ThemeProvider } from './contexts/ThemeContext';

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage }))
);
const ListsPage = lazy(() =>
  import('./pages/ListsPage').then((module) => ({ default: module.ListsPage }))
);
const ListDetailPage = lazy(() =>
  import('./pages/ListDetailPage').then((module) => ({ default: module.ListDetailPage }))
);
const ScanPage = lazy(() =>
  import('./pages/ScanPage').then((module) => ({ default: module.ScanPage }))
);
const WorkOrdersPage = lazy(() =>
  import('./pages/WorkOrdersPage').then((module) => ({ default: module.WorkOrdersPage }))
);
const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((module) => ({ default: module.InventoryPage }))
); // ADDED

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { refreshSession } = useAuthStore();

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <StoreProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
              </div>
            }
          >
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
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
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
                path="/work-orders"
                element={
                  <ProtectedRoute>
                    <WorkOrdersPage />
                  </ProtectedRoute>
                }
              />

              {/* ADDED: Route for the Inventory page */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </StoreProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
