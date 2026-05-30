/**
 * i18n React Context
 *
 * Provides locale and translations to the React component tree.
 * Client-side only — no server-only imports.
 */

import * as React from 'react';
import type { I18nContextValue, TranslationMap } from './i18n.types';

const defaultContextValue: I18nContextValue = {
  locale: 'en',
  setLocale: () => {},
  translations: {},
};

export const I18nContext = React.createContext<I18nContextValue>(defaultContextValue);

export type I18nProviderProps = {
  locale: string;
  translations: TranslationMap;
  children: React.ReactNode;
};

export const I18nProvider: React.FC<I18nProviderProps> = ({
  locale: initialLocale,
  translations,
  children,
}) => {
  const [locale, setLocale] = React.useState(initialLocale);

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, setLocale, translations }),
    [locale, translations],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
