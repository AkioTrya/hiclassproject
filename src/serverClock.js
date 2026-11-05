export function estimateServerEpoch(dateHeader, roundTripMs) {
  const serverEpoch = Date.parse(dateHeader)
  if (!Number.isFinite(serverEpoch)) {
    throw new TypeError('The server response did not contain a valid Date header.')
  }
  if (!Number.isFinite(roundTripMs) || roundTripMs < 0) {
    throw new RangeError('The server time request duration must be a non-negative number.')
  }
  return serverEpoch + roundTripMs / 2
}

export function getAnchoredServerTime(anchor, performanceNow) {
  if (!anchor || !Number.isFinite(anchor.epoch) || !Number.isFinite(anchor.performanceTime) || !Number.isFinite(performanceNow)) {
    throw new TypeError('A valid server clock anchor and performance timestamp are required.')
  }
  return anchor.epoch + Math.max(0, performanceNow - anchor.performanceTime)
}
