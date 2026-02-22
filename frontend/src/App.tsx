import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ImportStep } from './pages/ImportStep';
import { ConfigStep } from './pages/ConfigStep';
import { ReviewStep } from './pages/ReviewStep';
import { ResultsStep } from './pages/ResultsStep';
import { AuthCallback } from './pages/AuthCallback';
import { useAppStore } from './stores/app.store';

function AppContent() {
  const step = useAppStore(s => s.step);

  return (
    <Layout>
      {step === 'import'  && <ImportStep />}
      {step === 'config'  && <ConfigStep />}
      {step === 'review'  && <ReviewStep />}
      {step === 'results' && <ResultsStep />}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}
