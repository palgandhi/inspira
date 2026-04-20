import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage    from './pages/LandingPage'
import UploadPage     from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import ResultPage     from './pages/ResultPage'

function CustomCursor() {
  const [pos, setPos] = useState({ x: -20, y: -20 })

  useEffect(() => {
    const move = e => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div
      className="cursor"
      style={{ left: pos.x - 4, top: pos.y - 4 }}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/upload"     element={<UploadPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/result"     element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  )
}
