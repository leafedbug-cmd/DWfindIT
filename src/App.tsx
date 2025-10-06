// src/App.tsx
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { StoreProvider } from './contexts/StoreContext';
const LoginPage = lazy(() => import('./pages/LoginPage').then(mod => ({ default: mod.LoginPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(mod => ({ default: mod.HomePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(mod => ({ default: mod.ProfilePage })));
const ListsPage = lazy(() => import('./pages/ListsPage').then(mod => ({ default: mod.ListsPage })));
const ListDetailPage = lazy(() => import('./pages/ListDetailPage').then(mod => ({ default: mod.ListDetailPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then(mod => ({ default: mod.ScanPage })));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrdersPage').then(mod => ({ default: mod.WorkOrdersPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(mod => ({ default: mod.InventoryPage })));

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
      <StoreProvider>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoginLoader />}>
                  <LoginPage />
                </Suspense>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<HomeLoader />}>
                    <HomePage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ProfileLoader />}>
                    <ProfilePage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/lists"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ListsLoader />}>
                    <ListsPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/list/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ListDetailLoader />}>
                    <ListDetailPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ScanLoader />}>
                    <ScanPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/work-orders"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<WorkOrdersLoader />}>
                    <WorkOrdersPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<InventoryLoader />}>
                    <InventoryPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </StoreProvider>
    </BrowserRouter>
  );
}

const RouteLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  </div>
);

const LoginLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-orange-200 mx-auto" />
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
      <div className="space-y-3 pt-4">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-12 bg-orange-200/70 rounded" />
      </div>
    </div>
  </div>
);

const HomeLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="h-40 m-4 rounded-2xl bg-gradient-to-br from-orange-200 to-orange-300 animate-pulse" />
    <div className="m-4 space-y-3">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="h-24 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center animate-pulse">
          <div className="h-12 w-12 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  </div>
);

const ProfileLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="m-4 space-y-4">
      <div className="h-24 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
      <div className="space-y-3">
        {[...Array(2)].map((_, idx) => (
          <div key={idx} className="h-20 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

const ListsLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="m-4 space-y-3">
      <div className="h-16 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse" />
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="h-20 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse" />
      ))}
    </div>
  </div>
);

const ListDetailLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
    <div className="m-4 space-y-4">
      <div className="h-14 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse" />
      <div className="space-y-3">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="h-24 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

const ScanLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="m-4 rounded-xl bg-white border border-gray-200 shadow-sm h-72 animate-pulse" />
    <div className="mx-4 h-16 rounded-xl bg-black/10 animate-pulse" />
  </div>
);

const WorkOrdersLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="m-4 space-y-4">
      <div className="h-40 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
      <div className="space-y-3">
        {[...Array(2)].map((_, idx) => (
          <div key={idx} className="h-24 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

const InventoryLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
    <div className="m-4 h-12 rounded-full bg-white border border-gray-200 shadow-sm animate-pulse" />
    <div className="mx-4 space-y-3">
      {[...Array(5)].map((_, idx) => (
        <div key={idx} className="h-20 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
      ))}
    </div>
  </div>
);

export default App;
