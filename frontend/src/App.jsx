import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage    from './pages/LandingPage'
import UploadPage     from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import ResultPage     from './pages/ResultPage'
import HistoryPage    from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/upload"     element={<UploadPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/result"     element={<ResultPage />} />
        <Route path="/history"    element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
