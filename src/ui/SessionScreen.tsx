import { streakOf } from '../core/progress'
import { answersInMinutes, choiceOptionsFor, clockHintFor, dayPartFor, formatClockInput, inputModeFor, isClockOp } from '../core/clock'
import { ClockFace, DigitalDisplay } from './ClockFace'
import { ChoiceButtons } from './ChoiceButtons'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { sessionReducer, initSessionState } from '../core/session'
import type { SessionState } from '../core/session'
import type { Card, GameMode } from '../core/types'
import { expectedAnswer, formatQuestion, formatAnswer, isArithOp } from '../core/cards'
import type { Scene } from '../scenes/types'
import { Numpad } from './Numpad'
import { PLACE_NAMES, backspace, cellCountFor, cellValue, emptyCells, gapIndex, selectCell, typeDigit } from '../core/columns'
import type { CellInput } from '../core/columns'
import { HomeIcon, MoonIcon, SunIcon } from './icons'

type Props = {
  cards: Card[]
  goalCount: number
  scene: Scene
  mode: GameMode
  profileId?: string
  onFinish: (state: SessionState) => void
  // Abandon the session and go back to the home screen. Nothing is persisted:
  // an abandoned session must not touch Leitner boxes or stats.
  onExit?: () => void
}

const MODE_LABEL: Record<GameMode, string> = { tables: 'Násobení', arith: 'Sčítání a odčítání', clock: 'Hodiny' }

export function SessionScreen({ cards, goalCount, scene, mode, profileId, onFinish, onExit }: Props) {
  const [state, dispatch] = useReducer(sessionReducer, initSessionState())
  const [input, setInput] = useState('')
  // Addition/subtraction answer: one box per place value, filled units first.
  const [cells, setCells] = useState<CellInput>(() => emptyCells(0))
  const askedAtRef = useRef<number>(0)
  // Random offset drawn once per session: phrases still change deterministically
  // with each answer (no reshuffle on re-render), but two sessions in a row do
  // not open with the same line.
  const [phraseOffset] = useState(() => Math.floor(Math.random() * 1000))

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
      const current = state.currentCard
      if (current && isArithOp(current.op)) setCells(emptyCells(cellCountFor(current)))
    }
    // Keyed by card identity on purpose: a new card object with the same id
    // (Leitner box update) must not wipe the boxes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Addition and subtraction are written in columns, as at school: operands
  // right-aligned under each other, a sum line, the answer in boxes below it.
  const column = !!card && isArithOp(card.op)
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
    let value: number
    if (column) {
      value = cellValue(cells) ?? -1
      if (value < 0) {
        // Incomplete answer: point at the box that still needs a digit.
        setCells(prev => selectCell(prev, gapIndex(prev) ?? prev.cursor))
        return
      }
    } else {
      if (input === '') return
      value = Number(input)
    }
    if (state.phase === 'asking') {
      const rt = Date.now() - askedAtRef.current
      dispatch({ type: 'SUBMIT_ANSWER', value, rt })
    } else if (state.phase === 'showing-correction') {
      dispatch({ type: 'CONFIRM_CORRECTION', value })
    }
    setInput('')
    if (column && card) setCells(emptyCells(cellCountFor(card)))
  }

  const onDigit = (d: number) => {
    if (column) setCells(prev => typeDigit(prev, d))
    else setInput(prev => (prev.length < 4 ? prev + String(d) : prev))
  }
  const onClear = () => {
    if (column) setCells(backspace)
    else setInput(prev => prev.slice(0, -1))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (inputMode !== 'keypad') return
      if (/^[0-9]$/.test(e.key)) {
        onDigit(Number(e.key))
      } else if (e.key === 'Backspace') {
        onClear()
      } else if (column && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        setCells(prev => selectCell(prev, Math.min(prev.cells.length - 1, Math.max(0, prev.cursor + (e.key === 'ArrowLeft' ? -1 : 1)))))
      } else if (e.key === 'Enter') {
        submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, cells, state.phase, inputMode, column])

  const sceneCtx = {
    correctCount: state.correctCount,
    wrongCount: state.answers.filter(a => !a.correct).length,
    goalCount: state.goalCount,
    lastEvent: lastEventOf(state),
    streak: streakOf(state.answers),
    phraseSeed: phraseOffset + state.answers.length,
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
  const hasVisual = card.op === 'clk-read' || card.op === 'clk-24to12' || card.op === 'clk-12to24'
  // Time-of-day answers are typed as digits and shown with a colon; minute
  // answers (to-hour, duration) are plain numbers like the maths games.
  const timeInput = clock && !answersInMinutes(card.op)
  const hint = clockHintFor(card)
  const dayPart = dayPartFor(card.a)
  // The clock face takes what the answer area leaves: three choice buttons are
  // low, the numpad is tall. Fixed vh sizes keep old WebKit happy (no flex
  // percentage heights), max-w caps them on narrow phones.
  const faceSize = inputMode === 'keypad' ? 'h-[28vh] w-[28vh]' : 'h-[46vh] w-[46vh]'

  return (
    <div className="flex flex-col h-dvh bg-paper overflow-hidden">
      <header className="flex items-center px-4 pt-3">
        {onExit ? (
          <button type="button" onClick={onExit} aria-label="Domů" className="shrink-0 rounded-lg border-[1.5px] border-ink bg-card text-ink p-1.5">
            <HomeIcon className="w-6 h-6" />
          </button>
        ) : <span className="shrink-0 w-9" />}
        <span className="flex-1 min-w-0 px-2 text-center font-bold text-ink text-sm truncate">{MODE_LABEL[mode]}</span>
        <Container {...sceneCtx} />
      </header>
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <section className={`flex flex-col items-center px-4 pt-2 lg:order-2 lg:basis-1/2 lg:h-full lg:max-h-none lg:justify-center lg:pt-0 ${hasVisual ? 'flex-1 min-h-0 justify-center overflow-hidden' : 'shrink-0 justify-center max-h-[36dvh]'}`}>
          <div className={`flex flex-col items-center space-y-2 min-w-0 ${hasVisual ? '[&_svg[data-mood]]:w-20 [&_svg[data-mood]]:h-16' : ''}`}>
            <Hero {...sceneCtx} />
          </div>
          {card.op === 'clk-read' && <ClockFace hour={card.a} minute={card.b} showMinuteRing className={`mt-2 ${faceSize} max-w-[80vw] max-h-[80vw] lg:h-72 lg:w-72 shrink-0`} />}
          {card.op === 'clk-24to12' && <DigitalDisplay value={card.a * 100 + card.b} className="mt-6 text-5xl lg:text-6xl" />}
          {card.op === 'clk-12to24' && (
            <div className="flex flex-col items-center space-y-1 mt-2">
              <ClockFace hour={card.a - 12} minute={card.b} showMinuteRing={false} className="h-[25vh] w-[25vh] max-w-[80vw] max-h-[80vw] lg:h-72 lg:w-72" />
              <span className="flex items-center text-sm lg:text-lg text-ink font-semibold">{card.a < 18 ? <SunIcon className="w-5 h-5 mr-1" /> : <MoonIcon className="w-5 h-5 mr-1" />}{dayPart.label}</span>
            </div>
          )}
        </section>

        <section className={`min-h-0 overflow-hidden flex flex-col items-center justify-end space-y-2 px-4 pb-3 lg:order-1 lg:basis-1/2 lg:justify-center lg:pb-0 lg:space-y-4 [@media(min-height:760px)]:space-y-3 [@media(min-height:760px)]:pb-4 ${hasVisual ? 'flex-none lg:flex-1' : 'flex-1'}`}>
          {column ? (
            <div data-testid="column-problem" className="flex flex-col items-end font-mono tabular-nums text-ink text-4xl [@media(min-height:760px)]:text-5xl lg:text-6xl">
              <h1 className="font-bold">
                <DigitRow sign="" value={card.a} width={cells.cells.length} testId="column-a" />{' '}
                <DigitRow sign={card.op === 'add' ? '+' : '−'} value={card.b} width={cells.cells.length} testId="column-b" underline />
              </h1>
              <div data-testid="answer-cells" className="flex mt-2">
                <span className="block w-[1.1em]" />
                {cells.cells.map((digit, i) => {
                  const active = i === cells.cursor
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={PLACE_NAMES[cells.cells.length - 1 - i]}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => setCells(prev => selectCell(prev, i))}
                      className={`block w-[1.1em] h-[1.3em] ${i > 0 ? 'ml-1' : ''} rounded-lg bg-card font-bold text-ink text-center leading-none ${active ? 'border-[4px] border-accent' : 'border-[1.5px] border-ink'}`}
                    >
                      {digit}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (<>
            <h1 className={`font-bold text-ink tabular-nums text-center ${clock ? 'text-2xl [@media(min-height:760px)]:text-3xl lg:text-4xl' : 'text-3xl [@media(min-height:760px)]:text-4xl lg:text-5xl'}`}>
              {clock ? formatQuestion(card) : `${formatQuestion(card)} = ?`}
            </h1>
            {hint && <p className="text-sm [@media(min-height:760px)]:text-base text-ink text-center">{hint}</p>}

            {inputMode === 'keypad' && <div data-testid="answer-input" className="text-2xl [@media(min-height:760px)]:text-3xl lg:text-4xl font-mono border-b-[3px] border-accent bg-transparent px-4 py-1.5 [@media(min-height:760px)]:px-5 [@media(min-height:760px)]:py-2 lg:px-6 lg:py-3 min-w-[5rem] text-center text-ink tabular-nums min-h-[2.75rem] [@media(min-height:760px)]:min-h-[3.5rem] lg:min-h-[4rem]">
              {timeInput ? formatClockInput(input) : input || ' '}
            </div>}
          </>)}

          {state.phase === 'showing-correction' && (
            <div className="text-base [@media(min-height:760px)]:text-lg lg:text-xl text-ink font-semibold text-center">
              <div>Správně je {formatAnswer(card, expectedAnswer(card))}.</div>
              <div className="text-xs [@media(min-height:760px)]:text-sm text-ink">{inputMode !== 'keypad' ? 'Klepni na správnou odpověď.' : timeInput ? 'Napiš ten čas.' : 'Napiš to číslo.'}</div>
            </div>
          )}

          {inputMode === 'keypad' ? <Numpad
            onDigit={onDigit}
            onClear={onClear}
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

// One operand of a column problem: the sign in its own slot, digits right-aligned
// in fixed-width slots that line up with the answer boxes below.
function DigitRow({ sign, value, width, testId, underline }: { sign: string; value: number; width: number; testId: string; underline?: boolean }) {
  const digits = String(value).split('')
  const slots = Array.from({ length: Math.max(0, width - digits.length) }, () => '').concat(digits)
  return (
    <span data-testid={testId} className={`flex ${underline ? 'border-b-[3px] border-ink pb-1' : ''}`}>
      <span className="block w-[1.1em] text-left">{sign}</span>{sign ? ' ' : ''}
      {slots.map((d, i) => <span key={i} className={`block w-[1.1em] ${i > 0 ? 'ml-1' : ''} text-center`}>{d}</span>)}
    </span>
  )
}
