import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PipelineProvider } from './context/PipelineContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import KPIPage from './pages/KPIPage';
import TimeSeriesPage from './pages/TimeSeriesPage';
import ForecastPage from './pages/ForecastPage';
import DistributionPage from './pages/DistributionPage';
import ReviewPage from './pages/ReviewPage';
import ChatbotPage from './pages/ChatbotPage';
import NewsPage from './pages/NewsPage';
import RetrainingPage from './pages/RetrainingPage';

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner spinner-lg" />
      <p>Authenticating…</p>
    </div>
  );

  if (!isAuthenticated) return <LoginPage />;

  return (
    <PipelineProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/kpi" element={<KPIPage />} />
          <Route path="/time-series" element={<TimeSeriesPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/distribution" element={<DistributionPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/retraining" element={<RetrainingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PipelineProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
