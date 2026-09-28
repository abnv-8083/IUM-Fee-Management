import React, { createContext, useContext, useState, useEffect } from 'react';
import { SystemSettings } from '../types';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', position: 'prefix' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', position: 'prefix' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', position: 'prefix' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', position: 'prefix' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', position: 'prefix' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', position: 'prefix' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)', position: 'suffix' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)', position: 'suffix' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', position: 'prefix' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', position: 'prefix' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee (PKR)', position: 'prefix' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (MYR)', position: 'prefix' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand (ZAR)', position: 'prefix' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar (NZD)', position: 'prefix' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)', position: 'prefix' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  currency_code: 'INR',
  currency_symbol: '₹',
  currency_name: 'Indian Rupee (INR)',
  currency_position: 'prefix',
  tuition_pricing_model: 'fixed_rate',
  fixed_tuition_rate: 100,
  enforce_fixed_rate_all: false,
  due_day: 2,
  grace_period_days: 5,
  sibling_discount_2nd: 10,
  sibling_discount_3rd: 15,
  high_risk_cutoff: 60
};

interface CurrencyContextType {
  settings: SystemSettings;
  currencySymbol: string;
  currencyCode: string;
  currencyPosition: 'prefix' | 'suffix';
  supportedCurrencies: CurrencyConfig[];
  formatMoney: (amount?: number | string | null) => string;
  formatShortMoney: (amount?: number | null) => string;
  changeCurrency: (currencyCode: string) => Promise<boolean>;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<boolean>;
  applyFixedRateToAll: (rate: number) => Promise<{ success: boolean; updatedCount: number }>;
  clearAllDatabaseRecords: () => Promise<boolean>;
  syncSettingsFromPayload: (remoteSettings?: SystemSettings) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode; initialSettings?: SystemSettings }> = ({
  children,
  initialSettings
}) => {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    // Try localStorage first, then fallback to initial or default
    try {
      const stored = localStorage.getItem('ium_system_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored was the old USD default, upgrade automatically to INR
        if (parsed.currency_code === 'USD' && (!parsed.currency_symbol || parsed.currency_symbol === '$')) {
          parsed.currency_code = 'INR';
          parsed.currency_symbol = '₹';
          parsed.currency_name = 'Indian Rupee (INR)';
          parsed.currency_position = 'prefix';
          if (parsed.fixed_tuition_rate === 350) {
            parsed.fixed_tuition_rate = 2500;
          }
        }
        return { ...DEFAULT_SETTINGS, ...parsed, ...(initialSettings || {}) };
      }
    } catch (e) {
      // ignore
    }
    return initialSettings || DEFAULT_SETTINGS;
  });

  const syncSettingsFromPayload = (remoteSettings?: SystemSettings) => {
    if (remoteSettings) {
      setSettings(prev => {
        const merged = { ...prev, ...remoteSettings };
        try {
          localStorage.setItem('ium_system_settings', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }
  };

  const formatMoney = (amount?: number | string | null): string => {
    // Accepts numeric input fields directly so callers don't have to coerce.
    const numeric = typeof amount === 'string' ? Number(amount) : amount;
    const safeAmount =
      numeric === undefined || numeric === null || isNaN(numeric) ? 0 : numeric;
    const formattedNumber = Math.round(safeAmount).toLocaleString();
    if (settings.currency_position === 'suffix') {
      return `${formattedNumber} ${settings.currency_symbol}`;
    }
    return `${settings.currency_symbol}${formattedNumber}`;
  };

  const formatShortMoney = (amount?: number | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      amount = 0;
    }
    let formattedNumber: string;
    if (Math.abs(amount) >= 1000000) {
      formattedNumber = (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (Math.abs(amount) >= 1000) {
      formattedNumber = (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    } else {
      formattedNumber = Math.round(amount).toString();
    }

    if (settings.currency_position === 'suffix') {
      return `${formattedNumber} ${settings.currency_symbol}`;
    }
    return `${settings.currency_symbol}${formattedNumber}`;
  };

  const changeCurrency = async (currencyCode: string): Promise<boolean> => {
    const config = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!config) return false;

    const updates: Partial<SystemSettings> = {
      currency_code: config.code,
      currency_symbol: config.symbol,
      currency_name: config.name,
      currency_position: config.position
    };

    return updateSettings(updates);
  };

  const updateSettings = async (updates: Partial<SystemSettings>): Promise<boolean> => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    try {
      localStorage.setItem('ium_system_settings', JSON.stringify(updated));
    } catch (e) {}

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
        return true;
      }
    } catch (err) {
      console.warn('Failed to sync settings to server, updated locally:', err);
    }
    return true;
  };

  const applyFixedRateToAll = async (rate: number): Promise<{ success: boolean; updatedCount: number }> => {
    try {
      const res = await fetch('/api/settings/apply-fixed-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixed_rate: rate })
      });
      if (res.ok) {
        const data = await res.json();
        await updateSettings({ fixed_tuition_rate: rate, tuition_pricing_model: 'fixed_rate' });
        return { success: true, updatedCount: data.updated_count || 0 };
      }
    } catch (err) {
      console.error('Failed to apply fixed rate to all families:', err);
    }
    return { success: false, updatedCount: 0 };
  };

  const clearAllDatabaseRecords = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/database/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.database?.settings) {
          syncSettingsFromPayload(data.database.settings);
        }
        try {
          localStorage.removeItem('ium_dashboard_cache');
        } catch (e) {}
        return true;
      }
    } catch (err) {
      console.error('Failed to clear database records:', err);
    }
    return false;
  };

  return (
    <CurrencyContext.Provider
      value={{
        settings,
        currencySymbol: settings.currency_symbol,
        currencyCode: settings.currency_code,
        currencyPosition: settings.currency_position,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        formatMoney,
        formatShortMoney,
        changeCurrency,
        updateSettings,
        applyFixedRateToAll,
        clearAllDatabaseRecords,
        syncSettingsFromPayload
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
