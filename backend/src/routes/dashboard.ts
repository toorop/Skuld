import { Hono } from 'hono'
import { URSSAF_THRESHOLDS, URSSAF_WARNING_PERCENT } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'

const dashboard = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// GET /api/dashboard/urssaf — Totaux par catégorie fiscale + période
dashboard.get('/urssaf', async (c) => {
  const supabase = c.get('supabase')
  const query = c.req.query()

  // Période demandée (par défaut : mois courant)
  const now = new Date()
  const year = parseInt(query.year ?? String(now.getFullYear()), 10)
  const month = parseInt(query.month ?? String(now.getMonth() + 1), 10)
  const quarterly = query.quarterly === 'true'

  let startDate: string
  let endDate: string

  if (quarterly) {
    // Trimestre : Q1=jan-mar, Q2=avr-jun, Q3=jul-sep, Q4=oct-dec
    const quarter = Math.ceil(month / 3)
    const startMonth = (quarter - 1) * 3 + 1
    startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`
    const endMonth = startMonth + 2
    const lastDay = new Date(year, endMonth, 0).getDate()
    endDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`
  } else {
    startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  }

  // Totaux de la période (encaissements uniquement)
  const { data: periodData, error: periodError } = await supabase
    .from('transactions')
    .select('fiscal_category, amount')
    .eq('direction', 'INCOME')
    .gte('date', startDate)
    .lte('date', endDate)

  if (periodError) {
    return errors.internal(c, `Erreur : ${periodError.message}`)
  }

  // Totaux annuels cumulés (pour les alertes de seuil)
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data: yearData, error: yearError } = await supabase
    .from('transactions')
    .select('fiscal_category, amount')
    .eq('direction', 'INCOME')
    .gte('date', yearStart)
    .lte('date', yearEnd)

  if (yearError) {
    return errors.internal(c, `Erreur : ${yearError.message}`)
  }

  // Agréger les montants
  const periodTotals = aggregate(periodData ?? [])
  const yearTotals = aggregate(yearData ?? [])

  // Alertes de seuil
  const alerts = []
  for (const [category, threshold] of Object.entries(URSSAF_THRESHOLDS) as [string, number][]) {
    const yearlyAmount = yearTotals[category] ?? 0
    const percent = (yearlyAmount / threshold) * 100
    if (percent >= URSSAF_WARNING_PERCENT) {
      alerts.push({
        category,
        threshold,
        current: yearlyAmount,
        percent: Math.round(percent),
        exceeded: percent >= 100,
      })
    }
  }

  return success(c, {
    period: quarterly
      ? `T${Math.ceil(month / 3)} ${year}`
      : `${String(month).padStart(2, '0')}/${year}`,
    startDate,
    endDate,
    bicVente: periodTotals.BIC_VENTE ?? 0,
    bicPresta: periodTotals.BIC_PRESTA ?? 0,
    bnc: periodTotals.BNC ?? 0,
    yearlyBicVente: yearTotals.BIC_VENTE ?? 0,
    yearlyBicPresta: yearTotals.BIC_PRESTA ?? 0,
    yearlyBnc: yearTotals.BNC ?? 0,
    alerts,
  })
})

// GET /api/dashboard/urssaf/export — Export CSV
dashboard.get('/urssaf/export', async (c) => {
  const supabase = c.get('supabase')
  const query = c.req.query()

  const startDate = query.start_date
  const endDate = query.end_date

  if (!startDate || !endDate) {
    return errors.validation(c, { dates: 'Les paramètres start_date et end_date sont requis' })
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('date, label, direction, amount, fiscal_category, payment_method, notes')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) {
    return errors.internal(c, `Erreur : ${error.message}`)
  }

  // Générer le CSV
  const header = 'Date;Libellé;Direction;Montant;Catégorie fiscale;Moyen de paiement;Notes'
  const rows = (data ?? []).map((tx) =>
    [
      tx.date,
      `"${(tx.label ?? '').replace(/"/g, '""')}"`,
      tx.direction === 'INCOME' ? 'Recette' : 'Dépense',
      String(tx.amount).replace('.', ','),
      tx.fiscal_category ?? '',
      tx.payment_method ?? '',
      `"${(tx.notes ?? '').replace(/"/g, '""')}"`,
    ].join(';'),
  )

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="skuld-export-${startDate}-${endDate}.csv"`,
    },
  })
})

/** Agrège les montants par catégorie fiscale */
function aggregate(
  rows: Array<{ fiscal_category: string | null; amount: number }>,
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const row of rows) {
    if (row.fiscal_category) {
      totals[row.fiscal_category] = (totals[row.fiscal_category] ?? 0) + Number(row.amount)
    }
  }
  return totals
}

export { dashboard }
