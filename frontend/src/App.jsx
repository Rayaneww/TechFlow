import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import CardStack from './components/CardStack.jsx'
import SavedList from './components/SavedList.jsx'
import TopicSelector from './components/TopicSelector.jsx'

export default function App() {
  const [topic, setTopic] = useState('all')
  const [savedOpen, setSavedOpen] = useState(false)
  const [savedRefreshKey, setSavedRefreshKey] = useState(0)

  const handleSaveSuccess = useCallback(() => {
    setSavedRefreshKey((k) => k + 1)
  }, [])

  const handleTopicChange = (newTopic) => {
    setTopic(newTopic)
    setSavedOpen(false)
  }

  return (
    <div
      className="relative h-full flex flex-col overflow-hidden"
      style={{ background: '#08090c' }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60vw',
          height: '60vh',
          background: 'radial-gradient(ellipse, rgba(194,245,66,0.04) 0%, transparent 70%)',
        }}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <header
        className="relative z-10 flex-shrink-0 px-5 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(194,245,66,0.1)', border: '1px solid rgba(194,245,66,0.2)' }}
            >
              <span style={{ color: '#c2f542', fontSize: '1rem' }}>⬡</span>
            </div>
            <div>
              <h1
                className="font-display font-800 leading-none tracking-tight"
                style={{ fontSize: '1.1rem', color: '#f0f2f8' }}
              >
                TechFlow
              </h1>
              <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3d4050' }}>
                Swipe to Learn
              </p>
            </div>
          </div>

          {/* Saved button */}
          <motion.button
            onClick={() => setSavedOpen(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-3 py-2 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#636878',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>◈</span>
            Reading List
          </motion.button>
        </div>

        {/* Topic selector */}
        <TopicSelector current={topic} onChange={handleTopicChange} />
      </header>

      {/* ── Card area ────────────────────────────────────────── */}
      <main className="relative flex-1 overflow-hidden px-5 py-4">
        <motion.div
          key={topic}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <CardStack topic={topic} onSaveSuccess={handleSaveSuccess} />
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer
        className="flex-shrink-0 px-5 py-3 flex items-center justify-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#2e3140' }}>
          AI-curated · Updated from RSS · TechFlow 2026
        </p>
      </footer>

      {/* ── Saved drawer ─────────────────────────────────────── */}
      <SavedList
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        refreshKey={savedRefreshKey}
      />
    </div>
  )
}
