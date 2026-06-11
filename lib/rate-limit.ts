// In-memory rate limiter using globalThis (persists across warm invocations).
// Resets on cold starts — acceptable for a low-traffic internal tool.
// For multi-instance protection, use an external store (Upstash Redis, etc.).

const WINDOW_MS = 15 * 60 * 1000  // 15 minutes
const MAX_ATTEMPTS = 5

interface AttemptRecord {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

const globalStore = globalThis as unknown as {
  _loginAttempts: Map<string, AttemptRecord> | undefined
}

function store(): Map<string, AttemptRecord> {
  if (!globalStore._loginAttempts) {
    globalStore._loginAttempts = new Map()
  }
  return globalStore._loginAttempts
}

function pruneExpired(): void {
  const now = Date.now()
  const map = store()
  for (const [key, rec] of map) {
    const expired = now - rec.firstAttempt > WINDOW_MS
    const unlocked = !rec.lockedUntil || now > rec.lockedUntil
    if (expired && unlocked) map.delete(key)
  }
}

export function partialIp(ip: string): string {
  if (!ip) return 'unknown'
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, '.xxx')
  const groups = ip.split(':')
  return groups.slice(0, 4).join(':') + ':xxxx:...'
}

/** Returns true if this IP or email is currently rate-limited. */
export function checkRateLimit(ip: string, email: string): boolean {
  pruneExpired()
  const now = Date.now()
  const map = store()

  for (const key of [`ip:${ip}`, `em:${email}`]) {
    const rec = map.get(key)
    if (!rec) continue
    if (rec.lockedUntil && now < rec.lockedUntil) return true
    if (now - rec.firstAttempt <= WINDOW_MS && rec.count >= MAX_ATTEMPTS) return true
  }
  return false
}

/** Records a failed attempt for the given IP and email. */
export function recordFailure(ip: string, email: string): void {
  const now = Date.now()
  const map = store()

  for (const key of [`ip:${ip}`, `em:${email}`]) {
    const rec = map.get(key)
    if (!rec || now - rec.firstAttempt > WINDOW_MS) {
      map.set(key, { count: 1, firstAttempt: now })
    } else {
      const count = rec.count + 1
      map.set(key, {
        ...rec,
        count,
        lockedUntil: count >= MAX_ATTEMPTS ? now + WINDOW_MS : rec.lockedUntil,
      })
    }
  }

  const attempts = map.get(`ip:${ip}`)?.count ?? 1
  console.log(
    `[Auth] Failed attempt | ${new Date().toISOString()} | ip: ${partialIp(ip)} | ${attempts}/${MAX_ATTEMPTS}`,
  )
}

/** Clears rate-limit counters after a successful login. */
export function recordSuccess(ip: string, email: string): void {
  const map = store()
  map.delete(`ip:${ip}`)
  map.delete(`em:${email}`)
  console.log(`[Auth] Login success | ${new Date().toISOString()} | ip: ${partialIp(ip)}`)
}
