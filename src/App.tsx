import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from './components/AuthGuard';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { OrderDashboard } from './components/OrderDashboard';
import { useAuthStore } from './stores/authStore';

function App() {
  const { loadUser } = useAuthStore();

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <OrderDashboard />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;