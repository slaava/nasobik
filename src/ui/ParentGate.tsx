import { useMemo, useState } from 'react'

type Props = {
  onUnlock: () => void
  onCancel: () => void
}

function rand2() {
  return Math.floor(Math.random() * 80) + 11 // 11..90
}

export function ParentGate({ onUnlock, onCancel }: Props) {
  const { a, b } = useMemo(() => ({ a: rand2(), b: rand2() }), [])
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)

  const submit = () => {
    if (Number(input) === a + b) {
      onUnlock()
    } else {
      setErr(true)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-paper text-ink p-8 space-y-6 items-center justify-center">
      <h1 className="text-4xl font-bold text-ink">
        {a} + {b} = ?
      </h1>
      <p className="text-ink">Tato část je pro rodiče.</p>
      <input
        type="text"
        inputMode="numeric"
        value={input}
        onChange={e => {
          setInput(e.target.value.replace(/\D/g, ''))
          setErr(false)
        }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
        className={`text-3xl rounded-2xl bg-card px-6 py-4 w-48 text-center text-ink ${
          err ? 'border-2 border-nose' : 'border-[1.5px] border-ink'
        }`}
      />
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-card text-ink py-3 px-6 border-[1.5px] border-ink font-semibold active:scale-95"
        >
          Zpět
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-accent text-accent-fg border-2 border-accent py-3 px-6 font-bold active:scale-95"
        >
          Pokračovat
        </button>
      </div>
    </div>
  )
}
