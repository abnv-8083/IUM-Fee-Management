import type {
  Anomaly,
  DashboardMetrics,
  DashboardPayload,
  Family,
  FeePlan,
  MonthlyForecast,
  Payment,
  PendingFeeItem,
  ReminderLog,
  RiskScore,
  Student,
} from '../types/index.js';
import { CURRENT_PERIOD, REFERENCE_TODAY } from '../types/index.js';
import { AnomalyModel, ReminderLogModel, toPlain } from '../models/index.js';
import {
  calculateFamilyRiskScore,
  detectAnomalies,
  generateCashFlowForecasts,
} from './intelligence.service.js';
import { loadCoreCollections } from './family.service.js';
import { listAuditLogs } from './audit.service.js';
import { getSettings } from './settings.service.js';

interface CoreCollections {
  families: Family[];
  students: Student[];
  feePlans: FeePlan[];
  payments: Payment[];
}

/** Computes a risk score for every family against the current collection set. */
export function getAllRiskScores(collections: CoreCollections): Record<string, RiskScore> {
  const { families, students, feePlans, payments } = collections;
  const allMonthlyFees = feePlans.map((fp) => fp.amount);
  const result: Record<string, RiskScore> = {};

  families.forEach((f) => {
    result[f.id] = calculateFamilyRiskScore(f, students, feePlans, payments, allMonthlyFees);
  });

  return result;
}

/**
 * Builds the outstanding-fee work list for the current billing period,
 * sorted with the highest risk accounts first.
 */
export function getPendingFeeItems(
  collections: CoreCollections,
  riskScores: Record<string, RiskScore>
): PendingFeeItem[] {
  const { families, students, feePlans, payments } = collections;
  const pendingItems: PendingFeeItem[] = [];

  const { month: currentMonth, year: currentYear, due_date: dueDateStr } = CURRENT_PERIOD;
  const dueDate = new Date(dueDateStr);
  const daysOverdue = Math.max(
    0,
    Math.round((new Date(REFERENCE_TODAY).getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
  );

  families
    .filter((f) => f.status === 'active')
    .forEach((f) => {
      const plan = feePlans.find((fp) => fp.family_id === f.id);
      const monthlyFee = plan ? plan.amount : 350;

      const paidRecord = payments.find(
        (p) =>
          p.family_id === f.id &&
          p.year === currentYear &&
          p.month === currentMonth &&
          p.status === 'paid'
      );
      const partialRecord = payments.find(
        (p) =>
          p.family_id === f.id &&
          p.year === currentYear &&
          p.month === currentMonth &&
          p.status === 'partial'
      );

      if (paidRecord) return;

      const familyStudents = students.filter(
        (s) => s.family_id === f.id && s.status === 'active'
      );
      const familyPayments = payments.filter((p) => p.family_id === f.id && p.status === 'paid');
      const lastPayment =
        familyPayments.length > 0
          ? [...familyPayments].sort(
              (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            )[0]
          : undefined;

      const risk = riskScores[f.id];

      let suggestedDiscountTier: string | undefined;
      if (familyStudents.length >= 3) {
        suggestedDiscountTier = 'Sibling Tier 3: 15% Multi-child Package';
      } else if (familyStudents.length === 2) {
        suggestedDiscountTier = 'Sibling Tier 2: 10% Sibling Relief';
      } else if (risk && risk.trust_score >= 85) {
        suggestedDiscountTier = 'Loyalty Star: 5% Advance Prepay Waiver';
      }

      const balance = partialRecord ? monthlyFee - partialRecord.amount : monthlyFee;

      pendingItems.push({
        family: f,
        students: familyStudents,
        monthly_fee: balance,
        month: currentMonth,
        year: currentYear,
        due_date: dueDateStr,
        days_overdue: daysOverdue,
        risk_score: risk,
        last_payment_date: lastPayment?.payment_date,
        suggested_discount_tier: suggestedDiscountTier,
      });
    });

  pendingItems.sort((a, b) => (b.risk_score?.score || 0) - (a.risk_score?.score || 0));
  return pendingItems;
}

/**
 * Merges persisted anomaly review decisions with freshly detected anomalies.
 * Persisted records win so a resolved/dismissed item never reappears as pending.
 */
export async function resolveAnomalyList(
  collections: CoreCollections
): Promise<Anomaly[]> {
  const { payments, feePlans, families } = collections;

  const [dynamicAnomalies, storedAnomalies] = await Promise.all([
    Promise.resolve(detectAnomalies(payments, feePlans, families)),
    AnomalyModel.find().lean(),
  ]);

  const anomalyMap = new Map<string, Anomaly>();
  toPlain<Anomaly[]>(storedAnomalies).forEach((a) => anomalyMap.set(a.id, a));
  dynamicAnomalies.forEach((a) => {
    if (!anomalyMap.has(a.id)) {
      anomalyMap.set(a.id, a);
    }
  });

  return Array.from(anomalyMap.values());
}

/** Assembles the single payload the React client loads on boot. */
export async function getFullDashboardPayload(): Promise<DashboardPayload> {
  const collections = await loadCoreCollections();
  const { families, students, feePlans, payments } = collections;

  const riskScores = getAllRiskScores(collections);
  const pendingItems = getPendingFeeItems(collections, riskScores);
  const forecasts: MonthlyForecast[] = generateCashFlowForecasts(
    families,
    feePlans,
    payments,
    riskScores
  );
  const allAnomalies = await resolveAnomalyList(collections);

  // Summary metrics
  const activeFamiliesCount = families.filter((f) => f.status === 'active').length;
  const activeStudentsCount = students.filter((s) => s.status === 'active').length;

  const currentMonthPayments = payments.filter(
    (p) => p.year === CURRENT_PERIOD.year && p.month === CURRENT_PERIOD.month && p.status !== 'void'
  );
  const collectedThisMonth = currentMonthPayments.reduce((acc, p) => acc + p.amount, 0);
  const pendingThisMonth = pendingItems.reduce((acc, item) => acc + item.monthly_fee, 0);

  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let trustedPayersCount = 0;
  let totalDelayDays = 0;
  let delayCount = 0;

  Object.values(riskScores).forEach((r) => {
    if (r.tier === 'high') highRiskCount++;
    else if (r.tier === 'medium') mediumRiskCount++;
    else lowRiskCount++;

    if (r.is_trusted_payer) trustedPayersCount++;
    if (r.average_delay_days > 0) {
      totalDelayDays += r.average_delay_days;
      delayCount++;
    }
  });

  const nextMonthKey = `${CURRENT_PERIOD.year}-${String(CURRENT_PERIOD.month + 1).padStart(2, '0')}`;
  const nextMonthForecast =
    forecasts.find((f) => f.month_key === nextMonthKey)?.forecast_baseline || 0;

  const metrics: DashboardMetrics = {
    total_families: activeFamiliesCount,
    active_students: activeStudentsCount,
    collected_this_month: collectedThisMonth,
    pending_this_month: pendingThisMonth,
    high_risk_count: highRiskCount,
    medium_risk_count: mediumRiskCount,
    low_risk_count: lowRiskCount,
    trusted_payers_count: trustedPayersCount,
    pending_anomalies_count: allAnomalies.filter((a) => a.status === 'pending_review').length,
    forecast_next_month: nextMonthForecast,
    average_delay_days: delayCount > 0 ? Math.round(totalDelayDays / delayCount) : 0,
  };

  const [auditLogs, reminders, settings] = await Promise.all([
    listAuditLogs(500),
    ReminderLogModel.find().sort({ sent_at: -1 }).lean(),
    getSettings(),
  ]);

  return {
    metrics,
    families: families.map((f) => ({
      ...f,
      students: students.filter((s) => s.family_id === f.id),
      fee_plan: feePlans.find((fp) => fp.family_id === f.id),
      risk: riskScores[f.id],
    })),
    students,
    feePlans,
    payments,
    recentPayments: payments,
    pendingItems,
    forecasts,
    anomalies: allAnomalies,
    reminders: toPlain<ReminderLog[]>(reminders),
    auditLogs,
    settings,
  } as DashboardPayload;
}
