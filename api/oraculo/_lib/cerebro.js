// Parser do cérebro do TSS (port de cerebro.ts → JS).
// Pure function, zero deps — pode ser importado server-side.

const { readFileSync } = require('node:fs')
const path = require('node:path')

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim()
}

function parseCerebro(raw) {
  const blocks = {}
  for (const b of raw.blocks) {
    blocks[b.id] = {
      id: b.id,
      title: stripHtml(b.title || ''),
      color: b.color || '',
      x: b.x || 0,
      y: b.y || 0,
      w: b.w || 0,
      h: b.h || 0,
    }
  }

  const parentOf = {}
  const childrenOf = {}
  for (const id of Object.keys(blocks)) childrenOf[id] = []

  for (const e of raw.edges || []) {
    const fromId = e.from.id
    const toId = e.to.id
    if (!blocks[fromId] || !blocks[toId]) continue
    const backward = e.collapseDir === 'backward'
    const parent = backward ? toId : fromId
    const child = backward ? fromId : toId
    if (parentOf[child] === undefined) {
      parentOf[child] = parent
      childrenOf[parent].push(child)
    }
  }

  const orphans = Object.keys(blocks).filter(id => parentOf[id] === undefined)
  if (orphans.length === 0) {
    throw new Error('Cérebro sem raiz: nenhum bloco órfão encontrado.')
  }
  const rootId = orphans[0]
  const topicRootIds = childrenOf[rootId] || []

  function pathIds(blockId) {
    const chain = []
    let cur = blockId
    while (cur !== undefined) {
      chain.push(cur)
      cur = parentOf[cur]
    }
    chain.reverse()
    return chain
  }

  function pathLabels(blockId, skipRoot = true) {
    const ids = pathIds(blockId)
    const sliced = skipRoot ? ids.slice(1) : ids
    return sliced.map(id => blocks[id]?.title).filter(Boolean)
  }

  function descendantsOf(blockId) {
    const result = new Set()
    const stack = [blockId]
    while (stack.length > 0) {
      const cur = stack.pop()
      for (const ch of childrenOf[cur] || []) {
        if (!result.has(ch)) {
          result.add(ch)
          stack.push(ch)
        }
      }
    }
    return result
  }

  function topicRootOf(blockId) {
    if (blockId === rootId) return null
    const ids = pathIds(blockId)
    return ids[1] ?? null
  }

  return {
    blocks, parentOf, childrenOf, rootId, topicRootIds,
    pathIds, pathLabels, descendantsOf, topicRootOf,
  }
}

function formatThemePath(path) {
  return (path || []).join(' → ')
}

let cachedCerebro = null
function getCerebro() {
  if (cachedCerebro) return cachedCerebro
  const filePath = path.join(__dirname, '..', '_data', 'cerebro.json')
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
  cachedCerebro = parseCerebro(raw)
  return cachedCerebro
}

module.exports = { parseCerebro, formatThemePath, getCerebro }
