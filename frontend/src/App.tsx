import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Beds } from './pages/Beds';
import { EquipmentPage } from './pages/Equipment';
import { Patients } from './pages/Patients';
import { Reservations } from './pages/Reservations';
import { Transfers } from './pages/Transfers';
import { MaintenancePage } from './pages/Maintenance';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Appointments } from './pages/Appointments';

// Protected Route Wrapper Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-[#333] border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If user's role is not authorized, redirect to dashboard root
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Application Layout Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Root */}
            <Route index element={<Dashboard />} />
            
            {/* Core Modules */}
            <Route path="beds" element={<Beds />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="patients" element={<Patients />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="appointments" element={<Appointments />} />
            
            {/* Security Audit Trail (Admins only) */}
            <Route 
              path="audit-logs" 
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Hospital Admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
