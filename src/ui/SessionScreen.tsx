import { streakOf } from '../core/progress'
import { choiceOptionsFor, dayPartFor, formatClockInput, inputModeFor, isClockOp } from '../core/clock'
import { ClockFace, DigitalDisplay } from './ClockFace'
import { ChoiceButtons } from './ChoiceButtons'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { sessionReducer, initSessionState } from '../core/session'
import type { SessionState } from '../core/session'
import type { Card, GameMode } from '../core/types'
import { expectedAnswer, formatQuestion, formatAnswer } from '../core/cards'
import type { Scene } from '../scenes/types'
import { Numpad } from './Numpad'

type Props = {
  cards: Card[]
  goalCount: number
  scene: Scene
  mode: GameMode
  profileId?: string
  onFinish: (state: SessionState) => void
}

const MODE_LABEL: Record<GameMode, string> = { tables: 'Násobení', arith: 'Sčítání a odčítání', clock: 'Hodiny' }

export function SessionScreen({ cards, goalCount, scene, mode, profileId, onFinish }: Props) {
  const [state, dispatch] = useReducer(sessionReducer, initSessionState())
  const [input, setInput] = useState('')
  const askedAtRef = useRef<number>(0)

  // START fires exactly once per mount. App passes fresh cards on each remount
  // (after the summary screen is dismissed), so we don't need a dep array that
  // tracks props. Listening to `cards` here caused the session to restart
  // mid-onFinish: App calls setCards(state.cards) before setPhase('summary'),
  // which changed the cards reference and re-dispatched START before the
  // phase flip unmounted us — running a second session in place.
  useEffect(() => {
    dispatch({ type: 'START', cards, goalCount, blockingTable: null, mode, profileId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state.phase === 'asking') {
      askedAtRef.current = Date.now()
      // Clear the input when the reducer advances to a question (including correction).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput('')
    }
  }, [state.currentCard?.id, state.phase])

  // Fire onFinish exactly once when the session enters the finished phase.
  // Re-running on every state/onFinish identity change caused the session
  // to be persisted twice (and stats to count every answer twice).
  const finishedFiredRef = useRef(false)
  useEffect(() => {
    if (state.phase === 'finished' && !finishedFiredRef.current) {
      finishedFiredRef.current = true
      onFinish(state)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  const card = state.currentCard
  const inputMode = card ? inputModeFor(card) : 'keypad'
  // Options belong to the question, not its correction phase or Leitner box.
  const options = useMemo(() => card && isClockOp(card.op) ? choiceOptionsFor(card, Math.random) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card?.id])

  const pick = (value: number) => {
    if (state.phase === 'asking') {
      dispatch({ type: 'SUBMIT_ANSWER', value, rt: Date.now() - askedAtRef.current })
    } else if (state.phase === 'showing-correction') {
      dispatch({ type: 'CONFIRM_CORRECTION', value })
    }
  }

  const submit = () => {
    if (inputMode !== 'keypad') return
    if (input === '') return
    const value = Number(input)
    if (state.phase === 'asking') {
      const rt = Date.now() - askedAtRef.current
      dispatch({ type: 'SUBMIT_ANSWER', value, rt })
    } else if (state.phase === 'showing-correction') {
      dispatch({ type: 'CONFIRM_CORRECTION', value })
    }
    setInput('')
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (inputMode !== 'keypad') return
      if (/^[0-9]$/.test(e.key)) {
        setInput(prev => (prev.length < 4 ? prev + e.key : prev))
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.phase, inputMode])

  const sceneCtx = {
    correctCount: state.correctCount,
    wrongCount: state.answers.filter(a => !a.correct).length,
    goalCount: state.goalCount,
    lastEvent: lastEventOf(state),
    streak: streakOf(state.answers),
    phraseSeed: state.answers.length,
  }
  const Hero = scene.Hero
  const Container = scene.Container

  if (state.phase === 'idle') {
    return <div className="p-8 text-center bg-paper text-ink">Načítám…</div>
  }
  // Distinguish "no cards available at start" (genuine empty deck — show help
  // text) from "session has finished" (transient — App.onFinish is about to
  // swap us out for the summary screen; render nothing to avoid a flash).
  if (state.phase === 'finished') {
    return <div className="h-dvh bg-paper" />
  }
  if (!card) {
    if (mode === 'arith') return <div className="h-dvh bg-paper" />
    return (
      <div className="flex flex-col h-dvh items-center justify-center space-y-4 bg-paper p-8 text-center">
        <p className="text-xl text-ink">Není co procvičovat.</p>
        <p className="text-base text-ink max-w-sm">
          V sekci <strong>Pro rodiče</strong> zaškrtni alespoň jednu {mode === 'clock' ? 'úroveň hodin.' : 'řadu násobilky.'}
        </p>
      </div>
    )
  }

  const clock = isClockOp(card.op)
  const hasVisual = clock && card.op !== 'clk-phrase'
  const dayPart = dayPartFor(card.a)

  return (
    <div className="flex flex-col h-dvh bg-paper overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-3"><span className="font-bold text-ink text-sm whitespace-nowrap">{MODE_LABEL[mode]}</span><Container {...sceneCtx} /></header>
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <section className={`flex items-center shrink-0 px-4 pt-2 lg:order-2 lg:basis-1/2 lg:h-full lg:max-h-none lg:space-y-6 lg:pt-0 ${hasVisual ? 'flex-row justify-center space-x-4 lg:space-x-0 lg:flex-col max-h-[38dvh]' : 'flex-col justify-center space-y-2 max-h-[36dvh]'}`}>
          <div className="flex flex-col items-center space-y-2 min-w-0">
            <Hero {...sceneCtx} />
          </div>
          {card.op === 'clk-read' && <ClockFace hour={card.a} minute={card.b} showMinuteRing className="h-[26dvh] w-[26dvh] max-w-[44vw] lg:h-64 lg:w-64 shrink-0" />}
          {card.op === 'clk-24to12' && <DigitalDisplay value={card.a * 100 + card.b} className="text-4xl lg:text-6xl" />}
          {card.op === 'clk-12to24' && (
            <div className="flex flex-col items-center space-y-1">
              <ClockFace hour={card.a - 12} minute={card.b} showMinuteRing={false} className="h-[24dvh] w-[24dvh] max-w-[44vw] lg:h-64 lg:w-64" />
              <span className="text-sm lg:text-lg text-ink font-semibold">{dayPart.icon} {dayPart.label}</span>
            </div>
          )}
        </section>

        <section className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-end space-y-2 px-4 pb-3 lg:order-1 lg:basis-1/2 lg:justify-center lg:pb-0 lg:space-y-4 [@media(min-height:760px)]:space-y-3 [@media(min-height:760px)]:pb-4">
          <h1 className={`font-bold text-ink tabular-nums text-center ${clock ? 'text-2xl [@media(min-height:760px)]:text-3xl lg:text-4xl' : 'text-3xl [@media(min-height:760px)]:text-4xl lg:text-5xl'}`}>
            {clock ? formatQuestion(card) : `${formatQuestion(card)} = ?`}
          </h1>
          {card.op === 'clk-phrase' && <p className="text-sm [@media(min-height:760px)]:text-base text-ink">Který ciferník to ukazuje?</p>}

          {inputMode === 'keypad' && <div data-testid="answer-input" className="text-2xl [@media(min-height:760px)]:text-3xl lg:text-4xl font-mono border-b-[3px] border-accent bg-transparent px-4 py-1.5 [@media(min-height:760px)]:px-5 [@media(min-height:760px)]:py-2 lg:px-6 lg:py-3 min-w-[5rem] text-center text-ink tabular-nums min-h-[2.75rem] [@media(min-height:760px)]:min-h-[3.5rem] lg:min-h-[4rem]">
            {clock ? formatClockInput(input) : input || ' '}
          </div>}

          {state.phase === 'showing-correction' && (
            <div className="text-base [@media(min-height:760px)]:text-lg lg:text-xl text-ink font-semibold text-center">
              <div>Správně je {formatAnswer(card, expectedAnswer(card))}.</div>
              <div className="text-xs [@media(min-height:760px)]:text-sm text-ink">{inputMode !== 'keypad' ? 'Klepni na správnou odpověď.' : clock ? 'Napiš ten čas.' : 'Napiš to číslo.'}</div>
            </div>
          )}

          {inputMode === 'keypad' ? <Numpad
            onDigit={d => setInput(prev => (prev.length < 4 ? prev + String(d) : prev))}
            onClear={() => setInput(prev => prev.slice(0, -1))}
            onSubmit={submit}
          /> : <ChoiceButtons options={options} kind={inputMode === 'choice-digital' ? 'digital' : 'clock'} onPick={pick} />}

          {state.phase === 'asking' && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SUBMIT_ANSWER', value: -1, rt: 0 })}
              className="text-ink underline text-xs [@media(min-height:760px)]:text-sm"
            >
              Já nevím
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

function lastEventOf(state: SessionState): 'correct' | 'wrong' | 'dunno' | 'idle' {
  if (state.answers.length === 0) return 'idle'
  const last = state.answers[state.answers.length - 1]!
  return last.correct ? 'correct' : last.rt === 0 ? 'dunno' : 'wrong'
}
