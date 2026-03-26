import { useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { getSwipeDecision } from '../hooks/useSwipe.js'

const DIFFICULTY_LABEL = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
const DIFFICULTY_COLOR = { 1: '#c2f542', 2: '#f59e0b', 3: '#ff453a' }

const GRADIENT_CLASS = {
  llm: 'gradient-llm',
  bioinformatics: 'gradient-bioinformatics',
  cybersecurity: 'gradient-cybersecurity',
  devops: 'gradient-devops',
}

function DifficultyDots({ level }) {
  const color = DIFFICULTY_COLOR[level] || '#636878'
  return (
    <div className="flex items-center gap-1" title={DIFFICULTY_LABEL[level]}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={i <= level ? 'dot-filled' : 'dot-empty'}
          style={{
            display: 'block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            color,
          }}
        />
      ))}
    </div>
  )
}

function TagPill({ tag }) {
  return (
    <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.06)', color: '#636878', border: '1px solid rgba(255,255,255,0.08)' }}>
      {tag}
    </span>
  )
}

export default function SwipeCard({ card, onSave, onIgnore, isTop, stackIndex }) {
  const x = useMotionValue(0)
  const dragging = useRef(false)

  // Visual transforms from drag
  const rotate = useTransform(x, [-280, 280], [-18, 18])
  const saveOpacity = useTransform(x, [30, 130], [0, 1])
  const ignoreOpacity = useTransform(x, [-130, -30], [1, 0])
  const saveBg = useTransform(x, [0, 130], ['rgba(194,245,66,0)', 'rgba(194,245,66,0.12)'])
  const ignoreBg = useTransform(x, [-130, 0], ['rgba(255,69,58,0.12)', 'rgba(255,69,58,0)'])

  // Back card visual offsets
  const scale = 1 - stackIndex * 0.045
  const yOffset = stackIndex * 14

  const handleDragEnd = async (_, { offset, velocity }) => {
    const decision = getSwipeDecision(offset.x, velocity.x)
    if (decision === 'save') {
      await animate(x, 600, { type: 'spring', stiffness: 350, damping: 28 })
      onSave(card.id)
    } else if (decision === 'ignore') {
      await animate(x, -600, { type: 'spring', stiffness: 350, damping: 28 })
      onIgnore(card.id)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 })
    }
  }

  const gradientClass = GRADIENT_CLASS[card.topic] || 'gradient-default'
  const diffColor = DIFFICULTY_COLOR[card.difficulty] || '#636878'

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale,
        y: yOffset,
        zIndex: 10 - stackIndex,
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragStart={() => { dragging.current = true }}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* Card shell */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
        style={{
          background: '#10131a',
          boxShadow: isTop
            ? '0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)'
            : '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          cursor: isTop ? 'grab' : 'default',
        }}
      >
        {/* Save / Ignore tint overlay */}
        {isTop && (
          <>
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-10"
              style={{ background: saveBg }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-10"
              style={{ background: ignoreBg }}
            />
          </>
        )}

        {/* Image / Gradient header */}
        <div className="relative flex-shrink-0 h-44 overflow-hidden">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.classList.add(gradientClass)
              }}
            />
          ) : (
            <div className={`w-full h-full ${gradientClass}`} />
          )}
          {/* Gradient fade to card surface */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, #10131a 100%)' }}
          />

          {/* Source + date badge */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <span
              className="font-mono text-[10px] tracking-widest uppercase"
              style={{ color: '#636878' }}
            >
              {card.source}
            </span>
            {card.published_date && (
              <span className="font-mono text-[9px]" style={{ color: '#3d4050' }}>
                {card.published_date.slice(0, 16)}
              </span>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 px-5 pt-3 pb-5 gap-3 overflow-hidden">
          {/* Difficulty + topic row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DifficultyDots level={card.difficulty} />
              <span
                className="font-mono text-[10px] tracking-wider"
                style={{ color: diffColor }}
              >
                {DIFFICULTY_LABEL[card.difficulty]}
              </span>
            </div>
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#3d4050',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {card.topic}
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-display font-700 leading-tight"
            style={{ fontSize: '1.22rem', color: '#f0f2f8', letterSpacing: '-0.01em' }}
          >
            {card.title}
          </h2>

          {/* Summary */}
          {card.summary && (
            <p className="text-sm leading-relaxed" style={{ color: '#636878' }}>
              {card.summary}
            </p>
          )}

          {/* Key points */}
          <ul className="flex flex-col gap-2 flex-1">
            {card.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#b0b4c4' }}>
                <span
                  className="flex-shrink-0 mt-1.5 rounded-full"
                  style={{ width: 5, height: 5, background: '#c2f542', display: 'block' }}
                />
                {point}
              </li>
            ))}
          </ul>

          {/* Footer: tags + read button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {card.tags.slice(0, 3).map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[10px] tracking-widest uppercase flex items-center gap-1 transition-colors"
              style={{ color: '#3d4050' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c2f542')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3d4050')}
            >
              Read ↗
            </a>
          </div>
        </div>
      </div>

      {/* SAVE badge */}
      {isTop && (
        <motion.div
          className="absolute top-8 left-5 z-20 pointer-events-none"
          style={{ opacity: saveOpacity }}
        >
          <span
            className="font-display font-800 text-xl tracking-widest uppercase px-3 py-1 rounded-lg"
            style={{
              color: '#c2f542',
              border: '2.5px solid #c2f542',
              background: 'rgba(194,245,66,0.08)',
              transform: 'rotate(-12deg)',
              display: 'block',
            }}
          >
            SAVE
          </span>
        </motion.div>
      )}

      {/* IGNORE badge */}
      {isTop && (
        <motion.div
          className="absolute top-8 right-5 z-20 pointer-events-none"
          style={{ opacity: ignoreOpacity }}
        >
          <span
            className="font-display font-800 text-xl tracking-widest uppercase px-3 py-1 rounded-lg"
            style={{
              color: '#ff453a',
              border: '2.5px solid #ff453a',
              background: 'rgba(255,69,58,0.08)',
              transform: 'rotate(12deg)',
              display: 'block',
            }}
          >
            SKIP
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
