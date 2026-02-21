import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PipelineProvider } from './context/PipelineContext';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import KPIPage from './pages/KPIPage';
import TimeSeriesPage from './pages/TimeSeriesPage';
import ForecastPage from './pages/ForecastPage';
import DistributionPage from './pages/DistributionPage';
import ReviewPage from './pages/ReviewPage';
import ChatbotPage from './pages/ChatbotPage';

export default function App() {
  return (
    <BrowserRouter>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PipelineProvider>
    </BrowserRouter>
  );
}
