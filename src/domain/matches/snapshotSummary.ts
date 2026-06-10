import type { PractiscoreCompetitor, PractiscoreMatchSnapshot } from './practiscoreTypes';

const MAX_VISIBLE_VALUES = 4;

export function normalizeImportedDiscipline(snapshot?: PractiscoreMatchSnapshot): string {
  void snapshot;
  return 'IPSC';
}

export function summarizeOwnerDivisionAndCategory(snapshot: PractiscoreMatchSnapshot, ownerIdentifiers: string[] = []): string | undefined {
  const competitor = findOwnerCompetitor(snapshot, ownerIdentifiers);
  if (!competitor) return undefined;

  return [formatSingleValue('Div', competitor.divisionId), formatSingleValue('Cat', competitor.categoryId)].filter(Boolean).join(' · ') || undefined;
}

export function summarizeOwnerDivisionAndCategoryValue(snapshot: PractiscoreMatchSnapshot, ownerIdentifiers: string[] = []): string | undefined {
  const competitor = findOwnerCompetitor(snapshot, ownerIdentifiers);
  if (!competitor) return undefined;

  return [normalizeDivisionValue(competitor.divisionId), normalizeCategoryValue(competitor.categoryId)].filter(Boolean).join(' · ') || undefined;
}

export function summarizeSnapshotDivisionsAndCategoriesValue(snapshot: PractiscoreMatchSnapshot): string | undefined {
  const divisions = uniqueSorted(snapshot.competitors.map((competitor) => normalizeDivisionValue(competitor.divisionId)));
  const categories = uniqueSorted(snapshot.competitors.map((competitor) => normalizeCategoryValue(competitor.categoryId)));
  return [...divisions, ...categories].join(', ') || undefined;
}

export function findOwnerCompetitor(snapshot: PractiscoreMatchSnapshot, ownerIdentifiers: string[] = []): PractiscoreCompetitor | undefined {
  for (const identifier of ownerIdentifiers) {
    const match = findCompetitorByIdentifier(snapshot.competitors, identifier);
    if (match) return match;
  }

  return undefined;
}

export function summarizeSnapshotDivisionsAndCategories(snapshot: PractiscoreMatchSnapshot): string | undefined {
  const divisions = uniqueSorted(snapshot.competitors.map((competitor) => normalizeDivisionValue(competitor.divisionId)));
  const categories = uniqueSorted(snapshot.competitors.map((competitor) => normalizeCategoryValue(competitor.categoryId)));
  const parts = [formatValues('Div', divisions), formatValues('Cat', categories)].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function findCompetitorByIdentifier(competitors: PractiscoreCompetitor[], identifier: string): PractiscoreCompetitor | undefined {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return undefined;

  const aliasFromIdentifier = identifier.match(/\b[A-Z]{2}\d{3,}\b/i)?.[0];
  const normalizedAliasFromIdentifier = normalizeIdentifier(aliasFromIdentifier);

  return competitors.find((competitor) => normalizedAliasFromIdentifier && normalizeIdentifier(competitor.alias) === normalizedAliasFromIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(competitor.alias) === normalizedIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(competitor.competitorNumber) === normalizedIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(`#${competitor.competitorNumber ?? ''}`) === normalizedIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(competitor.displayName) === normalizedIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(competitorOptionValue(competitor)) === normalizedIdentifier)
    ?? competitors.find((competitor) => normalizeIdentifier(competitorOptionValue(competitor)).includes(normalizedIdentifier));
}

function competitorOptionValue(competitor: PractiscoreCompetitor): string {
  const details = [competitor.alias, competitor.competitorNumber ? `#${competitor.competitorNumber}` : undefined].filter(Boolean).join(' · ');
  return details ? `${competitor.displayName} · ${details}` : competitor.displayName;
}

function normalizeIdentifier(value: string | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value) && value !== '0'))].sort((a, b) => a.localeCompare(b));
}

function formatSingleValue(label: string, value: string | undefined): string | undefined {
  const normalizedValue = label === 'Div' ? normalizeDivisionValue(value) : normalizeCategoryValue(value);
  return normalizedValue ? `${label}: ${normalizedValue}` : undefined;
}

const IPSC_DIVISION_LABELS: Record<string, string> = {
  '1': 'OPEN',
  '2': 'STANDARD',
  '3': 'MODIFIED',
  '4': 'PRODUCTION',
  '5': 'REVOLVER',
  '6': 'SEMI AUTO OPEN',
  '7': 'MANUAL ACTION OPEN',
  '8': 'SEMI AUTO STANDARD',
  '9': 'MANUAL ACTION STANDARD',
  '10': 'SHOTGUN OPEN',
  '11': 'SHOTGUN STANDARD',
  '12': 'SHOTGUN STANDARD MANUAL',
  '13': 'SHOTGUN MODIFIED',
  '18': 'CLASSIC',
  '20': 'AIR OPEN',
  '21': 'AIR STANDARD',
  '22': 'AIR PRODUCTION',
  '23': 'AIR CLASSIC',
  '24': 'PRODUCTION OPTICS',
  '25': 'MINI RIFLE OPEN',
  '26': 'MINI RIFLE STANDARD',
  '27': 'PCC',
  '28': 'PRODUCTION OPTICS LIGHT',
  '29': 'PCC OPTIC',
  '30': 'MANUAL ACTION LEVER RELEASE',
  '31': 'PCC IRON',
  '34': 'MANUAL ACTION BOLT',
  '35': 'AIR PRODUCTION OPTICS',
  '37': 'ACTION AIR PCC OPTIC',
  '38': 'ACTION AIR PCC IRON',
  '41': 'AIR SEMI AUTO OPEN',
  '42': 'AIR SEMI AUTO STANDARD',
  '45': '.22 OPEN',
  '50': 'OPTICS',
  AAO: 'AIR OPEN',
  AAS: 'AIR STANDARD',
  AAC: 'AIR CLASSIC',
  AAP: 'AIR PRODUCTION',
  APO: 'AIR PRODUCTION OPTICS',
  APCI: 'ACTION AIR PCC IRON',
  APCO: 'ACTION AIR PCC OPTIC',
  ASAO: 'AIR SEMI AUTO OPEN',
  ASAS: 'AIR SEMI AUTO STANDARD',
  C: 'CLASSIC',
  M: 'MODIFIED',
  MAB: 'MANUAL ACTION BOLT',
  MAL: 'MANUAL ACTION LEVER RELEASE',
  MAO: 'MANUAL ACTION OPEN',
  MAS: 'MANUAL ACTION STANDARD',
  MRO: 'MINI RIFLE OPEN',
  MRS: 'MINI RIFLE STANDARD',
  O: 'OPEN',
  OP: 'OPTICS',
  P: 'PRODUCTION',
  PC: 'PCC',
  PCI: 'PCC IRON',
  PCH: 'PCC',
  PCO: 'PCC OPTIC',
  PL: 'PRODUCTION OPTICS LIGHT',
  PO: 'PRODUCTION OPTICS',
  R: 'REVOLVER',
  S: 'STANDARD',
  SAO: 'SEMI AUTO OPEN',
  SAS: 'SEMI AUTO STANDARD',
  SGD: 'SHOTGUN MODIFIED',
  SGM: 'SHOTGUN STANDARD MANUAL',
  SGO: 'SHOTGUN OPEN',
  SGS: 'SHOTGUN STANDARD',
  '22C': '.22 CLASSIC',
  '22O': '.22 OPEN',
  '22S': '.22 STANDARD',
  '22SO': '.22 STANDARD OPTICS'
};

function normalizeDivisionValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^div:\s*/i, '').toUpperCase();
  if (!normalized || normalized === '0') return undefined;
  return IPSC_DIVISION_LABELS[normalized] ?? normalized;
}

function normalizeCategoryValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized !== '0' ? normalized : undefined;
}

function formatValues(label: string, values: string[]): string | undefined {
  if (!values.length) return undefined;
  const visible = values.slice(0, MAX_VISIBLE_VALUES).join(', ');
  const remaining = values.length - MAX_VISIBLE_VALUES;
  return remaining > 0 ? `${label}: ${visible} +${remaining}` : `${label}: ${visible}`;
}
