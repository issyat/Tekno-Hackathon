import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = resolve(process.cwd(), 'public/data/merged_ev_stations.json')

const raw = readFileSync(target, 'utf8')
const data = JSON.parse(raw)

const seen = new Map()
const deduped = []
let skipped = 0

for (const entry of data) {
  const lat = toNumber(entry.latitude ?? entry.lat)
  const lng = toNumber(entry.longitude ?? entry.lng ?? entry.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    skipped += 1
    continue
  }
  const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`
  if (seen.has(key)) {
    continue
  }
  seen.set(key, true)
  deduped.push(entry)
}

writeFileSync(target, JSON.stringify(deduped, null, 2))

console.log(`Original: ${data.length}`)
console.log(`Deduped: ${deduped.length}`)
console.log(`Removed: ${data.length - deduped.length}`)
if (skipped) {
  console.log(`Skipped (missing coords): ${skipped}`)
}

function toNumber(val) {
  if (val == null) return undefined
  const n = typeof val === 'string' ? parseFloat(val) : Number(val)
  return Number.isFinite(n) ? n : undefined
}
