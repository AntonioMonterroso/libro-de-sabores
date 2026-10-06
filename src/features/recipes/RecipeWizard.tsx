import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, ChevronLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { compressImage } from '../../lib/image-compress'
import { Button, GhostButton } from '../../components/ui/controls'
import { Chip, Row, Section, Segmented, Select, Stepper, TextArea, inputBare } from '../../components/ui/layout'
import { saveRecipe, uploadPhoto, useCategories, useSignedUrl } from './api'
import {
  ALLERGENS, KIND_LABEL, TIP_LABELS, UNITS, emptyDraft, newIngredient, newStep, uid,
  type Draft, type DraftIngredient, type IngredientKind, type ScaleMode, type TipType,
} from './types'

const STEPS = ['Lo básico', 'Ingredientes', 'Pasos', 'Consejos', 'Foto', 'Revisar'] as const
const ease = [0.23, 1, 0.32, 1] as const
const DRAFT_KEY = 'libro:draft:new'

export function RecipeWizard({ initial }: { initial?: Draft }) {
  const { session } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() => initial ?? readLocal() ?? emptyDraft())
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initial) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, initial])

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo({ top: 0 }) }
  const canNext = step !== 0 || draft.title.trim().length >= 2

  async function finish(status: 'draft' | 'published') {
    if (!session) return
    setBusy(true)
    setError('')
    try {
      const id = await saveRecipe(draft, session.user.id, status)
      localStorage.removeItem(DRAFT_KEY)
      await qc.invalidateQueries({ queryKey: ['recipes'] })
      await qc.invalidateQueries({ queryKey: ['recipe', id] })
      nav(`/receta/${id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl pb-32">
      <header className="sticky top-0 z-10 border-b border-hairline/70 bg-ivory/85 px-4 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <GhostButton onClick={() => (step === 0 ? nav(-1) : go(step - 1))} aria-label="Atrás" className="-ml-3 flex items-center gap-1">
            <ChevronLeft size={18} /> {step === 0 ? 'Cancelar' : STEPS[step - 1]}
          </GhostButton>
          <span className="text-xs text-cocoa-soft">{step + 1} de {STEPS.length}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-pearl" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-champagne transition-[width] duration-500 [transition-timing-function:var(--ease-out)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="px-4 pt-6">
        <h1 className="font-display text-4xl font-medium">{STEPS[step]}</h1>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            className="mt-6 grid gap-6"
            initial={{ opacity: 0, transform: `translateX(${dir * 20}px)` }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={{ opacity: 0, transform: `translateX(${dir * -20}px)` }}
            transition={{ duration: 0.28, ease }}
          >
            {step === 0 && <StepBasics d={draft} set={patch} />}
            {step === 1 && <StepIngredients d={draft} set={patch} />}
            {step === 2 && <StepSteps d={draft} set={patch} />}
            {step === 3 && <StepTips d={draft} set={patch} />}
            {step === 4 && <StepPhoto d={draft} set={patch} userId={session!.user.id} />}
            {step === 5 && <StepReview d={draft} />}
          </motion.div>
        </AnimatePresence>
        {error && <p role="alert" className="mt-4 text-sm text-[#9B3B3B]">{error}</p>}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline/70 bg-ivory/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => go(step + 1)}>Continuar</Button>
          ) : (
            <>
              <Button disabled={busy} className="!bg-pearl !text-cocoa !shadow-none" onClick={() => finish('draft')}>Guardar borrador</Button>
              <Button disabled={busy || draft.title.trim().length < 2} onClick={() => finish('published')}>{busy ? 'Guardando…' : 'Publicar'}</Button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

function readLocal(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

type StepProps = { d: Draft; set: (p: Partial<Draft>) => void }

function StepBasics({ d, set }: StepProps) {
  const { data: cats = [] } = useCategories()
  const groups = useMemo(() => {
    const m = new Map<string, typeof cats>()
    cats.forEach((c) => m.set(c.group_slug, [...(m.get(c.group_slug) ?? []), c]))
    return [...m.entries()]
  }, [cats])
  const GROUP_NAME: Record<string, string> = { ritmo: 'Ritmo', formalidad: 'Formalidad', momento: 'Momento del día', plato: 'Tipo de plato', ocasion: 'Ocasión', dieta: 'Dieta', dificultad: 'Dificultad', origen: 'Origen', tecnica: 'Técnica', temporada: 'Temporada' }
  const toggle = (id: string) => set({ categoryIds: d.categoryIds.includes(id) ? d.categoryIds.filter((x) => x !== id) : [...d.categoryIds, id] })

  return (
    <>
      <Section>
        <input aria-label="Nombre de la receta" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Nombre de la receta" maxLength={120} className="block w-full bg-transparent px-4 py-3.5 font-display text-2xl outline-none placeholder:text-cocoa-soft/40" />
        <input aria-label="Subtítulo" value={d.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Una línea que la describa" className="block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50" />
      </Section>
      <Section title="Su historia" footer="Quién la hacía, de dónde viene, en qué ocasión. Es lo que la vuelve nuestra.">
        <TextArea aria-label="Historia" rows={4} value={d.story} onChange={(e) => set({ story: e.target.value })} placeholder="Cuenta su historia…" />
        <input aria-label="Linaje" value={d.lineage} onChange={(e) => set({ lineage: e.target.value })} placeholder="De la bisabuela Rosa, 1962" className="block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50" />
      </Section>
      <Section title="Rinde">
        <Row label="Cantidad"><Stepper label="Cantidad" value={d.servings_base} onChange={(n) => set({ servings_base: n })} max={500} /></Row>
        <Row label="Medida" htmlFor="slabel">
          <Select id="slabel" value={d.servings_label} onChange={(e) => set({ servings_label: e.target.value })}>
            {['personas', 'porciones', 'piezas'].map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Row>
      </Section>
      <Section title="Tiempos (minutos)">
        {([['prep_min', 'Preparación'], ['cook_min', 'Cocción'], ['rest_min', 'Reposo']] as const).map(([k, l]) => (
          <Row key={k} label={l} htmlFor={k}>
            <input id={k} inputMode="numeric" value={d[k]} onChange={(e) => set({ [k]: e.target.value.replace(/\D/g, '') })} placeholder="0" className={inputBare} />
          </Row>
        ))}
        <Row label="Dificultad">
          <Segmented label="Dificultad" value={d.difficulty} onChange={(v) => set({ difficulty: v })} options={[{ value: 1, label: 'Fácil' }, { value: 2, label: 'Media' }, { value: 3, label: 'De chef' }]} />
        </Row>
      </Section>
      {groups.map(([g, items]) => (
        <section key={g} className="grid gap-2">
          <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">{GROUP_NAME[g] ?? g}</h2>
          <div className="flex flex-wrap gap-2 px-1">
            {items.map((c) => <Chip key={c.id} active={d.categoryIds.includes(c.id)} color={c.color} onClick={() => toggle(c.id)}>{c.name}</Chip>)}
          </div>
        </section>
      ))}
    </>
  )
}

function StepIngredients({ d, set }: StepProps) {
  const upd = (gi: number, ii: number, p: Partial<DraftIngredient>) =>
    set({ groups: d.groups.map((g, i) => (i !== gi ? g : { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, ...p } : it)) })) })

  return (
    <>
      <p className="-mt-2 text-cocoa-soft">Anota todo medido. Separa los condimentos y los líquidos para que se vean como en una ficha de chef.</p>
      {d.groups.map((g, gi) => (
        <Section key={g.key} title={g.name || (gi === 0 ? 'Ingredientes' : 'Otro grupo')}>
          {d.groups.length > 0 && (
            <input aria-label="Nombre del grupo" value={g.name} onChange={(e) => set({ groups: d.groups.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)) })} placeholder="Nombre del grupo (ej. Para la masa)" className="block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50" />
          )}
          {g.items.map((it, ii) => (
            <div key={it.key} className="grid gap-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="shrink-0 text-hairline" aria-hidden="true" />
                <input aria-label="Ingrediente" value={it.name} onChange={(e) => upd(gi, ii, { name: e.target.value })} placeholder="Ingrediente" className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-cocoa-soft/40" />
                <button type="button" aria-label="Quitar ingrediente" className="grid size-9 place-items-center rounded-full text-cocoa-soft hover:bg-pearl" onClick={() => set({ groups: d.groups.map((x, i) => (i === gi ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)) })}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <input aria-label="Cantidad" inputMode="decimal" value={it.quantity} onChange={(e) => upd(gi, ii, { quantity: e.target.value })} disabled={it.scale_mode === 'to_taste'} placeholder={it.scale_mode === 'to_taste' ? 'al gusto' : '1 ½'} className="w-16 rounded-lg bg-pearl px-2.5 py-2 text-center text-[15px] outline-none disabled:opacity-50" />
                <Select aria-label="Unidad" value={it.unit} onChange={(e) => upd(gi, ii, { unit: e.target.value })} className="!text-left rounded-lg bg-pearl px-2">
                  <option value="">unidad</option>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </Select>
                <Select aria-label="Tipo" value={it.kind} onChange={(e) => upd(gi, ii, { kind: e.target.value as IngredientKind })} className="!text-left rounded-lg bg-pearl px-2">
                  {(Object.keys(KIND_LABEL) as IngredientKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-6">
                <input aria-label="Preparación" value={it.prep} onChange={(e) => upd(gi, ii, { prep: e.target.value })} placeholder="picado fino, a temperatura ambiente…" className="min-w-0 flex-1 bg-transparent text-sm text-cocoa-soft outline-none placeholder:text-cocoa-soft/40" />
                <Select aria-label="Cómo escala" value={it.scale_mode} onChange={(e) => upd(gi, ii, { scale_mode: e.target.value as ScaleMode })} className="!text-left text-sm text-cocoa-soft">
                  <option value="linear">Escala normal</option>
                  <option value="sublinear">Escala menos</option>
                  <option value="fixed">No cambia</option>
                  <option value="to_taste">Al gusto</option>
                </Select>
              </div>
            </div>
          ))}
          <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] font-medium text-sage-deep" onClick={() => set({ groups: d.groups.map((x, i) => (i === gi ? { ...x, items: [...x.items, newIngredient()] } : x)) })}>
            <Plus size={18} /> Agregar ingrediente
          </button>
        </Section>
      ))}
      <GhostButton className="justify-self-start" onClick={() => set({ groups: [...d.groups, { key: uid(), name: '', items: [newIngredient()] }] })}>
        <Plus size={16} className="mr-1 inline" /> Otro grupo (masa, relleno, salsa…)
      </GhostButton>
    </>
  )
}

function StepSteps({ d, set }: StepProps) {
  const upd = (i: number, p: Partial<(typeof d.steps)[number]>) => set({ steps: d.steps.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  const digits = (s: string) => s.replace(/\D/g, '')
  return (
    <>
      <p className="-mt-2 text-cocoa-soft">Un paso por tarjeta. Si lleva tiempo, anótalo: quien cocine podrá iniciar el temporizador desde la receta.</p>
      {d.steps.map((s, i) => (
        <Section key={s.key} title={`Paso ${i + 1}`}>
          <input aria-label="Título del paso" value={s.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Título (opcional): Amasar" className="block w-full bg-transparent px-4 py-3 text-base font-medium outline-none placeholder:text-cocoa-soft/40" />
          <TextArea aria-label="Instrucciones" rows={3} value={s.body} onChange={(e) => upd(i, { body: e.target.value })} placeholder="Qué hay que hacer…" />
          <Row label="Temporizador (min)" htmlFor={`t${i}`}><input id={`t${i}`} inputMode="numeric" value={s.timer_minutes} onChange={(e) => upd(i, { timer_minutes: digits(e.target.value) })} placeholder="15" className={inputBare} /></Row>
          <Row label="Temperatura (°C)" htmlFor={`c${i}`}><input id={`c${i}`} inputMode="numeric" value={s.temperature_c} onChange={(e) => upd(i, { temperature_c: digits(e.target.value) })} placeholder="180" className={inputBare} /></Row>
          <Row label="Punto de cocción" htmlFor={`p${i}`}><input id={`p${i}`} value={s.doneness_cue} onChange={(e) => upd(i, { doneness_cue: e.target.value })} placeholder="hasta que dore" className={inputBare} /></Row>
          {d.steps.length > 1 && (
            <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] text-[#9B3B3B]" onClick={() => set({ steps: d.steps.filter((_, j) => j !== i) })}>
              <Trash2 size={16} /> Quitar paso
            </button>
          )}
        </Section>
      ))}
      <GhostButton className="justify-self-start" onClick={() => set({ steps: [...d.steps, newStep()] })}><Plus size={16} className="mr-1 inline" /> Agregar paso</GhostButton>
    </>
  )
}

function StepTips({ d, set }: StepProps) {
  const toggleAllergen = (a: string) => set({ allergens: d.allergens.includes(a) ? d.allergens.filter((x) => x !== a) : [...d.allergens, a] })
  return (
    <>
      <Section title="Secretos del chef" footer="Trucos, sustituciones, errores a evitar. Lo que no sale en el papel.">
        {d.tips.map((t, i) => (
          <div key={t.key} className="grid gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <Select aria-label="Tipo de consejo" value={t.type} onChange={(e) => set({ tips: d.tips.map((x, j) => (j === i ? { ...x, type: e.target.value as TipType } : x)) })} className="!text-left font-medium">
                {TIP_LABELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <button type="button" aria-label="Quitar consejo" className="grid size-9 place-items-center rounded-full text-cocoa-soft hover:bg-pearl" onClick={() => set({ tips: d.tips.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
            </div>
            <TextArea aria-label="Consejo" rows={2} className="!px-0 !py-0 font-hand text-xl" value={t.body} onChange={(e) => set({ tips: d.tips.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} placeholder="Escribe el secreto…" />
          </div>
        ))}
        <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] font-medium text-sage-deep" onClick={() => set({ tips: [...d.tips, { key: uid(), type: 'consejo', body: '' }] })}><Plus size={18} /> Agregar consejo</button>
      </Section>
      <Section title="Equipo y conservación">
        <input aria-label="Equipo" value={d.equipment} onChange={(e) => set({ equipment: e.target.value })} placeholder="Olla de 5 L, molde de 24 cm, batidora" className="block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50" />
        <input aria-label="Conservación" value={d.storage_note} onChange={(e) => set({ storage_note: e.target.value })} placeholder="Refrigerada dura 3 días" className="block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50" />
      </Section>
      <section className="grid gap-2">
        <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Alérgenos</h2>
        <div className="flex flex-wrap gap-2 px-1">{ALLERGENS.map((a) => <Chip key={a} active={d.allergens.includes(a)} color="#F4DDD2" onClick={() => toggleAllergen(a)}>{a}</Chip>)}</div>
      </section>
    </>
  )
}

function StepPhoto({ d, set, userId }: StepProps & { userId: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const url = useSignedUrl(d.cover_path)

  async function pick(f: File | undefined) {
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      set({ cover_path: await uploadPhoto(await compressImage(f), userId) })
    } catch {
      setErr('No se pudo subir la foto. Inténtalo de nuevo.')
    }
    setBusy(false)
  }

  return (
    <>
      <p className="-mt-2 text-cocoa-soft">Una buena foto hace que den ganas de cocinarla. Puede ser del plato terminado.</p>
      <label className="group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-[24px] border border-dashed border-champagne bg-rose/40 transition-colors hover:bg-rose/60">
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {url ? (
          <img src={url} alt="Foto de la receta" className="size-full object-cover" />
        ) : (
          <span className="grid justify-items-center gap-2 text-cocoa-soft">
            <Camera size={28} aria-hidden="true" />
            {busy ? 'Subiendo…' : 'Tomar o elegir foto'}
          </span>
        )}
        {url && <span className="absolute bottom-3 right-3 rounded-full bg-ivory/90 px-3 py-1.5 text-sm shadow-soft">{busy ? 'Subiendo…' : 'Cambiar'}</span>}
      </label>
      {err && <p role="alert" className="text-sm text-[#9B3B3B]">{err}</p>}
    </>
  )
}

function StepReview({ d }: { d: Draft }) {
  const ing = d.groups.reduce((n, g) => n + g.items.filter((i) => i.name.trim()).length, 0)
  const steps = d.steps.filter((s) => s.body.trim()).length
  return (
    <>
      <Section>
        <Row label="Receta"><span className="text-cocoa">{d.title || '—'}</span></Row>
        <Row label="Rinde"><span className="text-cocoa">{d.servings_base} {d.servings_label}</span></Row>
        <Row label="Ingredientes"><span className="text-cocoa">{ing}</span></Row>
        <Row label="Pasos"><span className="text-cocoa">{steps}</span></Row>
        <Row label="Consejos"><span className="text-cocoa">{d.tips.filter((t) => t.body.trim()).length}</span></Row>
        <Row label="Foto"><span className="text-cocoa">{d.cover_path ? 'Lista' : 'Sin foto'}</span></Row>
      </Section>
      <p className="text-cocoa-soft">Al publicar, toda la familia recibirá el aviso de la nueva receta. Si aún no está lista, guárdala como borrador: solo tú la verás.</p>
    </>
  )
}
