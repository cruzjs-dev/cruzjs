import { config } from './index';

/**
 * UI Terminology Helper
 * Provides easy access to configurable UI terminology throughout the application
 */

/**
 * Get the singular form of "organization"
 * Can be overridden in config to use terms like "Team", "Band", "Group", etc.
 * @returns The singular form (e.g., "Organization", "Team", "Band")
 */
export const getOrgSingular = (): string => {
  return config.ui.terminology.organization.singular;
};

/**
 * Get the plural form of "organization"
 * Can be overridden in config to use terms like "Teams", "Bands", "Groups", etc.
 * @returns The plural form (e.g., "Organizations", "Teams", "Bands")
 */
export const getOrgPlural = (): string => {
  return config.ui.terminology.organization.plural;
};

/**
 * Get the lowercase singular form of "organization"
 * @returns The lowercase singular form (e.g., "organization", "team", "band")
 */
export const getOrgSingularLower = (): string => {
  return config.ui.terminology.organization.singular.toLowerCase();
};

/**
 * Get the lowercase plural form of "organization"
 * @returns The lowercase plural form (e.g., "organizations", "teams", "bands")
 */
export const getOrgPluralLower = (): string => {
  return config.ui.terminology.organization.plural.toLowerCase();
};

/**
 * All terminology helpers in one object for convenience
 */
export const terminology = {
  organization: {
    singular: getOrgSingular,
    plural: getOrgPlural,
    singularLower: getOrgSingularLower,
    pluralLower: getOrgPluralLower,
  },
} as const;

