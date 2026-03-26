/**
 * Returns swipe direction and strength from a drag offset.
 * Used by SwipeCard to decide whether to commit a swipe.
 */
export function getSwipeDecision(offsetX, velocityX, threshold = 100, velocityThreshold = 500) {
  const absOffset = Math.abs(offsetX)
  const absVelocity = Math.abs(velocityX)

  if (absOffset > threshold || absVelocity > velocityThreshold) {
    return offsetX > 0 ? 'save' : 'ignore'
  }
  return null
}

/**
 * Returns a 0–1 opacity value for the badge overlay.
 */
export function getBadgeOpacity(offsetX, direction) {
  if (direction === 'save') {
    return Math.min(1, Math.max(0, (offsetX - 40) / 100))
  }
  if (direction === 'ignore') {
    return Math.min(1, Math.max(0, (-offsetX - 40) / 100))
  }
  return 0
}
