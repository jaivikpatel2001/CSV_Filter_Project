/**
 * Main App Component
 * Routing and layout
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import PreviewPage from './pages/PreviewPage';
import TransformPage from './pages/TransformPage';
import DepositMapPage from './pages/DepositMapPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/preview/:uploadId" element={<PreviewPage />} />
            <Route path="/transform/:transformId" element={<TransformPage />} />
            <Route path="/deposit-map" element={<DepositMapPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>

        <footer style={{
          background: 'var(--color-bg-secondary)',
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-xl) 0',
          marginTop: 'var(--space-3xl)'
        }}>
          <div className="container text-center">
            <p className="text-secondary" style={{ margin: 0 }}>
              CSV/Excel Transformation Webapp • Built with MERN Stack
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
