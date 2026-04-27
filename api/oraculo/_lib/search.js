// BM25 + re-ranking por priority de fonte (port de search.ts → JS).
// Singleton: carrega chunks + constrói índice 1x por processo.

const { readFileSync } = require('node:fs')
const path = require('node:path')
const { formatThemePath } = require('./cerebro')

const STOPWORDS = new Set([
  'a','o','as','os','um','uma','uns','umas',
  'de','da','do','das','dos',
  'em','na','no','nas','nos',
  'para','por','pelo','pela','pelos','pelas',
  'com','sem','sob','sobre',
  'que','e','ou','mas','se',
  'ser','estar','ter','haver',
  'eu','tu','ele','ela','nos','vos','eles','elas',
  'meu','teu','seu','nosso','vosso',
  'isso','isto','aquilo','este','esta','esse','essa','aquele','aquela',
  'como','quando','onde','porque','quem','qual',
  'ja','muito','mais','menos','tambem','so','la',
])

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

function buildDisplayLabel(chunk) {
  const theme = chunk.themes?.[0]
  if (theme && theme.path?.length > 0) return formatThemePath(theme.path)
  const cleaned = String(chunk.title || '')
    .replace(/\s*\(trecho[^)]*\)\s*$/i, '')
    .replace(/\s*—\s*slide\s+\d+\s*$/i, '')
    .replace(/\s*\d+\/\d+\s*$/i, '')
    .trim()
  return cleaned || chunk.title || chunk.citation_label || ''
}

const K1 = 1.2
const B = 0.75
const PRIORITY_BOOST = { mapa: 1.2, vault: 1.1, slide: 1.0, transcricao: 0.95 }

class BM25Index {
  constructor(chunks) {
    this.chunks = chunks
    this.docs = chunks.map(c => tokenize(`${c.title || ''} ${c.content || ''}`))

    const df = new Map()
    for (const tokens of this.docs) {
      const unique = new Set(tokens)
      for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1)
    }

    const N = chunks.length
    this.idf = new Map()
    for (const [t, freq] of df) {
      this.idf.set(t, Math.log(1 + (N - freq + 0.5) / (freq + 0.5)))
    }
    this.avgdl = this.docs.reduce((a, d) => a + d.length, 0) / (N || 1)
  }

  search(query, options = {}) {
    const { topK = 8, moduleFilter = null, strategyFilter = null } = options
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []
    const uniqueQueryTokens = new Set(queryTokens)

    const results = []
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]
      if (moduleFilter && chunk.module !== moduleFilter) continue
      if (strategyFilter && chunk.strategy !== strategyFilter) continue

      const doc = this.docs[i]
      const dl = doc.length
      if (dl === 0) continue

      const tf = new Map()
      for (const tok of doc) {
        if (uniqueQueryTokens.has(tok)) tf.set(tok, (tf.get(tok) ?? 0) + 1)
      }
      if (tf.size === 0) continue

      let score = 0
      for (const qt of uniqueQueryTokens) {
        const tfVal = tf.get(qt) ?? 0
        if (tfVal === 0) continue
        const idfVal = this.idf.get(qt) ?? 0
        score += idfVal * (tfVal * (K1 + 1)) / (tfVal + K1 * (1 - B + (B * dl) / this.avgdl))
      }
      score *= PRIORITY_BOOST[chunk.source_type] ?? 1.0
      if (score > 0) results.push({ idx: i, score })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK).map(r => ({
      chunk: this.chunks[r.idx],
      score: r.score,
      displayLabel: buildDisplayLabel(this.chunks[r.idx]),
    }))
  }
}

let cachedIndex = null
let cachedChunks = null

function loadChunks() {
  if (cachedChunks) return cachedChunks
  const filePath = path.join(__dirname, '..', '_data', 'chunks.json')
  cachedChunks = JSON.parse(readFileSync(filePath, 'utf-8'))
  return cachedChunks
}

function getIndex() {
  if (cachedIndex) return cachedIndex
  cachedIndex = new BM25Index(loadChunks())
  return cachedIndex
}

function search(query, options) {
  return getIndex().search(query, options)
}

module.exports = { search, tokenize, buildDisplayLabel, formatThemePath }
