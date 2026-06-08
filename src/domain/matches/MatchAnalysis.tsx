import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { BarChart2 } from 'lucide-react';
import { db } from '../../db/schema';
import { DEFAULT_SETTINGS_ID } from '../settings/settingsRepository';
import { calculateHitBreakdown, calculateStageDetails, calculateStagePlacementTrend, type HitSlice, type StageCompetitorDetail, type StagePlacementPoint } from './practiscoreAnalysis';
import type { PractiscoreCompetitor, PractiscoreImportRecord } from './practiscoreTypes';

export function MatchAnalysis() {
  const { t } = useTranslation();
  const practiscoreImports = useLiveQuery(() => db.practiscoreMatchImports.toArray(), []);
  const appSettings = useLiveQuery(() => db.appSettings.get(DEFAULT_SETTINGS_ID), []);
  const [selectedAnalysisMatchId, setSelectedAnalysisMatchId] = useState('');
  const [competitorQuery, setCompetitorQuery] = useState('');
  const selectedAnalysisImport = useMemo(() => findSelectedAnalysisImport(practiscoreImports ?? [], selectedAnalysisMatchId), [practiscoreImports, selectedAnalysisMatchId]);
  const ownerCompetitor = useMemo(() => findOwnerCompetitor(selectedAnalysisImport, appSettings?.ownerPractiscoreIdentifiers ?? []), [appSettings, selectedAnalysisImport]);
  const effectiveCompetitorQuery = competitorQuery || (ownerCompetitor ? competitorOptionValue(ownerCompetitor) : '');
  const selectedCompetitor = useMemo(() => findSelectedCompetitor(selectedAnalysisImport, effectiveCompetitorQuery), [selectedAnalysisImport, effectiveCompetitorQuery]);
  const hitBreakdown = useMemo(() => calculateHitBreakdown(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const stagePlacementTrend = useMemo(() => calculateStagePlacementTrend(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);
  const stageDetails = useMemo(() => calculateStageDetails(selectedAnalysisImport, selectedCompetitor), [selectedAnalysisImport, selectedCompetitor]);

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
        <div className="two-columns">
          <label>
            <span>{t('matches.analysis.match')}</span>
            <select value={selectedAnalysisImport.matchEventId} onChange={(event) => setSelectedAnalysisMatchId(event.target.value)}>
              {(practiscoreImports ?? []).map((record) => <option key={record.id} value={record.matchEventId}>{record.snapshot.match.name}</option>)}
            </select>
          </label>
          <label>
            <span>{t('matches.analysis.competitor')}</span>
            <input list="practiscore-competitors" value={effectiveCompetitorQuery} onChange={(event) => setCompetitorQuery(event.target.value)} placeholder={t('matches.analysis.competitorPlaceholder')} />
            <datalist id="practiscore-competitors">
              {selectedAnalysisImport.snapshot.competitors.map((competitor) => <option key={competitor.internalMemberId} value={competitorOptionValue(competitor)} />)}
            </datalist>
          </label>
        </div>
        {selectedCompetitor && hitBreakdown.total > 0 ? (
          <div className="analysis-charts-stack">
            <div className="hit-analysis-grid">
              <HitPieChart slices={hitBreakdown.slices} />
              <div className="hit-legend">
                <h4>{selectedCompetitor.displayName}</h4>
                <p className="muted">{t('matches.analysis.totalHits', { count: hitBreakdown.total })}</p>
                {hitBreakdown.slices.map((slice) => (
                  <div className="hit-legend-row" key={slice.key}>
                    <span className="hit-legend-color" style={{ background: slice.color }} />
                    <span>{t(`matches.analysis.labels.${slice.key}`)}</span>
                    <strong>{slice.value} · {formatPercent(slice.value, hitBreakdown.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
            {stagePlacementTrend.length > 0 && (
              <div className="stage-placement-card">
                <div>
                  <h4>{t('matches.analysis.stagePlacementTitle')}</h4>
                  <p className="muted">{t('matches.analysis.stagePlacementDescription')}</p>
                </div>
                <StagePlacementLineChart points={stagePlacementTrend} />
              </div>
            )}
            {stageDetails.length > 0 && (
              <div className="stage-details-card">
                <div>
                  <h4>{t('matches.analysis.stageDetailsTitle')}</h4>
                  <p className="muted">{t('matches.analysis.stageDetailsDescription')}</p>
                </div>
                <div className="stage-details-grid">
                  {stageDetails.map((detail) => <StageDetailCard key={detail.stageId} detail={detail} />)}
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

function StageDetailCard({ detail }: { detail: StageCompetitorDetail }) {
  return (
    <article className="stage-detail-card">
      <div className="stage-detail-header">
        <h5>{detail.stageName}</h5>
        <span>{formatNumber(detail.hitFactor)} HF</span>
      </div>
      <div className="stage-detail-meta">
        <span>Min {detail.minRounds ?? '—'}</span>
        <span>Max {detail.maxPoints ?? '—'}</span>
        <span>{formatNumber(detail.time)}s</span>
      </div>
      <div className="stage-hit-row">
        <StageHit label="A" value={detail.alpha} tone="alpha" />
        <StageHit label="C" value={detail.charlie} tone="charlie" />
        <StageHit label="D" value={detail.delta} tone="delta" />
        <StageHit label="M" value={detail.miss} tone="miss" />
        <StageHit label="NS" value={detail.noShoot} tone="noShoot" />
        <StageHit label="P" value={detail.procedurals} tone="procedural" />
      </div>
    </article>
  );
}

function StageHit({ label, value, tone }: { label: string; value: number; tone: 'alpha' | 'charlie' | 'delta' | 'miss' | 'noShoot' | 'procedural' }) {
  return <span className={`stage-hit stage-hit-${tone}`}><strong>{value}</strong><small>{label}</small></span>;
}

function StagePlacementLineChart({ points }: { points: StagePlacementPoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 34;
  const maxPlacement = Math.max(...points.map((point) => point.placement), 1);
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: padding + index * xStep,
    y: padding + ((point.placement - 1) / Math.max(maxPlacement - 1, 1)) * (height - padding * 2)
  }));
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="stage-placement-chart-wrap">
      <svg className="stage-placement-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stage placement trend line chart">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <text x="8" y={padding + 4} className="chart-label">#1</text>
        <text x="8" y={height - padding + 4} className="chart-label">#{maxPlacement}</text>
        <polyline points={polyline} className="placement-line" />
        {chartPoints.map((point) => (
          <g key={point.stageId}>
            <circle cx={point.x} cy={point.y} r="4" className="placement-dot" />
            <text x={point.x} y={point.y - 9} textAnchor="middle" className="chart-label">#{point.placement}</text>
            <text x={point.x} y={height - 8} textAnchor="middle" className="chart-label">{point.stageName.replace(/^Stage\s+/i, 'S')}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number, total: number): string {
  return `${Math.round((value / total) * 1000) / 10}%`;
}
