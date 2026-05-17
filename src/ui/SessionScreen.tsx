import { useEffect, useReducer, useRef, useState } from 'react'
import { sessionReducer, initSessionState } from '../core/session'
import type { SessionState } from '../core/session'
import type { Card } from '../core/types'
import type { Scene } from '../scenes/types'
import { Numpad } from './Numpad'

type Props = {
  cards: Card[]
  goalCount: number
  scene: Scene
  onFinish: (state: SessionState) => void
}

export function SessionScreen({ cards, goalCount, scene, onFinish }: Props) {
  const [state, dispatch] = useReducer(sessionReducer, initSessionState())
  const [input, setInput] = useState('')
  const askedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    dispatch({ type: 'START', cards, goalCount, blockingTable: null })
  }, [cards, goalCount])

  useEffect(() => {
    if (state.phase === 'asking') {
      askedAtRef.current = Date.now()
      setInput('')
    }
  }, [state.currentCard?.id, state.phase])

  useEffect(() => {
    if (state.phase === 'finished') onFinish(state)
  }, [state.phase, state, onFinish])

  const submit = () => {
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
  }, [input, state.phase])

  const card = state.currentCard
  const sceneCtx = {
    correctCount: state.correctCount,
    wrongCount: state.answers.filter(a => !a.correct).length,
    goalCount: state.goalCount,
    lastEvent: lastEventOf(state),
  }
  const Hero = scene.Hero
  const Container = scene.Container

  if (state.phase === 'idle' || !card) {
    return <div className="p-8 text-center text-amber-900">Načítám…</div>
  }

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-amber-50 overflow-hidden">
      <section className="flex flex-col items-center justify-center gap-2 shrink-0 px-4 pt-2 max-h-[36dvh] lg:order-2 lg:basis-1/2 lg:h-full lg:max-h-none lg:gap-6 lg:pt-0">
        <Hero {...sceneCtx} />
        <Container {...sceneCtx} />
      </section>

      <section className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-end gap-2 px-4 pb-3 lg:order-1 lg:basis-1/2 lg:justify-center lg:pb-0 lg:gap-4 [@media(min-height:760px)]:gap-3 [@media(min-height:760px)]:pb-4">
        <h1 className="text-3xl [@media(min-height:760px)]:text-4xl lg:text-5xl font-bold text-amber-900 tabular-nums">
          {card.a} × {card.b} = ?
        </h1>

        <div className="text-2xl [@media(min-height:760px)]:text-3xl lg:text-4xl font-mono bg-white rounded-2xl px-4 py-1.5 [@media(min-height:760px)]:px-5 [@media(min-height:760px)]:py-2 lg:px-6 lg:py-3 shadow min-w-[5rem] text-center text-amber-900 tabular-nums min-h-[2.75rem] [@media(min-height:760px)]:min-h-[3.5rem] lg:min-h-[4rem]">
          {input || ' '}
        </div>

        {state.phase === 'showing-correction' && (
          <div className="text-base [@media(min-height:760px)]:text-lg lg:text-xl text-amber-700 font-semibold text-center">
            <div>Správně je {card.a * card.b}.</div>
            <div className="text-xs [@media(min-height:760px)]:text-sm text-amber-600">Napiš to číslo.</div>
          </div>
        )}

        <Numpad
          onDigit={d => setInput(prev => (prev.length < 4 ? prev + String(d) : prev))}
          onClear={() => setInput(prev => prev.slice(0, -1))}
          onSubmit={submit}
        />

        {state.phase === 'asking' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SUBMIT_ANSWER', value: -1, rt: 0 })}
            className="text-amber-700 underline text-xs [@media(min-height:760px)]:text-sm"
          >
            Já nevím
          </button>
        )}
      </section>
    </div>
  )
}

function lastEventOf(state: SessionState): 'correct' | 'wrong' | 'idle' {
  if (state.answers.length === 0) return 'idle'
  return state.answers[state.answers.length - 1]!.correct ? 'correct' : 'wrong'
}
