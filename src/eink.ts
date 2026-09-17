import { useEffect, useState } from 'react'

// Device-level "e-ink" display mode: no animations/transitions, pure black on
// white, borders instead of shadows. It is a property of the screen the app
// runs on, not of the child, so it lives in localStorage rather than the
// profile. Activate via the parent settings checkbox or by opening the app
// with `?eink=1` (handy on a reader whose browser has no way to reach the
// settings comfortably); `?eink=0` turns it back off.

const STORAGE_KEY = 'nasobik.eink'
const EVENT = 'nasobik:eink'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function apply(on: boolean) {
  if (on) document.documentElement.dataset.theme = 'eink'
  else delete document.documentElement.dataset.theme
}

export function isEink(): boolean {
  return document.documentElement.dataset.theme === 'eink'
}

export function setEink(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    // Private mode / blocked storage: still apply for this page load.
  }
  apply(on)
  window.dispatchEvent(new Event(EVENT))
}

/** Call once at startup, before the first render. */
export function initEink(search: string = window.location.search) {
  const param = new URLSearchParams(search).get('eink')
  if (param === '1' || param === '0') setEink(param === '1')
  else apply(readStored())
}

export function useEink(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(isEink)
  useEffect(() => {
    const sync = () => setOn(isEink())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  return [on, setEink]
}
