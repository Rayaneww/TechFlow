import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client.js'

const DIFFICULTY_LABEL = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
const DIFFICULTY_COLOR = { 1: '#c2f542', 2: '#f59e0b', 3: '#ff453a' }

function SavedCardRow({ card, onUnsave }) {
  const diffColor = DIFFICULTY_COLOR[card.difficulty] || '#636878'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, height: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: '#10131a',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-display font-600 leading-snug flex-1"
          style={{ fontSize: '0.9rem', color: '#e8eaf0' }}
        >
          {card.title}
        </h3>
        <button
          onClick={() => onUnsave(card.id)}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          style={{ color: '#636878' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff453a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#636878')}
          title="Remove from saved"
        >
          ✕
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3d4050' }}>
          {card.source}
        </span>
        <span style={{ color: '#2e3140' }}>·</span>
        <span className="font-mono text-[9px] tracking-wider" style={{ color: diffColor }}>
          {DIFFICULTY_LABEL[card.difficulty]}
        </span>
      </div>

      {/* Summary */}
      {card.summary && (
        <p className="text-xs leading-relaxed" style={{ color: '#636878' }}>
          {card.summary}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1.5 flex-wrap">
          {card.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#3d4050',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] tracking-widest uppercase transition-colors"
          style={{ color: '#636878' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c2f542')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#636878')}
        >
          Read ↗
        </a>
      </div>
    </motion.div>
  )
}

export default function SavedList({ open, onClose, refreshKey }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSaved = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSaved()
      setCards(data)
    } catch (e) {
      console.error('[SavedList] fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchSaved()
  }, [open, fetchSaved, refreshKey])

  const handleUnsave = async (id) => {
    try {
      await api.unsaveCard(id)
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error('[SavedList] unsave failed:', e)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
            style={{
              width: 'min(400px, 100vw)',
              background: '#0d0f15',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div>
                <h2 className="font-display font-700 text-lg" style={{ color: '#f0f2f8' }}>
                  Reading List
                </h2>
                <p className="font-mono text-[10px] tracking-widest uppercase mt-0.5" style={{ color: '#636878' }}>
                  {cards.length} article{cards.length !== 1 ? 's' : ''} saved
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: '#636878',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e8eaf0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#636878')}
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {loading && (
                <div className="flex justify-center pt-8">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#c2f542' }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!loading && cards.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                  <span className="text-4xl opacity-20">◈</span>
                  <div>
                    <p className="font-display font-600" style={{ color: '#636878' }}>Empty for now</p>
                    <p className="text-sm mt-1" style={{ color: '#3d4050' }}>
                      Swipe right on cards to save them
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {cards.map((card) => (
                  <SavedCardRow key={card.id} card={card} onUnsave={handleUnsave} />
                ))}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
