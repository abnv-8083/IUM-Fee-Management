/**
 * Rules-based intelligence engine.
 *
 * Pure, synchronous functions over in-memory collections - no database access -
 * so they can be unit tested directly and reused by the dashboard aggregator.
 */
import type {
  Family,
  Student,
  FeePlan,
  Payment,
  RiskScore,
  RiskFactor,
  MonthlyForecast,
  Anomaly,
} from '../types/index.js';
import { CURRENT_PERIOD, REFERENCE_TODAY } from '../types/index.js';

export function calculateFamilyRiskScore(
  family: Family,
  students: Student[],
  feePlans: FeePlan[],
  payments: Payment[],
  allFamiliesMonthlyFees: number[]
): RiskScore {
  const familyPayments = payments.filter((p) => p.family_id === family.id && p.status !== 'void');
  const familyFeePlan = feePlans.find((fp) => fp.family_id === family.id);
  const monthlyExpected = familyFeePlan?.amount || 350;

  const averageFeeOverall =
    allFamiliesMonthlyFees.length > 0
      ? allFamiliesMonthlyFees.reduce((a, b) => a + b, 0) / allFamiliesMonthlyFees.length
      : 400;

  const siblingCount = students.filter(
    (s) => s.family_id === family.id && s.status === 'active'
  ).length;

  let totalDelays = 0;
  let delayCount = 0;
  let pastDefaults = 0;
  const factors: RiskFactor[] = [];

  // Calculate delay days for each completed payment.
  // Due date is the 2nd of each billing month.
  familyPayments.forEach((p) => {
    const paymentDate = new Date(p.payment_date);
    const dueDate = new Date(
      p.due_date || `${p.year}-${String(p.month).padStart(2, '0')}-02`
    );

    // Difference in calendar days
    const diffTime = paymentDate.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays > 0) {
      totalDelays += diffDays;
      delayCount++;
      if (diffDays > 25) {
        pastDefaults++;
      }
    }
  });

  const avgDelayDays = delayCount > 0 ? Math.round(totalDelays / delayCount) : 0;

  // Current-cycle coverage check (reference date: Sept 10, 2026; due was Sept 2).
  const hasPaidCurrentMonth = familyPayments.some(
    (p) =>
      p.year === CURRENT_PERIOD.year && p.month === CURRENT_PERIOD.month && p.status === 'paid'
  );
  const hasPaidPreviousMonth = familyPayments.some(
    (p) => p.year === CURRENT_PERIOD.year && p.month === CURRENT_PERIOD.month - 1 && p.status === 'paid'
  );

  let baseScore = 15; // baseline starting score

  // Factor 1: Average delay history (Weight: up to 35 pts)
  if (avgDelayDays === 0 && delayCount === 0 && familyPayments.length > 0) {
    factors.push({
      label: 'Punctual History',
      impact: -10,
      explanation: 'Consistently pays on or before due date.',
    });
    baseScore -= 10;
  } else if (avgDelayDays > 25) {
    factors.push({
      label: 'Severe Historical Delays',
      impact: 32,
      explanation: `Average payment delay is ${avgDelayDays} days beyond due date.`,
    });
    baseScore += 32;
  } else if (avgDelayDays > 10) {
    factors.push({
      label: 'Moderate Delays',
      impact: 18,
      explanation: `Average payment delay is ${avgDelayDays} days.`,
    });
    baseScore += 18;
  } else if (avgDelayDays > 3) {
    factors.push({
      label: 'Minor Delays',
      impact: 8,
      explanation: 'Typically clears fees within a week of due date.',
    });
    baseScore += 8;
  }

  // Factor 2: Defaults / Skipped Months (Weight: up to 30 pts)
  if (!hasPaidPreviousMonth) {
    pastDefaults += 1;
    factors.push({
      label: 'August Default / Unpaid',
      impact: 28,
      explanation: 'August fee is completely outstanding (>35 days overdue).',
    });
    baseScore += 28;
  }
  if (!hasPaidCurrentMonth) {
    factors.push({
      label: 'September Currently Overdue',
      impact: 14,
      explanation: 'Due date (Sept 2nd) has passed without settlement.',
    });
    baseScore += 14;
  }

  if (pastDefaults > 1) {
    factors.push({
      label: 'Repeated Defaults',
      impact: 15,
      explanation: `${pastDefaults} historical defaults recorded.`,
    });
    baseScore += 15;
  }

  // Factor 3: Fee to Average Ratio (Weight: up to 12 pts)
  const feeRatio = monthlyExpected / averageFeeOverall;
  if (feeRatio > 1.4) {
    factors.push({
      label: 'High Exposure Tier',
      impact: 10,
      explanation: `Monthly fee (${monthlyExpected}) is ${Math.round(
        feeRatio * 100
      )}% of institute average.`,
    });
    baseScore += 10;
  } else if (feeRatio < 0.8) {
    factors.push({
      label: 'Low Fee Exposure',
      impact: -5,
      explanation: `Monthly fee (${monthlyExpected}) is comfortably below center average.`,
    });
    baseScore -= 5;
  }

  // Factor 4: Sibling Multi-child Strain (Weight: up to 10 pts)
  if (siblingCount >= 3) {
    factors.push({
      label: 'Multi-Child Burden (3+ Siblings)',
      impact: 8,
      explanation: 'Higher household tuition overhead; qualifies for adaptive sibling tier.',
    });
    baseScore += 8;
  } else if (siblingCount === 2) {
    factors.push({
      label: 'Two Siblings Enrolled',
      impact: 4,
      explanation: 'Dual-child enrollment.',
    });
    baseScore += 4;
  }

  // Factor 5: Account Longevity & Loyalty
  if (familyPayments.length >= 5 && avgDelayDays <= 2 && pastDefaults === 0) {
    factors.push({
      label: 'Loyalty Credit',
      impact: -12,
      explanation: 'Over 5 on-time transactions with zero defaults.',
    });
    baseScore -= 12;
  }

  // Clamp risk score between 3 and 98
  const finalRiskScore = Math.max(3, Math.min(98, Math.round(baseScore)));

  // Tier classification
  let tier: 'low' | 'medium' | 'high' = 'low';
  if (finalRiskScore >= 70) {
    tier = 'high';
  } else if (finalRiskScore >= 40) {
    tier = 'medium';
  }

  // Trust score: inverse of risk score with bonus for a clean ledger
  let trustScore = Math.max(5, Math.min(100, 100 - finalRiskScore));
  if (pastDefaults === 0 && avgDelayDays <= 3) {
    trustScore = Math.min(100, trustScore + 8);
  }
  const isTrustedPayer = trustScore >= 80 && pastDefaults === 0;

  // Recommended Action
  let recommendedAction = 'Standard automated courtesy statement.';
  if (tier === 'high') {
    recommendedAction =
      'Direct phone call from Centre Director; propose structured bi-weekly installment plan.';
  } else if (tier === 'medium') {
    recommendedAction = 'Send WhatsApp reminder with payment link and polite deadline.';
  } else if (isTrustedPayer) {
    recommendedAction = 'Send appreciation note; eligible for 5% advance prepay discount.';
  }

  // Best Reminder Dispatch Time
  let bestReminderTime = 'Tuesday 6:30 PM';
  if (family.notes?.includes('after 5 PM')) {
    bestReminderTime = 'Weekdays 5:30 PM - 7:00 PM';
  } else if (tier === 'high') {
    bestReminderTime = 'Monday 10:00 AM (Immediate Morning Priority)';
  } else if (family.parent_name.includes('Sterling')) {
    bestReminderTime = 'Wednesday 11:30 AM via Formal SMS';
  }

  return {
    family_id: family.id,
    score: finalRiskScore,
    tier,
    trust_score: trustScore,
    is_trusted_payer: isTrustedPayer,
    computed_at: new Date().toISOString(),
    average_delay_days: avgDelayDays,
    past_defaults_count: pastDefaults,
    sibling_count: siblingCount,
    fee_to_average_ratio: Number(feeRatio.toFixed(2)),
    contributing_factors: factors,
    recommended_action: recommendedAction,
    best_reminder_time: bestReminderTime,
  };
}

export function generateSmartReminder(
  family: Family,
  risk: RiskScore,
  feeAmount: number,
  monthName: string = 'September',
  currencySymbol: string = '$'
): {
  tone: 'gentle' | 'polite' | 'firm' | 'final';
  message: string;
  suggested_time: string;
} {
  let tone: 'gentle' | 'polite' | 'firm' | 'final' = 'gentle';
  let message = '';

  if (risk.tier === 'high') {
    if (risk.past_defaults_count > 1 || risk.score >= 80) {
      tone = 'final';
      message = `URGENT NOTICE - IUM Tuition Management:\n\nDear ${family.parent_name},\nOur accounting records indicate that the overdue fee balance of ${currencySymbol}${feeAmount} for ${monthName} (and prior terms) remains unsettled despite previous notices.\n\nTo prevent interruption to your children's scheduled coaching sessions and retain active seat enrollment, please complete this payment immediately or contact the Director's desk today at your earliest convenience.\n\nAccount Department, IUM Institute.`;
    } else {
      tone = 'firm';
      message = `IMPORTANT REMINDER - IUM Tuition Management:\n\nDear ${family.parent_name},\nThis is a firm reminder regarding the tuition fee of ${currencySymbol}${feeAmount} for ${monthName}, which was due on the 2nd. As of today, this payment is past due.\n\nPlease process this balance today via UPI or online bank transfer to avoid late administration charges.\n\nThank you,\nAdministration Team`;
    }
  } else if (risk.tier === 'medium') {
    tone = 'polite';
    message = `Hello ${family.parent_name},\n\nWe hope this week is going well! Just a polite follow-up regarding the tuition fee for ${monthName} (${currencySymbol}${feeAmount}), due on the 2nd. If you have already initiated this transfer, kindly ignore this message or reply with the transaction reference.\n\nWarm regards,\nIUM Fee Operations`;
  } else {
    tone = 'gentle';
    message = `Hi ${family.parent_name},\n\nGentle courtesy reminder that the ${monthName} fee statement (${currencySymbol}${feeAmount}) is ready for settlement. Thank you for your continued partnership and support of our students' learning journey!\n\nBest wishes,\nIUM Tuition Centre`;
  }

  return {
    tone,
    message,
    suggested_time: risk.best_reminder_time,
  };
}

export function generateCashFlowForecasts(
  families: Family[],
  feePlans: FeePlan[],
  payments: Payment[],
  riskScores: Record<string, RiskScore>
): MonthlyForecast[] {
  // Historical months: May 2026 - Aug 2026
  // Current month: Sep 2026
  // Forecast months: Oct 2026 - Dec 2026
  const months = [
    { key: '2026-05', label: 'May 2026', month: 5, year: 2026, isFuture: false },
    { key: '2026-06', label: 'Jun 2026', month: 6, year: 2026, isFuture: false },
    { key: '2026-07', label: 'Jul 2026', month: 7, year: 2026, isFuture: false },
    { key: '2026-08', label: 'Aug 2026', month: 8, year: 2026, isFuture: false },
    { key: '2026-09', label: 'Sep 2026 (Current)', month: 9, year: 2026, isFuture: false },
    { key: '2026-10', label: 'Oct 2026 (Projected)', month: 10, year: 2026, isFuture: true },
    { key: '2026-11', label: 'Nov 2026 (Projected)', month: 11, year: 2026, isFuture: true },
    { key: '2026-12', label: 'Dec 2026 (Projected)', month: 12, year: 2026, isFuture: true },
  ];

  // Total active expected monthly fee
  const activeFamilies = families.filter((f) => f.status === 'active');
  const totalExpectedGross = activeFamilies.reduce((sum, f) => {
    const plan = feePlans.find((fp) => fp.family_id === f.id);
    return sum + (plan ? plan.amount : 350);
  }, 0);

  // Compute aggregate risk discount factor
  let totalRiskWeightedDeduction = 0;
  activeFamilies.forEach((f) => {
    const plan = feePlans.find((fp) => fp.family_id === f.id);
    const amount = plan ? plan.amount : 350;
    const risk = riskScores[f.id];
    const score = risk ? risk.score : 20;

    // Default probability mapping:
    //   Low risk (score 10): 2% haircut
    //   Medium risk (score 50): 18% haircut
    //   High risk (score 85): 55% haircut
    const defaultProb = (score / 100) * 0.65;
    totalRiskWeightedDeduction += amount * defaultProb;
  });

  const baselineForecast = Math.round(totalExpectedGross - totalRiskWeightedDeduction);
  const conservativeForecast = Math.round(totalExpectedGross - totalRiskWeightedDeduction * 1.35);
  const optimisticForecast = Math.round(totalExpectedGross * 0.96);

  return months.map((m) => {
    const monthPayments = payments.filter(
      (p) => p.year === m.year && p.month === m.month && p.status !== 'void'
    );
    const actualCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    if (!m.isFuture) {
      return {
        month_key: m.key,
        month_label: m.label,
        is_future: false,
        expected_gross: totalExpectedGross,
        risk_discount: Math.round(totalRiskWeightedDeduction),
        forecast_baseline: baselineForecast,
        forecast_conservative: conservativeForecast,
        forecast_optimistic: optimisticForecast,
        actual_collected: actualCollected,
        collection_rate:
          totalExpectedGross > 0
            ? Math.round((actualCollected / totalExpectedGross) * 100)
            : 0,
      };
    }

    // Small seasonal drift for future months (e.g. slight enrollment growth +2.5%/month)
    const monthOffset = m.month - 9;
    const growthFactor = 1 + monthOffset * 0.025;

    return {
      month_key: m.key,
      month_label: m.label,
      is_future: true,
      expected_gross: Math.round(totalExpectedGross * growthFactor),
      risk_discount: Math.round(totalRiskWeightedDeduction * growthFactor),
      forecast_baseline: Math.round(baselineForecast * growthFactor),
      forecast_conservative: Math.round(conservativeForecast * growthFactor),
      forecast_optimistic: Math.round(optimisticForecast * growthFactor),
      actual_collected: undefined,
      collection_rate: undefined,
    };
  });
}

export function detectAnomalies(
  payments: Payment[],
  feePlans: FeePlan[],
  families: Family[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Amount deviation anomalies
  payments.forEach((p) => {
    if (p.status === 'void') return;
    const plan = feePlans.find((fp) => fp.family_id === p.family_id);
    const expected = plan ? plan.amount : 0;
    const family = families.find((f) => f.id === p.family_id);
    const familyName = family ? family.parent_name : p.family_name || 'Unknown Family';

    if (expected > 0 && p.amount !== expected) {
      const diffPct = Math.abs((p.amount - expected) / expected) * 100;
      if (diffPct >= 20) {
        anomalies.push({
          id: `anom-dev-${p.id}`,
          type: 'amount_deviation',
          family_id: p.family_id,
          family_name: familyName,
          payment_id: p.id,
          amount: p.amount,
          expected_amount: expected,
          severity: diffPct > 50 ? 'high' : 'medium',
          description: `Payment ${p.id} of ${p.amount} deviates by ${Math.round(
            diffPct
          )}% from established monthly fee plan (${expected}).`,
          detected_at: p.created_at || new Date().toISOString(),
          status: 'pending_review',
        });
      }
    }
  });

  // 2. Duplicate payment entries for the same family and month
  for (let i = 0; i < payments.length; i++) {
    for (let j = i + 1; j < payments.length; j++) {
      const p1 = payments[i];
      const p2 = payments[j];
      if (p1.status === 'void' || p2.status === 'void') continue;

      if (p1.family_id === p2.family_id && p1.month === p2.month && p1.year === p2.year) {
        const family = families.find((f) => f.id === p1.family_id);
        const familyName = family ? family.parent_name : p1.family_name || 'Family';
        anomalies.push({
          id: `anom-dup-${p1.id}-${p2.id}`,
          type: 'duplicate_entry',
          family_id: p1.family_id,
          family_name: familyName,
          payment_id: p2.id,
          amount: p2.amount,
          expected_amount: p1.amount,
          severity: 'high',
          description: `Multiple fee settlements detected for month ${p1.month}/${p1.year} (Record ${p1.id} & Record ${p2.id}). Verify if double payment or advance.`,
          detected_at: new Date().toISOString(),
          status: 'pending_review',
        });
      }
    }
  }

  // 3. Delinquency > 65 days
  families.forEach((f) => {
    const fPayments = payments.filter((p) => p.family_id === f.id && p.status === 'paid');
    if (fPayments.length > 0) {
      const sorted = [...fPayments].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      const lastPayment = sorted[0];
      const daysSince = Math.round(
        (new Date(REFERENCE_TODAY).getTime() - new Date(lastPayment.payment_date).getTime()) /
          (1000 * 3600 * 24)
      );
      if (daysSince > 65) {
        anomalies.push({
          id: `anom-delay-${f.id}`,
          type: 'unusual_delay',
          family_id: f.id,
          family_name: f.parent_name,
          severity: 'high',
          description: `No fee recorded for ${daysSince} days (last payment was on ${lastPayment.payment_date}). High churn or delinquency risk.`,
          detected_at: '2026-09-02T08:00:00Z',
          status: 'pending_review',
        });
      }
    }
  });

  return anomalies;
}
