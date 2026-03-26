import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client.js'

const DIFFICULTY_LABEL = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' }
const DIFFICULTY_COLOR = { 1: '#c2f542', 2: '#f59e0b', 3: '#ff453a' }

const SORT_OPTIONS = [
  { id: 'newest', label: 'Plus récent' },
  { id: 'oldest', label: 'Plus ancien' },
  { id: 'easy', label: 'Facile d\'abord' },
  { id: 'hard', label: 'Difficile d\'abord' },
  { id: 'topic', label: 'Par thème' },
]

const PERIOD_OPTIONS = [
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout' },
]

const HISTORY_TOPICS = [
  { id: 'all', label: 'Tous' },
  { id: 'llm', label: 'LLM & AI' },
  { id: 'bioinformatics', label: 'Bioinfo' },
  { id: 'cybersecurity', label: 'Cyber' },
  { id: 'devops', label: 'DevOps' },
]

function sortCards(cards, sortId) {
  const c = [...cards]
  switch (sortId) {
    case 'oldest':
      return c.sort((a, b) => (a.published_date || '').localeCompare(b.published_date || ''))
    case 'easy':
      return c.sort((a, b) => a.difficulty - b.difficulty)
    case 'hard':
      return c.sort((a, b) => b.difficulty - a.difficulty)
    case 'topic':
      return c.sort((a, b) => a.topic.localeCompare(b.topic))
    default: // newest — server already returns newest first
      return c
  }
}

function CardRow({ card, actionLabel, actionColor, onAction, actionIcon }) {
  const diffColor = DIFFICULTY_COLOR[card.difficulty] || '#636878'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, height: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: '#10131a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-display font-600 leading-snug flex-1"
          style={{ fontSize: '0.9rem', color: '#e8eaf0' }}
        >
          {card.title}
        </h3>
        <button
          onClick={() => onAction(card.id)}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors text-sm"
          style={{ color: '#636878' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = actionColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#636878')}
          title={actionLabel}
        >
          {actionIcon}
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
        <span style={{ color: '#2e3140' }}>·</span>
        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3d4050' }}>
          {card.topic}
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
          Lire ↗
        </a>
      </div>
    </motion.div>
  )
}

function LoadingDots() {
  return (
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
  )
}

// ── Saved tab ────────────────────────────────────────────────────────────────

function SavedTab({ refreshKey }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState('newest')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSaved()
      setCards(data)
    } catch (e) {
      console.error('[SavedList] fetch saved failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  const handleUnsave = async (id) => {
    try {
      await api.unsaveCard(id)
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error('[SavedList] unsave failed:', e)
    }
  }

  const sorted = sortCards(cards, sort)

  return (
    <div className="flex flex-col h-full">
      {/* Sort bar */}
      {cards.length > 1 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id)}
                className="flex-shrink-0 font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: sort === opt.id ? 'rgba(194,245,66,0.1)' : 'rgba(255,255,255,0.03)',
                  border: sort === opt.id ? '1px solid rgba(194,245,66,0.25)' : '1px solid rgba(255,255,255,0.05)',
                  color: sort === opt.id ? '#c2f542' : '#636878',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {loading && <LoadingDots />}

        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
            <span className="text-4xl opacity-20">◈</span>
            <div>
              <p className="font-display font-600" style={{ color: '#636878' }}>Rien pour l'instant</p>
              <p className="text-sm mt-1" style={{ color: '#3d4050' }}>Swipe à droite pour sauvegarder</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {sorted.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              actionLabel="Retirer"
              actionColor="#ff453a"
              actionIcon="✕"
              onAction={handleUnsave}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── History tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('7d')
  const [topic, setTopic] = useState('all')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getHistory(period, topic)
      setCards(data)
    } catch (e) {
      console.error('[History] fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [period, topic])

  useEffect(() => { fetch() }, [fetch])

  const handleRestore = async (id) => {
    try {
      await api.restoreCard(id)
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error('[History] restore failed:', e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 pb-3 flex-shrink-0 flex flex-col gap-2">
        {/* Period */}
        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className="flex-shrink-0 font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: period === opt.id ? 'rgba(194,245,66,0.1)' : 'rgba(255,255,255,0.03)',
                border: period === opt.id ? '1px solid rgba(194,245,66,0.25)' : '1px solid rgba(255,255,255,0.05)',
                color: period === opt.id ? '#c2f542' : '#636878',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Topic filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {HISTORY_TOPICS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTopic(opt.id)}
              className="flex-shrink-0 font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: topic === opt.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                border: topic === opt.id ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.04)',
                color: topic === opt.id ? '#e8eaf0' : '#3d4050',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {loading && <LoadingDots />}

        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
            <span className="text-4xl opacity-20">↺</span>
            <div>
              <p className="font-display font-600" style={{ color: '#636878' }}>Historique vide</p>
              <p className="text-sm mt-1" style={{ color: '#3d4050' }}>
                Les articles ignorés apparaissent ici
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              actionLabel="Remettre dans le feed"
              actionColor="#c2f542"
              actionIcon="↺"
              onAction={handleRestore}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Main drawer ──────────────────────────────────────────────────────────────

export default function SavedList({ open, onClose, refreshKey }) {
  const [tab, setTab] = useState('saved')

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
              width: 'min(420px, 100vw)',
              background: '#0d0f15',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                {/* Tabs */}
                {[
                  { id: 'saved', label: 'Sauvegardés' },
                  { id: 'history', label: 'Historique' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="font-mono text-[10px] tracking-widest uppercase pb-0.5 transition-all"
                    style={{
                      color: tab === t.id ? '#f0f2f8' : '#3d4050',
                      borderBottom: tab === t.id ? '1px solid #c2f542' : '1px solid transparent',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
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

            {/* Tab content */}
            <div className="flex-1 overflow-hidden pt-3">
              {tab === 'saved'
                ? <SavedTab refreshKey={refreshKey} />
                : <HistoryTab />
              }
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
