import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { BarChart2 } from 'lucide-react';
import { db } from '../../db/schema';
import { DEFAULT_SETTINGS_ID } from '../settings/settingsRepository';
import { calculateHitBreakdown, calculateStageDetails, calculateStagePlacementTrend, type HitSlice, type StageCompetitorDetail, type StagePlacementPoint } from './practiscoreAnalysis';
import type { PractiscoreCompetitor, PractiscoreImportRecord } from './practiscoreTypes';

const ANALYSIS_COMPETITOR_STORAGE_KEY = 'shooting-logbook-analysis-competitor';
const ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY = 'shooting-logbook-analysis-compare-competitor';

export function MatchAnalysis() {
  const { t } = useTranslation();
  const practiscoreImports = useLiveQuery(() => db.practiscoreMatchImports.toArray(), []);
  const appSettings = useLiveQuery(() => db.appSettings.get(DEFAULT_SETTINGS_ID), []);
  const [selectedAnalysisMatchId, setSelectedAnalysisMatchId] = useState('');
  const [competitorQuery, setCompetitorQuery] = useState(() => readStoredAnalysisValue(ANALYSIS_COMPETITOR_STORAGE_KEY));
  const [comparisonCompetitorQuery, setComparisonCompetitorQuery] = useState(() => readStoredAnalysisValue(ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY));
  const selectedAnalysisImport = useMemo(() => findSelectedAnalysisImport(practiscoreImports ?? [], selectedAnalysisMatchId), [practiscoreImports, selectedAnalysisMatchId]);
  const ownerCompetitor = useMemo(() => findOwnerCompetitor(selectedAnalysisImport, appSettings?.ownerPractiscoreIdentifiers ?? []), [appSettings, selectedAnalysisImport]);
  const effectiveCompetitorQuery = competitorQuery || (ownerCompetitor ? competitorOptionValue(ownerCompetitor) : '');
  const selectedCompetitor = useMemo(() => findSelectedCompetitor(selectedAnalysisImport, effectiveCompetitorQuery), [selectedAnalysisImport, effectiveCompetitorQuery]);
  const comparisonCompetitor = useMemo(() => findSelectedCompetitor(selectedAnalysisImport, comparisonCompetitorQuery), [selectedAnalysisImport, comparisonCompetitorQuery]);
  const hitBreakdown = useMemo(() => calculateHitBreakdown(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonHitBreakdown = useMemo(() => calculateHitBreakdown(selectedAnalysisImport, comparisonCompetitor), [selectedAnalysisImport, comparisonCompetitor]);
  const stagePlacementTrend = useMemo(() => calculateStagePlacementTrend(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonStagePlacementTrend = useMemo(() => calculateStagePlacementTrend(selectedAnalysisImport, comparisonCompetitor), [selectedAnalysisImport, comparisonCompetitor]);
  const stageDetails = useMemo(() => calculateStageDetails(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const comparisonStageDetails = useMemo(() => calculateStageDetails(selectedAnalysisImport, comparisonCompetitor), [selectedAnalysisImport, comparisonCompetitor]);

  useEffect(() => {
    writeStoredAnalysisValue(ANALYSIS_COMPETITOR_STORAGE_KEY, competitorQuery);
  }, [competitorQuery]);

  useEffect(() => {
    writeStoredAnalysisValue(ANALYSIS_COMPARE_COMPETITOR_STORAGE_KEY, comparisonCompetitorQuery);
  }, [comparisonCompetitorQuery]);

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
        <div className="three-columns analysis-controls-grid">
          <label>
            <span>{t('matches.analysis.match')}</span>
            <select value={selectedAnalysisImport.matchEventId} onChange={(event) => setSelectedAnalysisMatchId(event.target.value)}>
              {(practiscoreImports ?? []).map((record) => <option key={record.id} value={record.matchEventId}>{record.snapshot.match.name}</option>)}
            </select>
          </label>
          <label className="analysis-competitor-field analysis-competitor-field-primary">
            <span>{t('matches.analysis.competitor')}</span>
            <input list="practiscore-competitors" value={effectiveCompetitorQuery} onChange={(event) => setCompetitorQuery(event.target.value)} placeholder={t('matches.analysis.competitorPlaceholder')} />
            <datalist id="practiscore-competitors">
              {selectedAnalysisImport.snapshot.competitors.map((competitor) => <option key={competitor.internalMemberId} value={competitorOptionValue(competitor)} />)}
            </datalist>
          </label>
          <label className="analysis-competitor-field analysis-competitor-field-comparison">
            <span>{t('matches.analysis.compareWith')}</span>
            <input list="practiscore-competitors" value={comparisonCompetitorQuery} onChange={(event) => setComparisonCompetitorQuery(event.target.value)} placeholder={t('matches.analysis.comparePlaceholder')} />
          </label>
        </div>
        {selectedCompetitor && hitBreakdown.total > 0 ? (
          <div className="analysis-charts-stack">
            <div className="hit-distribution-card">
              <div>
                <h4>{t('matches.analysis.hitDistributionTitle')}</h4>
                <p className="muted">{t('matches.analysis.hitDistributionDescription')}</p>
              </div>
              <div className="hit-analysis-grid hit-comparison-grid">
                <CompetitorHitBreakdown competitor={selectedCompetitor} breakdown={hitBreakdown} tone="primary" />
                {comparisonCompetitor && comparisonHitBreakdown.total > 0 ? <CompetitorHitBreakdown competitor={comparisonCompetitor} breakdown={comparisonHitBreakdown} tone="comparison" /> : null}
              </div>
            </div>
            {stagePlacementTrend.length > 0 && (
              <div className="stage-placement-card">
                <div>
                  <h4>{t('matches.analysis.stagePlacementTitle')}</h4>
                  <p className="muted">{t('matches.analysis.stagePlacementDescription')}</p>
                </div>
                <StagePlacementLineChart points={stagePlacementTrend} comparisonPoints={comparisonStagePlacementTrend} />
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
                  {stageDetails.map((detail) => <StageDetailCard key={detail.stageId} detail={detail} comparisonDetail={comparisonStageDetails.find((comparisonDetail) => comparisonDetail.stageId === detail.stageId)} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">{effectiveCompetitorQuery ? t('matches.analysis.noCompetitorSelected') : t('matches.analysis.pickCompetitor')}</p>
        )}
      </div>
    </section>
  );
}

function readStoredAnalysisValue(key: string): string {
  return window.localStorage.getItem(key) ?? '';
}

function writeStoredAnalysisValue(key: string, value: string): void {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    window.localStorage.setItem(key, trimmedValue);
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

  const aliasFromQuery = extractAliasFromQuery(query);

  return record.snapshot.competitors.find((competitor) => aliasFromQuery && competitor.alias?.toLowerCase() === aliasFromQuery.toLowerCase())
    ?? record.snapshot.competitors.find((competitor) => competitor.alias?.toLowerCase() === normalizedQuery)
    ?? record.snapshot.competitors.find((competitor) => competitorOptionValue(competitor).toLowerCase() === normalizedQuery)
    ?? record.snapshot.competitors.find((competitor) => competitor.displayName.toLowerCase() === normalizedQuery)
    ?? record.snapshot.competitors.find((competitor) => competitorOptionValue(competitor).toLowerCase().includes(normalizedQuery));
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

function CompetitorHitBreakdown({ competitor, breakdown, tone }: { competitor: PractiscoreCompetitor; breakdown: { total: number; slices: HitSlice[] }; tone: 'primary' | 'comparison' }) {
  const { t } = useTranslation();

  return (
    <div className={`competitor-hit-card competitor-hit-card-${tone}`}>
      <HitPieChart slices={breakdown.slices} />
      <div className="hit-legend">
        <h4>{competitor.displayName}</h4>
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

function StageDetailCard({ detail, comparisonDetail }: { detail: StageCompetitorDetail; comparisonDetail?: StageCompetitorDetail }) {
  return (
    <article className="stage-detail-card">
      <div className="stage-detail-header">
        <h5>{detail.stageName} <small>({detail.minRounds ?? '—'}/{detail.maxPoints ?? '—'})</small></h5>
      </div>
      <StageDetailMetrics detail={detail} tone="primary" />
      {comparisonDetail ? <StageDetailMetrics detail={comparisonDetail} tone="comparison" /> : null}
    </article>
  );
}

function StageDetailMetrics({ detail, tone }: { detail: StageCompetitorDetail; tone: 'primary' | 'comparison' }) {
  return (
    <div className={`stage-detail-metrics stage-detail-metrics-${tone}`}>
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

function StagePlacementLineChart({ points, comparisonPoints = [] }: { points: StagePlacementPoint[]; comparisonPoints?: StagePlacementPoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 34;
  const maxPlacement = Math.max(...points.map((point) => point.placement), ...comparisonPoints.map((point) => point.placement), 1);
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: padding + index * xStep,
    y: padding + ((point.placement - 1) / Math.max(maxPlacement - 1, 1)) * (height - padding * 2)
  }));
  const comparisonChartPoints = comparisonPoints.flatMap((point) => {
    const stageIndex = points.findIndex((primaryPoint) => primaryPoint.stageId === point.stageId);
    if (stageIndex < 0) return [];
    return [{
      ...point,
      x: padding + stageIndex * xStep,
      y: padding + ((point.placement - 1) / Math.max(maxPlacement - 1, 1)) * (height - padding * 2)
    }];
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const comparisonPolyline = comparisonChartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="stage-placement-chart-wrap">
      <svg className="stage-placement-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stage placement trend line chart">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <text x="8" y={padding + 4} className="chart-label">#1</text>
        <text x="8" y={height - padding + 4} className="chart-label">#{maxPlacement}</text>
        <polyline points={polyline} className="placement-line" />
        {comparisonPolyline ? <polyline points={comparisonPolyline} className="placement-line placement-line-comparison" /> : null}
        {chartPoints.map((point) => (
          <g key={point.stageId}>
            <circle cx={point.x} cy={point.y} r="4" className="placement-dot" />
            <text x={point.x} y={point.y - 9} textAnchor="middle" className="chart-label">#{point.placement}</text>
            <text x={point.x} y={height - 8} textAnchor="middle" className="chart-label">{point.stageName.replace(/^Stage\s+/i, 'S')}</text>
          </g>
        ))}
        {comparisonChartPoints.map((point) => (
          <g key={`comparison-${point.stageId}`}>
            <circle cx={point.x} cy={point.y} r="4" className="placement-dot placement-dot-comparison" />
            <text x={point.x} y={point.y + 16} textAnchor="middle" className="chart-label chart-label-comparison">#{point.placement}</text>
          </g>
        ))}
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
