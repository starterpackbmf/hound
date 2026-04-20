// Trading calculation utilities — espelho da lógica do Lovable monitoriapack.
// Regras Mandatórias: se UMA não for cumprida, trade é FORÇADO.
// Filtros de Qualidade: melhoram o score mas NÃO invalidam o trade.

export const OPERATIONAL_CONFIG = {
  TRM: {
    name: 'Trade de Retorno às Médias',
    mandatoryRules: [
      'Região de exaustão',
      'Mercado esticado',
      'Gatilho',
    ],
    optionalFilters: [
      'Mais de 3 candles sem tocar a ME9',
      'TRM a favor do movimento expansivo (macro)',
      'Confluência na exaustão',
    ],
  },
  FQ: {
    name: 'Falha e Quebra',
    mandatoryRules: [
      'Região de exaustão',
      'Falha de estrutura',
      'Gatilho',
    ],
    optionalFilters: [
      'Gatilho em região de Fibored',
      'Gatilho calçado pela ME9 do 2 minutos',
      'Mercado esticado',
      'Espaço gráfico',
    ],
  },
  TC: {
    name: 'Trade de Continuação',
    mandatoryRules: [
      'Estrutura clara de tendência',
      'Espaço gráfico',
      'Preço calçado no 5 minutos',
      'Gatilho',
    ],
    optionalFilters: [
      'A favor da tendência do 60 minutos',
      'A favor do movimento expansivo',
      'VWAP calçando o preço',
      'Pullback com confluência',
    ],
  },
  TA: {
    name: 'Trade de Abertura',
    mandatoryRules: [
      'Regiões de trava',
      'Dentro dos primeiros 15 minutos do dia',
    ],
    optionalFilters: [
      'Cálculo sem discrepâncias',
      'DIFUT confluindo',
      'Escora',
    ],
  },
}

// Score 70/30: todas mandatórias → base 70; filtros até +30.
// < 70 = FORÇADA; 70-79 ACEITÁVEL; 80-89 BOA; 90+ EXCELENTE.
export function calculateEntryQuality(selectedRules = [], selectedFilters = [], operational) {
  const config = OPERATIONAL_CONFIG[operational]
  if (!config) return { quality: 'FORÇADA', score: 0, followedPlan: false }

  const allMandatoryMet = config.mandatoryRules.every(r => selectedRules.includes(r))
  if (!allMandatoryMet) return { quality: 'FORÇADA', score: 0, followedPlan: false }

  const totalFilters = config.optionalFilters.length
  const selectedFilterCount = selectedFilters.filter(f => config.optionalFilters.includes(f)).length
  const filterRatio = totalFilters > 0 ? selectedFilterCount / totalFilters : 0
  const score = Math.round(70 + filterRatio * 30)

  let quality = 'ACEITÁVEL'
  if (score >= 90) quality = 'EXCELENTE'
  else if (score >= 80) quality = 'BOA'

  return { quality, score, followedPlan: score >= 70 }
}

// Map quality string → int 1-5 pro banco
export const QUALITY_TO_INT = { 'FORÇADA': 1, 'ACEITÁVEL': 3, 'BOA': 4, 'EXCELENTE': 5 }
export const INT_TO_QUALITY = { 1: 'FORÇADA', 2: 'FORÇADA', 3: 'ACEITÁVEL', 4: 'BOA', 5: 'EXCELENTE' }

export function qualityColor(quality) {
  return {
    'EXCELENTE': '#22c55e',
    'BOA': '#00d9ff',
    'ACEITÁVEL': '#f59e0b',
    'FORÇADA': '#ef4444',
  }[quality] || '#a1a1aa'
}

// Arredondamento por ativo: WIN sempre int, WDO step 0.5
export function roundPointsByAsset(points, asset) {
  if (asset === 'WIN') return Math.round(points)
  return Math.round(points * 2) / 2
}

// Multiplicador financeiro
export function assetMultiplier(asset) {
  if (asset === 'WIN') return 0.20
  if (asset === 'WDO') return 10
  return 1
}

// Média ponderada com arredondamento por ativo
export function calculateTotalPoints(partials = [], finalPoints = 0, initialContracts = 1, asset = 'WIN') {
  if (!initialContracts || initialContracts <= 0) return 0
  const partialsSum = partials.reduce((sum, p) => {
    const rp = roundPointsByAsset(Number(p.points ?? p.pts) || 0, asset)
    return sum + (Number(p.contracts ?? p.contratos) || 0) * rp
  }, 0)
  const used = partials.reduce((s, p) => s + (Number(p.contracts ?? p.contratos) || 0), 0)
  const remaining = initialContracts - used
  const rpFinal = roundPointsByAsset(Number(finalPoints) || 0, asset)
  const total = (partialsSum + remaining * rpFinal) / initialContracts
  return asset === 'WIN' ? Math.round(total) : Math.round(total * 2) / 2
}
