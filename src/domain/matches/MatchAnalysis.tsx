import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { BarChart2 } from 'lucide-react';
import { db } from '../../db/schema';
import { DEFAULT_SETTINGS_ID } from '../settings/settingsRepository';
import { calculateHitBreakdown, calculateStageDetails, calculateStagePlacementTrend, type HitSlice, type StageCompetitorDetail, type StagePlacementPoint } from './practiscoreAnalysis';
import type { PractiscoreCompetitor, PractiscoreImportRecord } from './practiscoreTypes';

const ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY = 'shooting-logbook-analysis-compare-competitor';
const COMPARISON_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899', '#f59e0b'];

export function MatchAnalysis() {
  const { t } = useTranslation();
  const practiscoreImports = useLiveQuery(() => db.practiscoreMatchImports.toArray(), []);
  const appSettings = useLiveQuery(() => db.appSettings.get(DEFAULT_SETTINGS_ID), []);
  const [selectedAnalysisMatchId, setSelectedAnalysisMatchId] = useState('');
  const [comparisonCompetitorDraft, setComparisonCompetitorDraft] = useState('');
  const [comparisonCompetitorQueries, setComparisonCompetitorQueries] = useState(() => readStoredAnalysisList(ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY));
  const [dismissedOwnerCompetitorId, setDismissedOwnerCompetitorId] = useState<string | null>(null);
  const [stagePlacementChartType, setStagePlacementChartType] = useState<StageChartType>('line');
  const [hitFactorChartType, setHitFactorChartType] = useState<StageChartType>('bar');
  const [timeChartType, setTimeChartType] = useState<StageChartType>('bar');
  const [pointsChartType, setPointsChartType] = useState<StageChartType>('bar');
  const selectedAnalysisImport = useMemo(() => findSelectedAnalysisImport(practiscoreImports ?? [], selectedAnalysisMatchId), [practiscoreImports, selectedAnalysisMatchId]);
  const ownerCompetitor = useMemo(() => findOwnerCompetitor(selectedAnalysisImport, appSettings?.ownerPractiscoreIdentifiers ?? []), [appSettings, selectedAnalysisImport]);
  const manualComparisonCompetitors = useMemo(() => comparisonCompetitorQueries.flatMap((query) => {
    const competitor = findSelectedCompetitor(selectedAnalysisImport, query);
    return competitor ? [competitor] : [];
  }), [selectedAnalysisImport, comparisonCompetitorQueries]);
  const analysisCompetitors = useMemo(() => {
    const competitors = ownerCompetitor && ownerCompetitor.internalMemberId !== dismissedOwnerCompetitorId ? [ownerCompetitor] : [];
    for (const competitor of manualComparisonCompetitors) {
      if (!competitors.some((item) => item.internalMemberId === competitor.internalMemberId)) competitors.push(competitor);
    }
    return competitors;
  }, [dismissedOwnerCompetitorId, manualComparisonCompetitors, ownerCompetitor]);
  const selectedCompetitor = analysisCompetitors[0];
  const comparisonCompetitors = analysisCompetitors.slice(1);
  const comparisonPills = analysisCompetitors.map((competitor, index) => ({
    competitor,
    query: competitorOptionValue(competitor),
    color: index === 0 ? 'var(--primary)' : COMPARISON_COLORS[(index - 1) % COMPARISON_COLORS.length],
    isOwner: ownerCompetitor?.internalMemberId === competitor.internalMemberId
  }));
  const hitBreakdown = useMemo(() => calculateHitBreakdown(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const matchSummary = useMemo(() => calculateCompetitorMatchSummary(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonHitBreakdowns = useMemo(() => comparisonCompetitors.map((competitor, index) => ({ competitor, breakdown: calculateHitBreakdown(selectedAnalysisImport, competitor), summary: calculateCompetitorMatchSummary(selectedAnalysisImport, competitor), color: COMPARISON_COLORS[index % COMPARISON_COLORS.length] })), [selectedAnalysisImport, comparisonCompetitors]);
  const stagePlacementTrend = useMemo(() => calculateStagePlacementTrend(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonStagePlacementSeries = useMemo(() => comparisonCompetitors.map((competitor, index) => ({ competitor, points: calculateStagePlacementTrend(selectedAnalysisImport, competitor), color: COMPARISON_COLORS[index % COMPARISON_COLORS.length] })), [selectedAnalysisImport, comparisonCompetitors]);
  const stageDetails = useMemo(() => calculateStageDetails(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonStageDetailSeries = useMemo(() => comparisonCompetitors.map((competitor, index) => ({ competitor, details: calculateStageDetails(selectedAnalysisImport, competitor), color: COMPARISON_COLORS[index % COMPARISON_COLORS.length] })), [selectedAnalysisImport, comparisonCompetitors]);

  useEffect(() => {
    writeStoredAnalysisList(ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY, comparisonCompetitorQueries);
  }, [comparisonCompetitorQueries]);

  function addComparisonCompetitor(query: string) {
    const competitor = findExactSelectedCompetitor(selectedAnalysisImport, query) ?? findSelectedCompetitor(selectedAnalysisImport, query);
    if (!competitor) return;
    const value = competitorOptionValue(competitor);
    setComparisonCompetitorQueries((current) => current.includes(value) ? current : [...current, value]);
    setComparisonCompetitorDraft('');
  }

  function handleComparisonCompetitorChange(value: string) {
    setComparisonCompetitorDraft(value);
    const competitor = findExactSelectedCompetitor(selectedAnalysisImport, value);
    if (!competitor) return;
    const optionValue = competitorOptionValue(competitor);
    setComparisonCompetitorQueries((current) => current.includes(optionValue) ? current : [...current, optionValue]);
    setComparisonCompetitorDraft('');
  }

  function removeComparisonCompetitor(query: string) {
    const competitor = findSelectedCompetitor(selectedAnalysisImport, query);
    if (competitor && ownerCompetitor?.internalMemberId === competitor.internalMemberId) {
      setDismissedOwnerCompetitorId(competitor.internalMemberId);
    }
    setComparisonCompetitorQueries((current) => current.filter((item) => item !== query));
  }

  if (!selectedAnalysisImport) {
    return (
      <section className="empty-state-card placeholder-screen">
        <BarChart2 size={42} strokeWidth={1.4} />
        <h2>{t('matches.analysis.emptyTitle')}</h2>
        <p>{t('matches.analysis.emptyDescription')}</p>
      </section>
    );
  }

  return (
    <section className="screen-stack">
      <div className="section-heading figma-heading">
        <div>
          <h2>{t('matches.analysis.title')}</h2>
          <p>{t('matches.analysis.description')}</p>
        </div>
      </div>
      <div className="panel form-grid match-analysis-panel">
        <div className="analysis-controls-grid analysis-controls-grid-compact">
          <label>
            <span>{t('matches.analysis.match')}</span>
            <select value={selectedAnalysisImport.matchEventId} onChange={(event) => setSelectedAnalysisMatchId(event.target.value)}>
              {(practiscoreImports ?? []).map((record) => <option key={record.id} value={record.matchEventId}>{record.snapshot.match.name}</option>)}
            </select>
          </label>
          <div className="analysis-competitor-field analysis-competitor-field-comparison comparison-picker">
            <span>{t('matches.analysis.compareWith')}</span>
            <input list="practiscore-competitors" value={comparisonCompetitorDraft} onChange={(event) => handleComparisonCompetitorChange(event.target.value)} placeholder={t('matches.analysis.comparePlaceholder')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addComparisonCompetitor(comparisonCompetitorDraft); } }} />
            <datalist id="practiscore-competitors">
              {selectedAnalysisImport.snapshot.competitors.map((competitor) => <option key={competitor.internalMemberId} value={competitorOptionValue(competitor)} />)}
            </datalist>
            <div className="comparison-pill-row">
              {comparisonPills.map(({ competitor, query, color, isOwner }) => <button className="comparison-pill" style={{ '--comparison-color': color } as CSSProperties} type="button" key={competitor.internalMemberId} onClick={() => removeComparisonCompetitor(query)}>{competitor.displayName}{isOwner ? ` · ${t('matches.analysis.ownerPill')}` : ''} ×</button>)}
            </div>
          </div>
        </div>
        {selectedCompetitor && hitBreakdown.total > 0 ? (
          <div className="analysis-charts-stack">
            <div className="hit-distribution-card">
              <div>
                <h4>{t('matches.analysis.hitDistributionTitle')}</h4>
                <p className="muted">{t('matches.analysis.hitDistributionDescription')}</p>
              </div>
              <div className="hit-analysis-grid hit-comparison-grid">
                <CompetitorHitBreakdown competitor={selectedCompetitor} breakdown={hitBreakdown} summary={matchSummary} tone="primary" />
                {comparisonHitBreakdowns.map(({ competitor, breakdown, summary, color }) => breakdown.total > 0 ? <CompetitorHitBreakdown key={competitor.internalMemberId} competitor={competitor} breakdown={breakdown} summary={summary} tone="comparison" color={color} /> : null)}
              </div>
            </div>
            {stagePlacementTrend.length > 0 && (
              <div className="stage-placement-card">
                <div>
                  <div className="stage-chart-title-row"><h4>{t('matches.analysis.stagePlacementTitle')}</h4><StageChartTypeToggle value={stagePlacementChartType} onChange={setStagePlacementChartType} /></div>
                  <p className="muted">{t('matches.analysis.stagePlacementDescription')}</p>
                </div>
                <StagePlacementChart points={stagePlacementTrend} comparisonSeries={comparisonStagePlacementSeries} chartType={stagePlacementChartType} />
              </div>
            )}
            {stageDetails.length > 0 && (
              <div className="stage-comparison-charts-grid">
                <StageComparisonChart title={t('matches.analysis.hitFactorChartTitle')} description={t('matches.analysis.hitFactorChartDescription')} details={stageDetails} comparisonSeries={comparisonStageDetailSeries} metric="hitFactor" valueSuffix="" chartType={hitFactorChartType} onChartTypeChange={setHitFactorChartType} />
                <StageComparisonChart title={t('matches.analysis.timeChartTitle')} description={t('matches.analysis.timeChartDescription')} details={stageDetails} comparisonSeries={comparisonStageDetailSeries} metric="time" valueSuffix="s" chartType={timeChartType} onChartTypeChange={setTimeChartType} />
                <StageComparisonChart title={t('matches.analysis.pointsChartTitle')} description={t('matches.analysis.pointsChartDescription')} details={stageDetails} comparisonSeries={comparisonStageDetailSeries} metric="points" valueSuffix="" chartType={pointsChartType} onChartTypeChange={setPointsChartType} />
              </div>
            )}
            {stageDetails.length > 0 && (
              <div className="stage-details-card">
                <div>
                  <h4>{t('matches.analysis.stageDetailsTitle')}</h4>
                  <p className="muted">{t('matches.analysis.stageDetailsDescription')}</p>
                  <p className="stage-details-legend">
                    <LegendToken tone="alpha" label="Alpha" />
                    <LegendToken tone="charlie" label="Charlie" />
                    <LegendToken tone="delta" label="Delta" />
                    <LegendToken tone="miss" label="Miss" />
                    <LegendToken tone="noShoot" label="No-shoot" />
                    <LegendToken tone="procedural" label="Procedure" />
                  </p>
                </div>
                <div className="stage-details-grid">
                  {stageDetails.map((detail) => <StageDetailCard key={detail.stageId} detail={detail} primaryCompetitor={selectedCompetitor} comparisonSeries={comparisonStageDetailSeries.map((series) => ({ competitor: series.competitor, color: series.color, detail: series.details.find((comparisonDetail) => comparisonDetail.stageId === detail.stageId) })).filter((series): series is { competitor: PractiscoreCompetitor; color: string; detail: StageCompetitorDetail } => Boolean(series.detail))} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">{analysisCompetitors.length ? t('matches.analysis.noCompetitorSelected') : t('matches.analysis.pickCompetitor')}</p>
        )}
      </div>
    </section>
  );
}

function readStoredAnalysisList(key: string): string[] {
  const value = window.localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return value.trim() ? [value] : [];
  }
  return [];
}

function writeStoredAnalysisList(key: string, values: string[]): void {
  const normalizedValues = values.map((value) => value.trim()).filter(Boolean);
  if (normalizedValues.length) {
    window.localStorage.setItem(key, JSON.stringify(normalizedValues));
  } else {
    window.localStorage.removeItem(key);
  }
}

function findSelectedAnalysisImport(imports: PractiscoreImportRecord[], selectedMatchEventId: string): PractiscoreImportRecord | undefined {
  return imports.find((record) => record.matchEventId === selectedMatchEventId) ?? imports[0];
}

function findOwnerCompetitor(record: PractiscoreImportRecord | undefined, identifiers: string[]): PractiscoreCompetitor | undefined {
  if (!record) return undefined;

  for (const identifier of identifiers) {
    const match = findSelectedCompetitor(record, identifier);
    if (match) return match;
  }

  return undefined;
}

function findSelectedCompetitor(record: PractiscoreImportRecord | undefined, query: string): PractiscoreCompetitor | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (!record || !normalizedQuery) return undefined;

  return findExactSelectedCompetitor(record, query)
    ?? record.snapshot.competitors.find((competitor) => competitorOptionValue(competitor).toLowerCase().includes(normalizedQuery));
}

function findExactSelectedCompetitor(record: PractiscoreImportRecord | undefined, query: string): PractiscoreCompetitor | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (!record || !normalizedQuery) return undefined;

  const aliasFromQuery = extractAliasFromQuery(query);

  return record.snapshot.competitors.find((competitor) => aliasFromQuery && competitor.alias?.toLowerCase() === aliasFromQuery.toLowerCase())
    ?? record.snapshot.competitors.find((competitor) => competitor.alias?.toLowerCase() === normalizedQuery)
    ?? record.snapshot.competitors.find((competitor) => competitorOptionValue(competitor).toLowerCase() === normalizedQuery)
    ?? record.snapshot.competitors.find((competitor) => competitor.displayName.toLowerCase() === normalizedQuery);
}

function extractAliasFromQuery(query: string): string | undefined {
  return query.match(/\b[A-Z]{2}\d{3,}\b/i)?.[0];
}

function competitorOptionValue(competitor: PractiscoreCompetitor): string {
  const details = [competitor.alias, competitor.competitorNumber ? `#${competitor.competitorNumber}` : undefined].filter(Boolean).join(' · ');
  return details ? `${competitor.displayName} · ${details}` : competitor.displayName;
}

function HitPieChart({ slices }: { slices: HitSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const chartSlices = slices.reduce<Array<HitSlice & { dashArray: string; dashOffset: number; nextOffset: number }>>((items, slice) => {
    const previousOffset = items.at(-1)?.nextOffset ?? 0;
    const percent = total > 0 ? (slice.value / total) * 100 : 0;
    return [...items, { ...slice, dashArray: `${percent} ${100 - percent}`, dashOffset: 25 - previousOffset, nextOffset: previousOffset + percent }];
  }, []);

  return (
    <svg className="hit-pie-chart" viewBox="0 0 42 42" role="img" aria-label="Hit breakdown pie chart">
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--muted)" strokeWidth="8" />
      {chartSlices.map((slice) => <circle key={slice.key} cx="21" cy="21" r="15.915" fill="transparent" stroke={slice.color} strokeWidth="8" strokeDasharray={slice.dashArray} strokeDashoffset={slice.dashOffset} />)}
      <circle cx="21" cy="21" r="10" fill="var(--card)" />
    </svg>
  );
}

type CompetitorMatchSummary = {
  placement?: number;
  totalPoints: number;
  totalTime: number;
  totalHitFactor?: number;
};

function CompetitorHitBreakdown({ competitor, breakdown, summary, tone, color }: { competitor: PractiscoreCompetitor; breakdown: { total: number; slices: HitSlice[] }; summary?: CompetitorMatchSummary; tone: 'primary' | 'comparison'; color?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`competitor-hit-card competitor-hit-card-${tone}`} style={color ? { '--comparison-color': color } as CSSProperties : undefined}>
      <h4 className="competitor-hit-title">{competitor.displayName}{summary?.placement ? ` · #${summary.placement}` : ''}</h4>
      <HitPieChart slices={breakdown.slices} />
      <div className="hit-legend">
        {breakdown.slices.map((slice) => (
          <div className="hit-legend-row" key={slice.key}>
            <span className="hit-legend-color" style={{ background: slice.color }} />
            <span>{t(`matches.analysis.labels.${slice.key}`)}</span>
            <strong>{slice.value} · {formatPercent(slice.value, breakdown.total)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateCompetitorMatchSummary(record: PractiscoreImportRecord | undefined, competitor: PractiscoreCompetitor | undefined): CompetitorMatchSummary | undefined {
  if (!record || !competitor) return undefined;

  const competitorTotals = calculateTotalsForCompetitor(record, competitor.internalMemberId);
  const memberIdsInDivision = new Set(
    record.snapshot.competitors
      .filter((candidate) => !candidate.disqualified && (!competitor.divisionId || candidate.divisionId === competitor.divisionId))
      .map((candidate) => candidate.internalMemberId)
  );
  const ranking = record.snapshot.competitors
    .filter((candidate) => memberIdsInDivision.has(candidate.internalMemberId))
    .map((candidate) => ({ memberId: candidate.internalMemberId, totals: calculateTotalsForCompetitor(record, candidate.internalMemberId) }))
    .sort((a, b) => b.totals.totalPoints - a.totals.totalPoints || a.totals.totalTime - b.totals.totalTime);
  const placement = ranking.findIndex((item) => item.memberId === competitor.internalMemberId) + 1;

  return {
    ...competitorTotals,
    placement: placement > 0 ? placement : undefined
  };
}

function calculateTotalsForCompetitor(record: PractiscoreImportRecord, internalMemberId: string): Omit<CompetitorMatchSummary, 'placement'> {
  const scores = record.snapshot.scores.filter((score) => score.internalMemberId === internalMemberId && !isRemovedScore(score));
  const totalPoints = scores.reduce((total, score) => total + (score.finalScore ?? 0), 0);
  const totalTime = scores.reduce((total, score) => total + (score.shootTime ?? 0), 0);
  return {
    totalPoints,
    totalTime,
    totalHitFactor: totalTime > 0 ? totalPoints / totalTime : undefined
  };
}

function isRemovedScore(score: { removed?: boolean; noVerify?: boolean; shootTime?: number; hitFactor?: number; finalScore?: number; scoreA?: number; scoreC?: number; scoreD?: number; misses?: number; penalties?: number; procedurals?: number }): boolean {
  return score.removed === true || score.noVerify === true || (score.shootTime ?? 0) === 0
    && (score.hitFactor ?? 0) === 0
    && (score.finalScore ?? 0) === 0
    && (score.scoreA ?? 0) === 0
    && (score.scoreC ?? 0) === 0
    && (score.scoreD ?? 0) === 0
    && (score.misses ?? 0) === 0
    && (score.penalties ?? 0) === 0
    && (score.procedurals ?? 0) === 0;
}

function StageDetailCard({ detail, primaryCompetitor, comparisonSeries }: { detail: StageCompetitorDetail; primaryCompetitor: PractiscoreCompetitor; comparisonSeries: Array<{ competitor: PractiscoreCompetitor; color: string; detail: StageCompetitorDetail }> }) {
  return (
    <article className="stage-detail-card">
      <div className="stage-detail-header">
        <h5>{detail.stageName} <small>({detail.minRounds ?? '—'}/{detail.maxPoints ?? '—'})</small></h5>
      </div>
      <StageDetailMetrics detail={detail} tone="primary" competitorName={primaryCompetitor.displayName} />
      {comparisonSeries.map((series) => <StageDetailMetrics key={series.competitor.internalMemberId} detail={series.detail} tone="comparison" competitorName={series.competitor.displayName} color={series.color} />)}
    </article>
  );
}

function StageDetailMetrics({ detail, tone, competitorName, color }: { detail: StageCompetitorDetail; tone: 'primary' | 'comparison'; competitorName?: string; color?: string }) {
  return (
    <div className={`stage-detail-metrics stage-detail-metrics-${tone}`} style={color ? { '--comparison-color': color } as CSSProperties : undefined}>
      {competitorName ? <div className="stage-detail-competitor-name">{competitorName}</div> : null}
      <StageMetric label="Time" value={`${formatNumber(detail.time)}s`} gap={formatPositiveGap(detail.timeGapFromFirst, 's')} />
      <StageMetric label="Points" value={formatNumber(detail.points)} gap={formatNegativeGap(detail.pointsGapFromFirst)} />
      <StageMetric label="HF" value={formatNumber(detail.hitFactor)} gap={formatNegativeGap(detail.hitFactorGapFromFirst)} />
      <StageHitsSummary detail={detail} />
    </div>
  );
}

function StageMetric({ label, value, gap }: { label: string; value: string; gap: string }) {
  return (
    <span className="stage-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{gap}</em>
    </span>
  );
}

function StageHitsSummary({ detail }: { detail: StageCompetitorDetail }) {
  const hits = [
    { label: 'A', value: detail.alpha, tone: 'alpha' },
    { label: 'C', value: detail.charlie, tone: 'charlie' },
    { label: 'D', value: detail.delta, tone: 'delta' },
    { label: 'M', value: detail.miss, tone: 'miss' },
    { label: 'NS', value: detail.noShoot, tone: 'noShoot' },
    { label: 'P', value: detail.procedurals, tone: 'procedural' }
  ].filter((hit) => hit.value > 0);

  return (
    <span className="stage-metric stage-hit-summary">
      <small>Hits</small>
      <strong>{hits.length > 0 ? hits.map((hit) => <StageHitSummaryItem key={hit.label} value={hit.value} tone={hit.tone} />) : '—'}</strong>
    </span>
  );
}

function StageHitSummaryItem({ value, tone }: { value: number; tone: string }) {
  return <span className={`stage-hit-summary-item stage-hit-active stage-hit-${tone}`}>{value}</span>;
}

function LegendToken({ tone, label }: { tone: string; label: string }) {
  return <span className={`stage-legend-token stage-hit-${tone}`}>{label}</span>;
}

type StageComparisonMetric = 'hitFactor' | 'time' | 'points';
type StageChartType = 'bar' | 'line';

type StageChartPoint = {
  stageId: string;
  stageName: string;
  value: number;
  label: string;
};

function StageChartTypeToggle({ value, onChange }: { value: StageChartType; onChange: (value: StageChartType) => void }) {
  const { t } = useTranslation();
  return <div className="stage-chart-toggle"><button className={value === 'bar' ? 'active' : ''} type="button" onClick={() => onChange('bar')}>{t('matches.analysis.chartBar')}</button><button className={value === 'line' ? 'active' : ''} type="button" onClick={() => onChange('line')}>{t('matches.analysis.chartLine')}</button></div>;
}

type StageSeries<T> = {
  competitor: PractiscoreCompetitor;
  color: string;
} & T;

function StageComparisonChart({ title, description, details, comparisonSeries, metric, valueSuffix, chartType, onChartTypeChange }: { title: string; description: string; details: StageCompetitorDetail[]; comparisonSeries: Array<StageSeries<{ details: StageCompetitorDetail[] }>>; metric: StageComparisonMetric; valueSuffix: string; chartType: StageChartType; onChartTypeChange: (value: StageChartType) => void }) {
  const points = details.map((detail) => {
    const value = getStageComparisonValue(detail, metric) ?? 0;
    return { stageId: detail.stageId, stageName: detail.stageName, value, label: `${formatNumber(value)}${valueSuffix}` };
  });
  const comparisonPointSeries = comparisonSeries.map((series) => ({
    competitor: series.competitor,
    color: series.color,
    points: series.details.flatMap((detail) => {
      const value = getStageComparisonValue(detail, metric);
      return value === undefined ? [] : [{ stageId: detail.stageId, stageName: detail.stageName, value, label: `${formatNumber(value)}${valueSuffix}` }];
    })
  }));

  return (
    <article className="stage-comparison-chart-card">
      <div>
        <div className="stage-chart-title-row"><h4>{title}</h4><StageChartTypeToggle value={chartType} onChange={onChartTypeChange} /></div>
        <p className="muted">{description}</p>
      </div>
      <StageValueChart points={points} comparisonSeries={comparisonPointSeries} chartType={chartType} maxLabelSuffix={valueSuffix} ariaLabel={title} />
    </article>
  );
}

function getStageComparisonValue(detail: StageCompetitorDetail | undefined, metric: StageComparisonMetric): number | undefined {
  if (!detail) return undefined;
  if (metric === 'hitFactor') return detail.hitFactor;
  if (metric === 'time') return detail.time;
  return detail.points;
}

function StagePlacementChart({ points, comparisonSeries = [], chartType }: { points: StagePlacementPoint[]; comparisonSeries?: Array<StageSeries<{ points: StagePlacementPoint[] }>>; chartType: StageChartType }) {
  const chartPoints = points.map((point) => ({ stageId: point.stageId, stageName: point.stageName, value: point.placement, label: `#${point.placement}` }));
  const chartComparisonSeries = comparisonSeries.map((series) => ({
    competitor: series.competitor,
    color: series.color,
    points: series.points.map((point) => ({ stageId: point.stageId, stageName: point.stageName, value: point.placement, label: `#${point.placement}` }))
  }));
  return <StageValueChart points={chartPoints} comparisonSeries={chartComparisonSeries} chartType={chartType} minLabel="#1" maxLabelPrefix="#" ariaLabel="Stage placement trend chart" invertScale />;
}

function StageValueChart({ points, comparisonSeries = [], chartType, maxLabelSuffix = '', maxLabelPrefix = '', minLabel = '0', ariaLabel, invertScale = false }: { points: StageChartPoint[]; comparisonSeries?: Array<StageSeries<{ points: StageChartPoint[] }>>; chartType: StageChartType; maxLabelSuffix?: string; maxLabelPrefix?: string; minLabel?: string; ariaLabel: string; invertScale?: boolean }) {
  const width = 640;
  const height = 220;
  const padding = 42;
  const allComparisonPoints = comparisonSeries.flatMap((series) => series.points);
  const values = [...points.map((point) => point.value), ...allComparisonPoints.map((point) => point.value)];
  const maxValue = Math.max(...values, 1);
  const scaleMaxValue = invertScale ? maxValue + 0.75 : maxValue * 1.22;
  const groupWidth = (width - padding * 2) / Math.max(points.length, 1);
  const seriesCount = 1 + comparisonSeries.length;
  const barGap = seriesCount > 1 ? 7 : 0;
  const barWidth = Math.min(16, (groupWidth * 0.62 - barGap * (seriesCount - 1)) / seriesCount);
  const chartHeight = height - padding * 2;
  const valueToY = (value: number) => invertScale
    ? padding + ((value - 1) / Math.max(scaleMaxValue - 1, 1)) * chartHeight
    : height - padding - (value / scaleMaxValue) * chartHeight;
  const pointToX = (index: number) => padding + groupWidth * index + groupWidth / 2;
  const linePoints = points.map((point, index) => ({ ...point, x: pointToX(index), y: valueToY(point.value) }));
  const comparisonLineSeries = comparisonSeries.map((series) => ({
    ...series,
    points: series.points.flatMap((point) => {
      const index = points.findIndex((primaryPoint) => primaryPoint.stageId === point.stageId);
      return index < 0 ? [] : [{ ...point, x: pointToX(index), y: valueToY(point.value) }];
    })
  }));
  const polyline = linePoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="stage-placement-chart-wrap">
      <svg className="stage-placement-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <text x="8" y={padding + 4} className="chart-label">{maxLabelPrefix}{formatNumber(maxValue)}{maxLabelSuffix}</text>
        <text x="8" y={height - padding + 4} className="chart-label">{minLabel}</text>
        {chartType === 'line' ? <>
          <polyline points={polyline} className="placement-line" />
          {comparisonLineSeries.map((series) => <polyline key={series.competitor.internalMemberId} points={series.points.map((point) => `${point.x},${point.y}`).join(' ')} className="placement-line placement-line-comparison" style={{ '--comparison-color': series.color } as CSSProperties} />)}
          {linePoints.map((point) => { const labelY = Math.max(14, point.y - 9); return <g key={point.stageId}><circle cx={point.x} cy={point.y} r="4" className="placement-dot" /><text x={point.x} y={labelY} textAnchor="middle" className="chart-value-label">{point.label}</text><text x={point.x} y={height - 8} textAnchor="middle" className="chart-label">{point.stageName.replace(/^Stage\s+/i, 'S')}</text></g>; })}
          {comparisonLineSeries.flatMap((series) => series.points.map((point) => { const labelY = Math.min(height - padding - 8, point.y + 16); return <g key={`${series.competitor.internalMemberId}-${point.stageId}`}><circle cx={point.x} cy={point.y} r="4" className="placement-dot placement-dot-comparison" style={{ '--comparison-color': series.color } as CSSProperties} /><text x={point.x} y={labelY} textAnchor="middle" className="chart-value-label chart-label-comparison" style={{ '--comparison-color': series.color } as CSSProperties}>{point.label}</text></g>; }))}
        </> : points.map((point, index) => {
          const centerX = pointToX(index);
          const totalWidth = barWidth * seriesCount + barGap * (seriesCount - 1);
          const barItems = [{ point, color: undefined, key: 'primary' }, ...comparisonSeries.flatMap((series) => {
            const comparisonPoint = series.points.find((candidate) => candidate.stageId === point.stageId);
            return comparisonPoint ? [{ point: comparisonPoint, color: series.color, key: series.competitor.internalMemberId }] : [];
          })];
          return <g key={point.stageId}>{barItems.map((item, itemIndex) => {
            const itemHeight = invertScale ? ((scaleMaxValue - item.point.value + 1) / scaleMaxValue) * chartHeight : (item.point.value / scaleMaxValue) * chartHeight;
            const itemX = centerX - totalWidth / 2 + itemIndex * (barWidth + barGap);
            const itemY = height - padding - itemHeight;
            const labelX = itemX + barWidth / 2;
            const labelY = Math.max(14 + itemIndex * 9, itemY - 5);
            const isPrimary = item.key === 'primary';
            return <g key={item.key}><rect x={itemX} y={itemY} width={barWidth} height={itemHeight} rx="3" className={isPrimary ? 'stage-comparison-bar-primary' : 'stage-comparison-bar-comparison'} style={item.color ? { '--comparison-color': item.color } as CSSProperties : undefined} /><text x={labelX} y={labelY} textAnchor="start" className={isPrimary ? 'chart-value-label' : 'chart-value-label chart-label-comparison'} style={item.color ? { '--comparison-color': item.color } as CSSProperties : undefined} transform={`rotate(-45 ${labelX} ${labelY})`}>{item.point.label}</text></g>;
          })}<text x={centerX} y={height - 8} textAnchor="middle" className="chart-label">{point.stageName.replace(/^Stage\s+/i, 'S')}</text></g>;
        })}
      </svg>
    </div>
  );
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatPositiveGap(value: number | undefined, suffix = ''): string {
  return value === undefined ? '—' : `+${formatNumber(value)}${suffix}`;
}

function formatNegativeGap(value: number | undefined): string {
  return value === undefined ? '—' : `-${formatNumber(value)}`;
}

function formatPercent(value: number, total: number): string {
  return `${Math.round((value / total) * 1000) / 10}%`;
}
