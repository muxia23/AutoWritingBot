import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { PromptProvider } from './context/PromptContext.jsx';
import { ImageProvider } from './context/ImageContext.jsx';
import ChatGeneratePage from './pages/ChatGeneratePage.jsx';
import PromptPage from './pages/PromptPage.jsx';
import ImageLibraryPage from './pages/ImageLibraryPage.jsx';
import Header from './components/layout/Header.jsx';
import TabNav from './components/layout/TabNav.jsx';
import Toast from './components/common/Toast.jsx';

function AppLayout() {
  const { toast, clearToast } = useApp();
  return (
    <div className="app-container">
      <Header />
      <TabNav />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatGeneratePage />} />
          <Route path="/prompt" element={<PromptPage />} />
          <Route path="/images" element={<ImageLibraryPage />} />
        </Routes>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <PromptProvider>
        <ImageProvider>
          <Router>
            <AppLayout />
          </Router>
        </ImageProvider>
      </PromptProvider>
    </AppProvider>
  );
}

export default App;
