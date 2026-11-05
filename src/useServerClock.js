import { useEffect, useRef, useState } from 'react'
import { estimateServerEpoch, getAnchoredServerTime } from './serverClock.js'

const SYNC_INTERVAL = 5 * 60 * 1000
const REQUEST_TIMEOUT = 5000

export function useServerClock() {
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState('syncing')
  const clockAnchor = useRef(null)
  const requestController = useRef(null)
  const active = useRef(false)

  useEffect(() => {
    active.current = true
    const performance = window.performance
    clockAnchor.current = {
      epoch: Date.now(),
      performanceTime: performance.now(),
      isServerTime: false,
    }

    const synchronize = () => {
      requestController.current?.abort()
      const controller = new AbortController()
      requestController.current = controller
      const requestStartedAt = performance.now()
      let timedOut = false
      const timeout = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, REQUEST_TIMEOUT)

      void fetch(`${window.location.origin}/`, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      })
        .then((response) => {
          const responseReceivedAt = performance.now()
          if (!active.current) return
          if (controller.signal.aborted) {
            if (timedOut) throw new Error('The server clock request timed out.')
            return
          }
          if (!response.ok) throw new Error(`Server clock request failed with HTTP ${response.status}.`)
          const dateHeader = response.headers.get('Date')
          if (!dateHeader) throw new Error('The server clock response is missing its Date header.')

          clockAnchor.current = {
            epoch: estimateServerEpoch(dateHeader, responseReceivedAt - requestStartedAt),
            performanceTime: responseReceivedAt,
            isServerTime: true,
          }
          setNow(new Date(getAnchoredServerTime(clockAnchor.current, performance.now())))
          setStatus('synced')
        })
        .catch((error) => {
          if (!active.current || (error.name === 'AbortError' && !timedOut)) return
          const syncError = timedOut ? new Error('The server clock request timed out.') : error
          console.warn('Could not synchronize with server time.', syncError)
          setStatus(clockAnchor.current?.isServerTime ? 'stale' : 'local')
        })
        .finally(() => {
          window.clearTimeout(timeout)
        })
    }

    const updateClock = () => {
      const anchor = clockAnchor.current
      if (!anchor) return
      const timestamp = anchor.isServerTime
        ? getAnchoredServerTime(anchor, performance.now())
        : Date.now()
      setNow(new Date(timestamp))
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') synchronize()
    }

    void synchronize()
    const clockTimer = window.setInterval(updateClock, 1000)
    const syncTimer = window.setInterval(synchronize, SYNC_INTERVAL)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active.current = false
      requestController.current?.abort()
      window.clearInterval(clockTimer)
      window.clearInterval(syncTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { now, status }
}
