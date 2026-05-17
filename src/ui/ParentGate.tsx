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
    <div className="flex flex-col h-full bg-amber-50 p-8 gap-6 items-center justify-center">
      <h1 className="text-4xl font-bold text-amber-900">
        {a} + {b} = ?
      </h1>
      <p className="text-amber-700">Tato část je pro rodiče.</p>
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
        className={`text-3xl rounded-2xl bg-white px-6 py-4 shadow w-48 text-center text-amber-900 ${
          err ? 'ring-4 ring-red-300' : ''
        }`}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-white text-amber-900 py-3 px-6 shadow font-semibold active:scale-95"
        >
          Zpět
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-amber-500 text-white py-3 px-6 shadow font-bold active:scale-95"
        >
          Pokračovat
        </button>
      </div>
    </div>
  )
}
