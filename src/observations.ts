export type Viewpoint = { yaw: number; pitch: number; zoom: number; title: string; note: string }
export type Observation = Viewpoint & { id: string }
export const OBSERVATIONS_KEY = 'karnala-field-notebook-v1'

export function createObservation(camera: { yaw: number; pitch: number; zoom: number }, title: string, note: string, id: string): Observation {
  if (!Number.isFinite(camera.yaw) || Math.abs(camera.yaw) > Math.PI * 2 || !Number.isFinite(camera.pitch) || Math.abs(camera.pitch) > Math.PI / 2 || !Number.isFinite(camera.zoom) || camera.zoom < 0 || camera.zoom > 100) throw new Error('Invalid camera position')
  if (typeof title !== 'string' || !title.trim() || title.length > 80 || typeof note !== 'string' || note.length > 2000 || typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw new Error('Use a title up to 80 characters and a note up to 2,000 characters.')
  return { id, yaw:camera.yaw, pitch:camera.pitch, zoom:camera.zoom, title: title.trim(), note }
}

export function parseNotebook(raw: string): Observation[] {
  if (raw.length > 1024 * 1024) throw new Error('Notebook files must be under 1 MB.')
  const value = JSON.parse(raw)
  if (!value || value.version !== 1 || !Array.isArray(value.observations) || value.observations.length > 100) throw new Error('Use a version 1 notebook with up to 100 observations.')
  const ids = new Set<string>()
  return value.observations.map((item: Observation) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid observation.')
    const observation = createObservation(item, item.title, item.note, item.id)
    if (ids.has(item.id)) throw new Error('Duplicate observation ID.')
    ids.add(item.id)
    return observation
  })
}
export function serializeNotebook(observations: Observation[]): string {
  const raw = JSON.stringify({version:1,observations},null,2)
  parseNotebook(raw)
  return raw
}
export function readObservations(raw: string | null): Observation[] {
  try { return parseNotebook(raw || '{}') } catch { return [] }
}
export function mergeNotebook(current: Observation[], incoming: Observation[]): Observation[] {
  const ids=new Set(current.map(item=>item.id))
  const next=[...current,...incoming.filter(item=>!ids.has(item.id))]
  parseNotebook(serializeNotebook(next))
  return next
}
export function updateObservation(current: Observation[], id: string, title: string, note: string): Observation[] {
  const existing=current.find(item=>item.id===id)
  if (!existing) throw new Error('This observation no longer exists.')
  const updated=createObservation(existing,title,note,id)
  return current.map(item=>item.id===id ? updated : item)
}
export function deleteObservation(current: Observation[], id: string): Observation[] {
  if (!current.some(item=>item.id===id)) throw new Error('This observation no longer exists.')
  return current.filter(item=>item.id!==id)
}
export function undoObservation(current: Observation[], deleted: Observation, index: number): Observation[] {
  if(current.some(item=>item.id===deleted.id)) throw new Error('A newer observation already uses this ID.')
  const next=[...current];next.splice(Math.max(0,Math.min(index,next.length)),0,deleted)
  parseNotebook(serializeNotebook(next))
  return next
}

export function encodeViewpoint(view: Viewpoint): string {
  createObservation(view, view.title, view.note, 'shared')
  return '#' + new URLSearchParams({ view: '1', yaw: String(view.yaw), pitch: String(view.pitch), zoom: String(view.zoom), title: view.title, note: view.note }).toString()
}

export function decodeViewpoint(hash: string): Viewpoint | null {
  try {
    const query = new URLSearchParams(hash.replace(/^#/, ''))
    if (query.get('view') !== '1' || !['yaw', 'pitch', 'zoom'].every(key => query.has(key) && query.get(key)?.trim())) return null
    const { id: _id, ...view } = createObservation({ yaw: Number(query.get('yaw')), pitch: Number(query.get('pitch')), zoom: Number(query.get('zoom')) }, query.get('title') || 'Shared viewpoint', query.get('note') || '', 'shared')
    return view
  } catch { return null }
}

export function persistObservations(storage: Pick<Storage, 'getItem' | 'setItem'>, observations: Observation[]): boolean {
  const validated = serializeNotebook(observations)
  const previous = storage.getItem(OBSERVATIONS_KEY)
  let recovered = false
  if (previous) {
    let valid = false
    try {
      parseNotebook(previous)
      valid = true
    } catch { /* Preserve malformed data before writing a replacement. */ }
    if (!valid) {
      storage.setItem(OBSERVATIONS_KEY + '.recovery.' + crypto.randomUUID(), previous)
      recovered = true
    }
  }
  storage.setItem(OBSERVATIONS_KEY, validated)
  return recovered
}

export function clearNotebook(storage: Pick<Storage,'length'|'key'|'getItem'|'removeItem'>): {complete:boolean;remaining:string[]} {
  const keys:string[]=[]
  try {for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key && (key===OBSERVATIONS_KEY || key.startsWith(OBSERVATIONS_KEY+'.recovery.')))keys.push(key)}}
  catch {return {complete:false,remaining:[OBSERVATIONS_KEY]}}
  const remaining:string[]=[]
  for(const key of keys){try {storage.removeItem(key);if(storage.getItem(key)!==null)remaining.push(key)}catch{remaining.push(key)}}
  return {complete:remaining.length===0,remaining}
}
