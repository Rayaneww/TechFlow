import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api/client.js'

const TOPIC_ICONS = {
  all: '✦',
  llm: '◈',
  bioinformatics: '⬡',
  cybersecurity: '◉',
  devops: '◆',
}

const DEFAULT_TOPICS = [
  { id: 'llm', label: 'LLM & AI' },
  { id: 'bioinformatics', label: 'Bioinformatics' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'devops', label: 'DevOps' },
]

export default function TopicSelector({ current, onChange }) {
  const [topics, setTopics] = useState(DEFAULT_TOPICS)

  useEffect(() => {
    api.getTopics()
      .then(setTopics)
      .catch(() => setTopics(DEFAULT_TOPICS))
  }, [])

  const all = [{ id: 'all', label: 'Tous' }, ...topics]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {all.map((topic) => {
        const active = topic.id === current
        return (
          <motion.button
            key={topic.id}
            onClick={() => onChange(topic.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0 transition-all"
            style={{
              background: active
                ? 'rgba(194,245,66,0.1)'
                : 'rgba(255,255,255,0.03)',
              border: active
                ? '1px solid rgba(194,245,66,0.25)'
                : '1px solid rgba(255,255,255,0.06)',
              color: active ? '#c2f542' : '#636878',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>{TOPIC_ICONS[topic.id] || '◈'}</span>
            <span
              className="font-mono text-[10px] tracking-widest uppercase whitespace-nowrap"
              style={{ fontWeight: active ? 500 : 400 }}
            >
              {topic.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
