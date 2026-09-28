import { GoogleGenAI } from '@google/genai';
import type { DashboardPayload } from '../types/index.js';
import { getFullDashboardPayload } from './dashboard.service.js';
import { env } from '../config/env.js';

type SuggestedView =
  | 'dashboard'
  | 'pending'
  | 'families'
  | 'anomalies'
  | 'settings';

export interface AiQueryResult {
  answer: string;
  suggestedView?: SuggestedView;
  quickStats?: Record<string, string | number>;
}

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = env.geminiApiKey;
    if (apiKey) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
  }
  return genAIClient;
}

export async function processNaturalLanguageQuery(userQuery: string): Promise<AiQueryResult> {
  const payload = await getFullDashboardPayload();

  // Clean, scoped data summary to keep token usage efficient.
  const contextSummary = {
    current_date: '2026-09-10',
    metrics: payload.metrics,
    high_risk_families: payload.families
      .filter((f) => f.risk && f.risk.tier === 'high')
      .map((f) => ({
        name: f.parent_name,
        risk_score: f.risk?.score,
        tier: f.risk?.tier,
        avg_delay_days: f.risk?.average_delay_days,
        defaults: f.risk?.past_defaults_count,
        factors: f.risk?.contributing_factors.map((cf) => cf.label),
      })),
    pending_september_families: payload.pendingItems.map((p) => ({
      name: p.family.parent_name,
      amount_due: p.monthly_fee,
      days_overdue: p.days_overdue,
      risk_score: p.risk_score.score,
      risk_tier: p.risk_score.tier,
    })),
    forecast_projections: payload.forecasts.slice(4).map((f) => ({
      month: f.month_label,
      expected: f.expected_gross,
      baseline_forecast: f.forecast_baseline,
      conservative_forecast: f.forecast_conservative,
      actual: f.actual_collected,
    })),
    active_anomalies_count: payload.anomalies.filter((a) => a.status === 'pending_review').length,
    trusted_payers: payload.families
      .filter((f) => f.risk && f.risk.is_trusted_payer)
      .map((f) => f.parent_name),
  };

  const ai = getGenAI();

  if (ai) {
    try {
      const systemInstruction = `You are the executive Financial & Risk Intelligence Analyst for IUM Fee Management, an intelligent tuition fee platform for coaching centers and schools.
Analyze the provided institutional fee context and answer the staff's inquiry concisely, accurately, and authoritatively.
Format your response with clean Markdown (bold text, bullet points).
Highlight key figures, specific family names, recommended follow-up actions, and dates.
If the query asks about at-risk families, pending collections, forecasts, or anomalies, directly quote the relevant data.
Keep answers professional, actionable, and under 250 words.`;

      const prompt = `Context Data:\n${JSON.stringify(contextSummary, null, 2)}\n\nStaff User Question:\n"${userQuery}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { systemInstruction, temperature: 0.2 },
      });

      const responseText = response.text || '';
      const suggestedView = inferSuggestedView(userQuery);

      return {
        answer: responseText,
        suggestedView,
        quickStats: buildQuickStats(payload),
      };
    } catch (err) {
      console.warn(
        'Gemini API call failed, falling back to local intelligence evaluator:',
        err
      );
    }
  }

  // Deterministic fallback when the Gemini key is missing or the call errored.
  return generateDeterministicAnswer(userQuery, payload, contextSummary);
}

/** Maps query semantics onto the view the client should navigate to. */
function inferSuggestedView(query: string): SuggestedView | undefined {
  const lower = query.toLowerCase();
  if (['setting', 'edit family', 'policy', 'configure'].some((k) => lower.includes(k))) {
    return 'settings';
  }
  if (['pending', 'overdue', 'unpaid', 'remind'].some((k) => lower.includes(k))) {
    return 'pending';
  }
  if (['anomal', 'irregular', 'spike', 'deviat'].some((k) => lower.includes(k))) {
    return 'anomalies';
  }
  if (['risk', 'family', 'student'].some((k) => lower.includes(k))) {
    return 'families';
  }
  return undefined;
}

function buildQuickStats(payload: DashboardPayload): Record<string, string | number> {
  const symbol = payload.settings?.currency_symbol || '₹';
  return {
    'Collected (Sep)': `${symbol}${payload.metrics.collected_this_month}`,
    'Pending Total': `${symbol}${payload.metrics.pending_this_month}`,
    'High Risk Count': payload.metrics.high_risk_count,
    'Next Month Forecast': `${symbol}${payload.metrics.forecast_next_month}`,
  };
}

function generateDeterministicAnswer(
  query: string,
  payload: DashboardPayload,
  _contextSummary: any
): AiQueryResult {
  const q = query.toLowerCase();
  const symbol = payload.settings?.currency_symbol || '₹';

  if (
    ['setting', 'edit family', 'update family', 'fee rate'].some((k) => q.includes(k))
  ) {
    return {
      answer:
        "You can edit any family's contact records, adjust monthly tuition fees, update student rosters, and configure institutional billing policies directly in the **Settings & Account Management** console.",
      suggestedView: 'settings',
      quickStats: {
        'Registered Families': payload.families.length,
        'Active Students': payload.metrics.active_students,
      },
    };
  }

  if (['risk', 'high risk', 'default'].some((k) => q.includes(k))) {
    const highRisk = payload.families.filter((f) => f.risk?.tier === 'high');
    const names = highRisk
      .map(
        (f) =>
          `**${f.parent_name}** (Risk Score: ${f.risk?.score}/100, Delays: ${f.risk?.average_delay_days}d avg)`
      )
      .join('\n• ');

    return {
      answer: `Currently, **${highRisk.length} families** are categorized in the **High Risk Tier**:\n\n• ${names}\n\n**Action Recommendation:** Prioritise direct phone follow-up with the highest-scoring accounts and consider proposing bi-weekly installment plans.`,
      suggestedView: 'families',
      quickStats: {
        'High Risk Profiles': highRisk.length,
        'Medium Risk Profiles': payload.metrics.medium_risk_count,
      },
    };
  }

  if (
    ['forecast', 'cash flow', 'q4', 'next month', 'project'].some((k) => q.includes(k))
  ) {
    const next = payload.forecasts.find((f) => f.month_key === '2026-10');
    const following = payload.forecasts.find((f) => f.month_key === '2026-11');
    return {
      answer: `### Cash Flow Forecast (Q4 2026)\n\n• **October 2026**: Projected net collection of **${symbol}${next?.forecast_baseline?.toLocaleString()}** (Gross: ${symbol}${next?.expected_gross?.toLocaleString()}, with a risk-weighted default adjustment of -${symbol}${next?.risk_discount}). Conservative estimate is ${symbol}${next?.forecast_conservative?.toLocaleString()}.\n• **November 2026**: Projected net collection of **${symbol}${following?.forecast_baseline?.toLocaleString()}**.\n\n*Forecasting model accounts for sibling discount eligibility and known payment delay probabilities.*`,
      // The forecast chart lives on the dashboard now that the dedicated view is gone.
      suggestedView: 'dashboard',
      quickStats: {
        'Oct Expected Net': `${symbol}${next?.forecast_baseline}`,
        'Risk Adjustment': `-${symbol}${next?.risk_discount}`,
      },
    };
  }

  if (['pending', "who hasn't paid", 'unpaid', 'september'].some((k) => q.includes(k))) {
    const pending = payload.pendingItems;
    const names = pending
      .slice(0, 5)
      .map(
        (p) =>
          `• **${p.family.parent_name}**: ${symbol}${p.monthly_fee} (${p.days_overdue} days overdue, ${p.risk_score.tier.toUpperCase()} risk)`
      )
      .join('\n');

    return {
      answer: `There are **${pending.length} families** with pending fees for September 2026 totaling **${symbol}${payload.metrics.pending_this_month.toLocaleString()}** (due on Sept 2nd):\n\n${names}\n\nAutomated smart reminders are prepared and calibrated by risk level.`,
      suggestedView: 'pending',
      quickStats: {
        'Pending Total': `${symbol}${payload.metrics.pending_this_month}`,
        'Overdue Accounts': pending.length,
      },
    };
  }

  if (['anomal', 'review', 'spike', 'suspicious'].some((k) => q.includes(k))) {
    const pendingAnom = payload.anomalies.filter((a) => a.status === 'pending_review');
    return {
      answer:
        `There are **${pendingAnom.length} items** in the Anomaly Review Queue requiring verification:\n\n` +
        pendingAnom
          .map((a) => `• **${a.family_name}** (${a.severity.toUpperCase()}): ${a.description}`)
          .join('\n') +
        `\n\nStaff can inspect or clear these entries in the **Anomaly Review Queue**.`,
      suggestedView: 'anomalies',
      quickStats: { 'Review Queue': pendingAnom.length },
    };
  }

  if (['trust', 'loyal', 'star', 'discount'].some((k) => q.includes(k))) {
    const trusted = payload.families.filter((f) => f.risk?.is_trusted_payer);
    return {
      answer: `**${trusted.length} families** have earned the **Trusted Payer Badge** (Trust Score ≥ 80 with flawless payment history):\n\n• ${trusted
        .map((t) => `**${t.parent_name}** (Trust: ${t.risk?.trust_score}/100)`)
        .join('\n• ')}\n\n*These families are pre-approved for the 5% Advance Prepay Incentive or priority sibling scholarship programs.*`,
      suggestedView: 'families',
      quickStats: { 'Trusted Payers': trusted.length },
    };
  }

  return {
    answer: `### Institute Fee Overview (September 2026)\n\n• **Active Enrollments**: ${payload.metrics.total_families} registered families across ${payload.metrics.active_students} students.\n• **Collected This Month**: **${symbol}${payload.metrics.collected_this_month.toLocaleString()}**.\n• **Outstanding Balance**: **${symbol}${payload.metrics.pending_this_month.toLocaleString()}** across ${payload.pendingItems.length} accounts.\n• **Risk Profile**: ${payload.metrics.high_risk_count} High Risk, ${payload.metrics.medium_risk_count} Medium Risk, and ${payload.metrics.low_risk_count} Low Risk.\n• **Next Month Forecast**: **${symbol}${payload.metrics.forecast_next_month.toLocaleString()}** expected.\n\nYou can ask about specific families, at-risk accounts, cash-flow projections, or review anomalies.`,
    suggestedView: 'dashboard',
    quickStats: {
      Collected: `${symbol}${payload.metrics.collected_this_month}`,
      Pending: `${symbol}${payload.metrics.pending_this_month}`,
      'Forecast Oct': `${symbol}${payload.metrics.forecast_next_month}`,
    },
  };
}
