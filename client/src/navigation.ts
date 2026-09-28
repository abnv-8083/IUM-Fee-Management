/**
 * Single source of truth for the sidebar sections.
 *
 * Kept apart from the components so the sidebar's nav list and the topbar's
 * heading cannot drift out of sync.
 */

export type CounterTone = 'indigo' | 'rose' | 'amber';

export interface NavSection {
  id: string;
  /** Descriptive name: the sidebar item and the view heading. */
  label: string;
  /** Tint for this section's counter, independent of the selected state. */
  tone: CounterTone;
  /** Spoken alongside the bare count, e.g. "3 high-risk families". */
  countLabel?: string;
}

export const NAV_SECTIONS: NavSection[] = [
  { id: 'dashboard', label: 'Dashboard', tone: 'indigo' },
  { id: 'pending', label: 'Auto-Pending', tone: 'indigo', countLabel: 'awaiting collection' },
  { id: 'families', label: 'Families & Students', tone: 'rose', countLabel: 'high-risk families' },
  { id: 'anomalies', label: 'Anomaly Review', tone: 'amber', countLabel: 'unresolved anomalies' },
  { id: 'settings', label: 'Settings', tone: 'indigo' },
];

export const COUNTER_TONES: Record<CounterTone, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-800',
};

/** Heading for the current section, falling back to the first section. */
export function viewLabel(view: string): string {
  return NAV_SECTIONS.find((section) => section.id === view)?.label ?? NAV_SECTIONS[0].label;
}
