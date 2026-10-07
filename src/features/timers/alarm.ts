let ctx: AudioContext | null = null
let loop: number | null = null


/** Debe llamarse desde un gesto del usuario (p. ej. al iniciar un temporizador) para desbloquear el audio. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* sin audio */ }
}

function bell(freq: number, at: number, gain = 0.22) {
  if (!ctx) return
  for (const [mult, g] of [[1, gain], [2.01, gain * 0.35], [3.2, gain * 0.12]] as const) {
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * mult
    amp.gain.setValueAtTime(0.0001, at)
    amp.gain.exponentialRampToValueAtTime(g, at + 0.01)
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
    osc.connect(amp).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 1.7)
  }
}

function chime() {
  if (!ctx) return
  const t = ctx.currentTime + 0.02
  bell(784, t)
  bell(988, t + 0.28)
  bell(1319, t + 0.56)
  navigator.vibrate?.([220, 120, 220])
}

export function startAlarm() {
  if (loop != null) return
  chime()
  loop = window.setInterval(chime, 2600)
}

export function stopAlarm() {
  if (loop != null) clearInterval(loop)
  loop = null
}

export function softPing() {
  if (!ctx) return
  bell(1046, ctx.currentTime + 0.01, 0.12)
}
