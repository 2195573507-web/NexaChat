import { createContext, useContext, type ReactNode } from 'react';
import { normalizeLocale, translate, type I18nKey, type Locale } from '../shared/i18n';
import type { NavModule, NavTab } from '../shared/types';

export type Translate = (key: I18nKey, params?: Record<string, string | number>) => string;

const I18nContext = createContext<{ locale: Locale; t: Translate }>({
  locale: 'zh-CN',
  t: (key, params) => translate('zh-CN', key, params),
});

export function I18nProvider({ locale, children }: { locale: string | null | undefined; children: ReactNode }) {
  const normalized = normalizeLocale(locale);
  const t: Translate = (key, params) => translate(normalized, key, params);
  return <I18nContext.Provider value={{ locale: normalized, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function translateTab(tab: NavTab, t: Translate): NavTab {
  return {
    ...tab,
    label: tab.labelKey ? t(tab.labelKey as I18nKey) : tab.label,
    title: tab.labelKey ? t(tab.labelKey as I18nKey) : tab.title,
    description: tab.descriptionKey ? t(tab.descriptionKey as I18nKey) : tab.description,
    featureBoundary: tab.featureBoundaryKey ? t(tab.featureBoundaryKey as I18nKey) : tab.featureBoundary,
  };
}

export function translateModule(module: NavModule, t: Translate): NavModule {
  const tabs = module.tabs.map((tab) => translateTab(tab, t));
  return {
    ...module,
    label: module.labelKey ? t(module.labelKey as I18nKey) : module.label,
    moduleName: module.labelKey ? t(module.labelKey as I18nKey) : module.moduleName,
    shortLabel: module.shortLabelKey ? t(module.shortLabelKey as I18nKey) : module.shortLabel,
    description: module.descriptionKey ? t(module.descriptionKey as I18nKey) : module.description,
    moduleDescription: module.descriptionKey ? t(module.descriptionKey as I18nKey) : module.moduleDescription,
    tabs,
    children: tabs,
  };
}
