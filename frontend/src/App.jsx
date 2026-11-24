import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { CitizenLayout } from './layouts/CitizenLayout';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Citizen Public Portal */}
            <Route path="/" element={<CitizenLayout />}>
              <Route index element={<CitizenDashboard />} />
            </Route>

            {/* Admin Authentication (Demo) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Management Dashboard */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
