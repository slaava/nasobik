import type { Card } from './types'

export function applyAnswer(
  card: Card,
  outcome: { correct: boolean; rt: number },
): Card {
  const newBox = outcome.correct
    ? (Math.min(card.box + 1, 5) as Card['box'])
    : 1

  return {
    ...card,
    box: newBox,
    exposuresSinceLastSeen: 0,
    sessionsSinceLastSeen: 0,
    lastRT: outcome.rt,
    totalSeen: card.totalSeen + 1,
    totalCorrect: card.totalCorrect + (outcome.correct ? 1 : 0),
  }
}

export function bumpExposure(card: Card): Card {
  return { ...card, exposuresSinceLastSeen: card.exposuresSinceLastSeen + 1 }
}

type PickContext = { blockingTable: number | null }

const BOX_EXPOSURE_THRESHOLD: Record<Card['box'], number> = {
  1: 3,
  2: 10,
  3: 0,
  4: 0,
  5: 0,
}

const BOX_SESSION_THRESHOLD: Record<Card['box'], number> = {
  1: 0,
  2: 0,
  3: 1,
  4: 2,
  5: 3,
}

// Session threshold is a hard gate (a Box 4 card not yet due across sessions
// must not surface — even as fallback). Exposure threshold is a soft gate:
// under-exposed cards are excluded from "ready" but still qualify as fallback
// when nothing in the session is fully ready yet.
function meetsSessionThreshold(card: Card): boolean {
  return card.sessionsSinceLastSeen >= BOX_SESSION_THRESHOLD[card.box]
}

function isReady(card: Card): boolean {
  return (
    card.exposuresSinceLastSeen >= BOX_EXPOSURE_THRESHOLD[card.box] &&
    meetsSessionThreshold(card)
  )
}

export function pickNext(cards: Card[], ctx: PickContext): Card | null {
  if (cards.length === 0) return null

  const eligible = ctx.blockingTable !== null
    ? cards.filter(c => c.a === ctx.blockingTable)
    : cards

  const sessionEligible = eligible.filter(meetsSessionThreshold)
  if (sessionEligible.length === 0) return null

  const ready = sessionEligible.filter(isReady)
  const pool = ready.length > 0 ? ready : sessionEligible

  // Sort by priority (lower box first, then higher exposuresSinceLastSeen).
  // Ties resolve in input array order — Array.prototype.sort is stable. The
  // session reducer shuffles the cards on START so that ties produce varied
  // picks instead of an alphabetical-by-id run.
  const sorted = [...pool].sort((a, b) => {
    if (a.box !== b.box) return a.box - b.box
    return b.exposuresSinceLastSeen - a.exposuresSinceLastSeen
  })

  return sorted[0] ?? null
}
