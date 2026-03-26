import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SwipeCard from './SwipeCard.jsx'
import { api } from '../api/client.js'

const REFETCH_THRESHOLD = 3
const VISIBLE_CARDS = 3

function EmptyState({ topic, onRefresh, loading }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-3xl">✦</span>
      </div>
      <div>
        <p className="font-display font-600 text-lg" style={{ color: '#f0f2f8' }}>
          {loading ? 'Curating your feed…' : 'All caught up'}
        </p>
        <p className="text-sm mt-1" style={{ color: '#636878' }}>
          {loading
            ? 'Fetching and summarizing articles'
            : `No more ${topic} cards right now`}
        </p>
      </div>
      {!loading && (
        <button
          onClick={onRefresh}
          className="font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'rgba(194,245,66,0.08)',
            color: '#c2f542',
            border: '1px solid rgba(194,245,66,0.2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(194,245,66,0.14)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(194,245,66,0.08)')}
        >
          Refresh feed
        </button>
      )}
      {loading && (
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
      )}
    </div>
  )
}

export default function CardStack({ topic, onSaveSuccess }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSwiped, setLastSwiped] = useState(null)
  const fetching = useRef(false)

  const fetchCards = useCallback(async (currentCards = []) => {
    if (fetching.current) return
    fetching.current = true
    try {
      const fresh = await api.getCards(topic, 10)
      // Merge new cards without duplicates
      const existingIds = new Set(currentCards.map((c) => c.id))
      const merged = [...currentCards, ...fresh.filter((c) => !existingIds.has(c.id))]
      setCards(merged)
    } catch (err) {
      console.error('[CardStack] fetch failed:', err)
    } finally {
      setLoading(false)
      fetching.current = false
    }
  }, [topic])

  const triggerIngest = useCallback(async () => {
    try {
      await api.ingest(topic)
    } catch (e) {
      // non-critical
    }
  }, [topic])

  // Initial load
  useEffect(() => {
    setCards([])
    setLoading(true)
    setLastSwiped(null)
    triggerIngest().then(() => fetchCards([]))
  }, [topic, fetchCards, triggerIngest])

  // Refetch when queue drops low
  useEffect(() => {
    if (!loading && cards.length < REFETCH_THRESHOLD) {
      fetchCards(cards)
    }
  }, [cards.length, loading])

  const handleSave = useCallback(async (id) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    setLastSwiped({ card, action: 'save' })
    setCards((prev) => prev.filter((c) => c.id !== id))
    try {
      await api.saveCard(id)
      onSaveSuccess?.()
    } catch (e) {
      console.error('[CardStack] save failed:', e)
    }
  }, [cards, onSaveSuccess])

  const handleIgnore = useCallback(async (id) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    setLastSwiped({ card, action: 'ignore' })
    setCards((prev) => prev.filter((c) => c.id !== id))
    try {
      await api.ignoreCard(id)
    } catch (e) {
      console.error('[CardStack] ignore failed:', e)
    }
  }, [cards])

  const handleUndo = useCallback(() => {
    if (!lastSwiped) return
    setCards((prev) => [lastSwiped.card, ...prev])
    setLastSwiped(null)
  }, [lastSwiped])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await triggerIngest()
    await fetchCards([])
  }, [triggerIngest, fetchCards])

  const visibleCards = cards.slice(0, VISIBLE_CARDS)
  const isEmpty = !loading && cards.length === 0

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Card area */}
      <div className="relative flex-1 card-stack">
        <AnimatePresence>
          {isEmpty ? (
            <EmptyState topic={topic} onRefresh={handleRefresh} loading={loading} />
          ) : (
            [...visibleCards].reverse().map((card, reverseIdx) => {
              const stackIndex = visibleCards.length - 1 - reverseIdx
              const isTop = stackIndex === 0
              return (
                <SwipeCard
                  key={card.id}
                  card={card}
                  isTop={isTop}
                  stackIndex={stackIndex}
                  onSave={handleSave}
                  onIgnore={handleIgnore}
                />
              )
            })
          )}
        </AnimatePresence>

        {/* Loading skeleton cards when fetching and no cards yet */}
        {loading && cards.length === 0 && (
          <div
            className="absolute inset-0 rounded-2xl skeleton"
            style={{ boxShadow: '0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)' }}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-2 pt-4 pb-2 flex-shrink-0">
        {/* Undo */}
        <motion.button
          onClick={handleUndo}
          disabled={!lastSwiped}
          initial={false}
          animate={{ opacity: lastSwiped ? 1 : 0.25, scale: lastSwiped ? 1 : 0.9 }}
          whileHover={lastSwiped ? { scale: 1.06 } : {}}
          whileTap={lastSwiped ? { scale: 0.95 } : {}}
          className="flex items-center gap-2 font-mono text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: lastSwiped ? '#e8eaf0' : '#636878',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: lastSwiped ? 'pointer' : 'not-allowed',
          }}
        >
          <span style={{ fontSize: '1rem' }}>↩</span>
          Undo
        </motion.button>

        {/* Swipe hints */}
        {!isEmpty && cards.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 hint-left">
              <span style={{ color: '#ff453a', fontSize: 18 }}>←</span>
              <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3d4050' }}>Skip</span>
            </div>
            <div className="flex items-center gap-1.5 hint-right">
              <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3d4050' }}>Save</span>
              <span style={{ color: '#c2f542', fontSize: 18 }}>→</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => cards[0] && handleIgnore(cards[0].id)}
            disabled={isEmpty || loading}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255,69,58,0.1)',
              border: '1px solid rgba(255,69,58,0.25)',
              color: '#ff453a',
              fontSize: '1.1rem',
              cursor: isEmpty ? 'not-allowed' : 'pointer',
              opacity: isEmpty ? 0.4 : 1,
            }}
            title="Skip"
          >
            ✕
          </motion.button>
          <motion.button
            onClick={() => cards[0] && handleSave(cards[0].id)}
            disabled={isEmpty || loading}
            whileHover={{ scale: 1.08, boxShadow: '0 0 20px rgba(194,245,66,0.3)' }}
            whileTap={{ scale: 0.92 }}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'rgba(194,245,66,0.12)',
              border: '1px solid rgba(194,245,66,0.3)',
              color: '#c2f542',
              fontSize: '1.1rem',
              cursor: isEmpty ? 'not-allowed' : 'pointer',
              opacity: isEmpty ? 0.4 : 1,
            }}
            title="Save"
          >
            ✓
          </motion.button>
        </div>
      </div>
    </div>
  )
}
