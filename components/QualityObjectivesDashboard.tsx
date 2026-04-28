import React, { useEffect, useMemo, useState } from 'react';
import { DashboardFrame } from './DashboardUI';
import { Icons } from './Icon';
import {
  LoadingState,
  QualityObjectiveRecord,
  QualityObjectiveScaleRecord,
  QualityObjectiveSummaryRecord,
} from '../types';
import {
  fetchQualityObjectivesData,
  fetchQualityObjectivesScalesData,
  fetchQualityObjectivesSummaryData,
} from '../services/dataService';

interface QualityObjectivesDashboardProps {
  legacySheetUrl?: string;
  summarySheetUrl?: string;
  scalesSheetUrl?: string;
  onBack: () => void;
}

type LegacyDisplayRow = {
  rowType: 'requirement' | 'scale' | 'bonus';
  area: string;
  indicator: string;
  period: string;
  year: number;
  validFrom: string;
  validTo: string;
  goalText: string;
  goalValue: number | null;
  scaleLabel: string;
  fromValue: number | null;
  toValue: number | null;
  rangeText: string;
  impactText: string;
  impactType: string;
  order: number;
};

type EvaluationResult = {
  status: 'pending' | 'matched' | 'ok' | 'miss';
  level: string;
  resultType: string;
  percentValue: number;
  percentText: string;
  amount: number;
  message: string;
};

type ScaleCardGroup = {
  key: string;
  area: string;
  indicator: string;
  period: string;
  resultType: string;
  inputType: string;
  unit: string;
  objectiveText: string;
  rows: QualityObjectiveScaleRecord[];
};

const AREA_THEME: Record<string, { badge: string; glow: string; accent: string; text: string; panel: string }> = {
  ventas: {
    badge: 'border-amber-200/80 bg-amber-50 text-amber-700',
    glow: 'bg-amber-400/10',
    accent: 'from-slate-900 via-slate-800 to-amber-600',
    text: 'text-amber-600',
    panel: 'border-amber-200/50 bg-amber-50/60',
  },
  postventa: {
    badge: 'border-cyan-200/80 bg-cyan-50 text-cyan-700',
    glow: 'bg-cyan-400/10',
    accent: 'from-slate-900 via-slate-800 to-cyan-600',
    text: 'text-cyan-600',
    panel: 'border-cyan-200/50 bg-cyan-50/60',
  },
};

const normalizeText = (value: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const pickAreaTheme = (area: string) => AREA_THEME[normalizeText(area)] || AREA_THEME.postventa;

const formatDate = (value: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR');
};

const formatPercent = (value: number) => `${(value * 100).toFixed(2).replace('.', ',')}%`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatGoalValue = (value: number | null, unit: string, fallback: string) => {
  if (value == null) return fallback || '-';
  if (unit === 'porcentaje') return formatPercent(value);
  return String(value).replace('.', ',');
};

const formatCompactMetric = (value: number | null, unit: string) => {
  if (value == null) return '-';
  if (unit === 'porcentaje') return `${(value * 100).toFixed(2).replace('.', ',')}%`;
  return String(value).replace('.', ',');
};

const formatRuleThreshold = (rule: QualityObjectiveScaleRecord, inputType: string, unit: string) => {
  if (inputType === 'booleano') return rule.desde_valor === 1 || rule.hasta_valor === 1 ? 'Cumple' : 'No cumple';
  if (rule.operador === '>=' || rule.operador === '>') return formatCompactMetric(rule.desde_valor, unit);
  if (rule.operador === '<=' || rule.operador === '<') return formatCompactMetric(rule.hasta_valor ?? rule.desde_valor, unit);
  if (rule.desde_valor != null) return formatCompactMetric(rule.desde_valor, unit);
  if (rule.hasta_valor != null) return formatCompactMetric(rule.hasta_valor, unit);
  return rule.rango_mostrar || '-';
};

const getScaleCardLabels = (group: ScaleCardGroup) => {
  const normalizedIndicator = normalizeText(group.indicator);

  if (group.resultType === 'cobro') {
    return { threshold: 'Valor minimo', impact: '% cobro' };
  }

  if (group.resultType === 'bonus') {
    return {
      threshold: group.inputType === 'booleano' ? 'Condicion' : 'Valor minimo',
      impact: 'Bonus max',
    };
  }

  if (normalizedIndicator.includes('dac')) {
    return { threshold: 'Valor maximo', impact: 'Descuento' };
  }

  return { threshold: 'Valor objetivo', impact: 'Descuento' };
};

const getImpactBadgeStyle = (resultType: string) => {
  if (resultType === 'cobro') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (resultType === 'bonus') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

const parseWholesale = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseInputValue = (rawValue: string, unit: string) => {
  let normalized = rawValue.replace(/\s/g, '').replace('%', '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  if (unit === 'porcentaje' && parsed > 1) return parsed / 100;
  return parsed;
};

const matchesToken = (left: string, right: string) => normalizeText(left) === normalizeText(right);

const periodMatches = (selectedPeriod: string, rowPeriod: string) => {
  if (selectedPeriod === 'all') return true;
  const normalizedSelected = normalizeText(selectedPeriod);
  const normalizedRow = normalizeText(rowPeriod);
  return normalizedRow === normalizedSelected || normalizedRow === 'anual';
};

const compareByOperator = (value: number, operator: string, fromValue: number | null, toValue: number | null) => {
  switch (operator) {
    case '>=':
      return fromValue != null ? value >= fromValue : false;
    case '<=':
      return toValue != null ? value <= toValue : fromValue != null ? value <= fromValue : false;
    case '>':
      return fromValue != null ? value > fromValue : toValue != null ? value > toValue : false;
    case '<':
      return toValue != null ? value < toValue : fromValue != null ? value < fromValue : false;
    case '=':
      return fromValue != null ? Math.abs(value - fromValue) < 0.00001 : false;
    default:
      if (fromValue != null && toValue == null) return Math.abs(value - fromValue) < 0.00001;
      if (toValue != null && fromValue == null) return Math.abs(value - toValue) < 0.00001;
      return false;
  }
};

const toLegacySummary = (rows: QualityObjectiveRecord[]): QualityObjectiveSummaryRecord[] =>
  rows
    .filter(row => row.tipo_registro !== 'escala')
    .map((row, index) => ({
      id: `legacy-summary-${index + 1}`,
      area: row.area,
      indicador: row.indicador,
      periodo: row.periodo,
      anio: row.anio,
      vigencia_desde: row.vigencia_desde,
      vigencia_hasta: row.vigencia_hasta,
      tipo_input: row.tipo_registro === 'bonus' ? 'booleano' : 'numero',
      tipo_resultado: row.tipo_registro === 'bonus' ? 'bonus' : row.impacto_tipo || 'requisito',
      tipo_objetivo: row.tipo_registro === 'bonus' ? 'bonus' : 'requisito',
      objetivo_texto: row.requisito_mostrar,
      objetivo_valor: null,
      unidad: '',
      orden: index + 1,
      tiene_escala: rows.some(candidate => candidate.area === row.area && candidate.indicador === row.indicador && candidate.periodo === row.periodo && candidate.tipo_registro === 'escala'),
      tiene_bonus: row.tipo_registro === 'bonus',
      activa: true,
    }));

const toLegacyScales = (rows: QualityObjectiveRecord[]): QualityObjectiveScaleRecord[] =>
  rows
    .filter(row => row.tipo_registro === 'escala')
    .map((row, index) => ({
      id: `legacy-scale-${index + 1}`,
      area: row.area,
      indicador: row.indicador,
      periodo: row.periodo,
      anio: row.anio,
      vigencia_desde: row.vigencia_desde,
      vigencia_hasta: row.vigencia_hasta,
      escala: row.escala,
      operador: row.rango_mostrar.includes('>=') ? '>=' : row.rango_mostrar.includes('<=') ? '<=' : row.rango_mostrar.includes('<') ? '<' : row.rango_mostrar.includes('>') ? '>' : '=',
      desde_valor: row.desde,
      hasta_valor: row.hasta,
      rango_mostrar: row.rango_mostrar,
      impacto_valor: null,
      impacto_texto: row.impacto_mostrar,
      impacto_tipo: row.impacto_tipo,
      orden: Number(row.escala?.replace(/[^\d]/g, '')) || index + 1,
    }));

const QualityObjectivesDashboard: React.FC<QualityObjectivesDashboardProps> = ({
  legacySheetUrl = '',
  summarySheetUrl = '',
  scalesSheetUrl = '',
  onBack,
}) => {
  const [summaryRows, setSummaryRows] = useState<QualityObjectiveSummaryRecord[]>([]);
  const [scaleRows, setScaleRows] = useState<QualityObjectiveScaleRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [sourceMode, setSourceMode] = useState<'clean' | 'legacy'>('legacy');
  const [activeTab, setActiveTab] = useState<'simulator' | 'scales'>('simulator');
  const [wholesaleInput, setWholesaleInput] = useState<string>('');
  const [simValues, setSimValues] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(LoadingState.LOADING);
      setErrorMessage(null);

      try {
        if (summarySheetUrl && scalesSheetUrl) {
          const [summary, scales] = await Promise.all([
            fetchQualityObjectivesSummaryData(summarySheetUrl),
            fetchQualityObjectivesScalesData(scalesSheetUrl),
          ]);
          setSummaryRows(summary);
          setScaleRows(scales);
          setSourceMode('clean');
          setLoading(LoadingState.SUCCESS);
          return;
        }

        const legacy = await fetchQualityObjectivesData(legacySheetUrl);
        setSummaryRows(toLegacySummary(legacy));
        setScaleRows(toLegacyScales(legacy));
        setSourceMode('legacy');
        setLoading(LoadingState.SUCCESS);
      } catch (error: any) {
        setLoading(LoadingState.ERROR);
        setErrorMessage(error?.message || 'No se pudieron cargar los objetivos.');
      }
    };

    loadData();
  }, [legacySheetUrl, retryCount, scalesSheetUrl, summarySheetUrl]);

  const activeSummaries = useMemo(
    () => summaryRows.filter(row => row.activa !== false),
    [summaryRows]
  );

  const availableYears = useMemo(
    () => Array.from(new Set(activeSummaries.map(item => item.anio).filter(Boolean))).sort((a, b) => b - a),
    [activeSummaries]
  );

  const availableAreas = useMemo(
    () => Array.from(new Set(activeSummaries.map(item => item.area).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [activeSummaries]
  );

  useEffect(() => {
    if (selectedYear === 'all' && availableYears.length > 0) setSelectedYear(String(availableYears[0]));
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (selectedArea === 'all' && availableAreas.length > 0) setSelectedArea(availableAreas[0]);
  }, [availableAreas, selectedArea]);

  const periodOptions = useMemo(() => {
    return Array.from(
      new Set(
        activeSummaries
          .filter(item => (selectedArea === 'all' ? true : matchesToken(item.area, selectedArea)))
          .filter(item => (selectedYear === 'all' ? true : String(item.anio) === selectedYear))
          .filter(item => normalizeText(item.periodo) !== 'anual')
          .map(item => item.periodo)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [activeSummaries, selectedArea, selectedYear]);

  useEffect(() => {
    if (selectedPeriod === 'all' && periodOptions.length > 0) setSelectedPeriod(periodOptions[0]);
  }, [periodOptions, selectedPeriod]);

  const filteredIndicators = useMemo(() => {
    return activeSummaries
      .filter(item => (selectedArea === 'all' ? true : matchesToken(item.area, selectedArea)))
      .filter(item => (selectedYear === 'all' ? true : String(item.anio) === selectedYear))
      .filter(item => periodMatches(selectedPeriod, item.periodo))
      .sort((left, right) => left.orden - right.orden || left.indicador.localeCompare(right.indicador));
  }, [activeSummaries, selectedArea, selectedYear, selectedPeriod]);

  const groupedSections = useMemo(() => {
    const byArea = filteredIndicators.reduce<Record<string, QualityObjectiveSummaryRecord[]>>((acc, item) => {
      if (!acc[item.area]) acc[item.area] = [];
      acc[item.area].push(item);
      return acc;
    }, {});

    return Object.entries(byArea).map(([area, items]) => ({ area, items }));
  }, [filteredIndicators]);

  const scaleCardGroups = useMemo(() => {
    const groups = scaleRows
      .filter(rule => (selectedArea === 'all' ? true : matchesToken(rule.area, selectedArea)))
      .filter(rule => (selectedYear === 'all' ? true : String(rule.anio) === selectedYear))
      .filter(rule => periodMatches(selectedPeriod, rule.periodo))
      .reduce<Record<string, ScaleCardGroup>>((acc, rule) => {
        const matchingSummary = activeSummaries.find(summary =>
          matchesToken(summary.area, rule.area) &&
          matchesToken(summary.indicador, rule.indicador) &&
          String(summary.anio) === String(rule.anio) &&
          matchesToken(summary.periodo, rule.periodo)
        ) || activeSummaries.find(summary =>
          matchesToken(summary.area, rule.area) &&
          matchesToken(summary.indicador, rule.indicador) &&
          String(summary.anio) === String(rule.anio) &&
          normalizeText(summary.periodo) === 'anual'
        );

        const key = `${rule.area}__${rule.indicador}__${rule.periodo}__${rule.anio}`;
        if (!acc[key]) {
          acc[key] = {
            key,
            area: rule.area,
            indicator: rule.indicador,
            period: rule.periodo,
            resultType: matchingSummary?.tipo_resultado || rule.impacto_tipo || 'requisito',
            inputType: matchingSummary?.tipo_input || 'numero',
            unit: matchingSummary?.unidad || '',
            objectiveText: matchingSummary?.objetivo_texto || '',
            rows: [],
          };
        }
        acc[key].rows.push(rule);
        return acc;
      }, {});

    return Object.values(groups)
      .map(group => ({
        ...group,
        rows: [...group.rows].sort((a, b) => a.orden - b.orden),
      }))
      .sort((a, b) => a.indicator.localeCompare(b.indicator));
  }, [activeSummaries, scaleRows, selectedArea, selectedPeriod, selectedYear]);

  const wholesaleValue = useMemo(() => parseWholesale(wholesaleInput), [wholesaleInput]);

  const evaluations = useMemo(() => {
    const result: Record<string, EvaluationResult> = {};

    filteredIndicators.forEach(indicator => {
      const rawInput = simValues[indicator.id];
      if (indicator.tipo_input === 'booleano') {
        if (typeof rawInput !== 'boolean') {
          result[indicator.id] = {
            status: 'pending',
            level: '-',
            resultType: indicator.tipo_resultado,
            percentValue: 0,
            percentText: '-',
            amount: 0,
            message: 'Seleccione si cumple o no cumple.',
          };
          return;
        }

        const numericValue = rawInput ? 1 : 0;
        const matchingRule = scaleRows
          .filter(rule => matchesToken(rule.area, indicator.area))
          .filter(rule => matchesToken(rule.indicador, indicator.indicador))
          .filter(rule => rule.anio === indicator.anio)
          .filter(rule => periodMatches(indicator.periodo, rule.periodo))
          .sort((a, b) => a.orden - b.orden)
          .find(rule => compareByOperator(numericValue, rule.operador, rule.desde_valor, rule.hasta_valor));

        if (matchingRule) {
          const percentValue = matchingRule.impacto_valor ?? 0;
          result[indicator.id] = {
            status: 'matched',
            level: matchingRule.escala || '-',
            resultType: matchingRule.impacto_tipo || indicator.tipo_resultado,
            percentValue,
            percentText: matchingRule.impacto_texto || formatPercent(percentValue),
            amount: 0,
            message: rawInput ? 'Cumple el objetivo.' : 'No cumple el objetivo.',
          };
        } else {
          const success = indicator.objetivo_valor == null ? rawInput : numericValue === indicator.objetivo_valor;
          result[indicator.id] = {
            status: success ? 'ok' : 'miss',
            level: success ? 'OK' : 'NO',
            resultType: indicator.tipo_resultado,
            percentValue: 0,
            percentText: success ? 'Cumple' : 'No cumple',
            amount: 0,
            message: success ? 'Condición cumplida.' : 'Condición no cumplida.',
          };
        }
        return;
      }

      const parsedValue = typeof rawInput === 'string' ? parseInputValue(rawInput, indicator.unidad) : null;
      if (parsedValue == null) {
        result[indicator.id] = {
          status: 'pending',
          level: '-',
          resultType: indicator.tipo_resultado,
          percentValue: 0,
          percentText: '-',
          amount: 0,
          message: 'Ingrese el valor obtenido.',
        };
        return;
      }

      const matchingRule = scaleRows
        .filter(rule => matchesToken(rule.area, indicator.area))
        .filter(rule => matchesToken(rule.indicador, indicator.indicador))
        .filter(rule => rule.anio === indicator.anio)
        .filter(rule => periodMatches(indicator.periodo, rule.periodo))
        .sort((a, b) => a.orden - b.orden)
        .find(rule => compareByOperator(parsedValue, rule.operador, rule.desde_valor, rule.hasta_valor));

      if (matchingRule) {
        const percentValue = matchingRule.impacto_valor ?? 0;
        result[indicator.id] = {
          status: 'matched',
          level: matchingRule.escala || '-',
          resultType: matchingRule.impacto_tipo || indicator.tipo_resultado,
          percentValue,
          percentText: matchingRule.impacto_texto || formatPercent(percentValue),
          amount: 0,
          message: matchingRule.rango_mostrar || 'Regla aplicada.',
        };
      } else {
        const goalOk = indicator.objetivo_valor == null ? true : parsedValue >= indicator.objetivo_valor;
        result[indicator.id] = {
          status: goalOk ? 'ok' : 'miss',
          level: goalOk ? 'OBJ' : 'BAJO',
          resultType: indicator.tipo_resultado,
          percentValue: 0,
          percentText: goalOk ? 'Cumple objetivo' : 'No llega al objetivo',
          amount: 0,
          message: `Valor cargado: ${formatGoalValue(parsedValue, indicator.unidad, '')}`,
        };
      }
    });

    const baseCobroPercent = Object.values(result).reduce((acc, evaluation) => {
      if (evaluation.status === 'pending') return acc;
      if (evaluation.resultType === 'cobro') return acc + evaluation.percentValue;
      return acc;
    }, 0);

    const baseAwardAmount = wholesaleValue * baseCobroPercent;

    Object.values(result).forEach(evaluation => {
      if (evaluation.status === 'pending') {
        evaluation.amount = 0;
        return;
      }

      if (evaluation.resultType === 'descuento') {
        evaluation.amount = -(baseAwardAmount * evaluation.percentValue);
        return;
      }

      if (evaluation.resultType === 'bonus') {
        evaluation.amount = baseAwardAmount * evaluation.percentValue;
        return;
      }

      evaluation.amount = wholesaleValue * evaluation.percentValue;
    });

    return result;
  }, [filteredIndicators, scaleRows, simValues, wholesaleValue]);

  const totals = useMemo(() => {
    return Object.values(evaluations).reduce(
      (acc, evaluation) => {
        if (evaluation.status === 'pending') return acc;
        if (evaluation.resultType === 'cobro') acc.cobro += evaluation.percentValue;
        else if (evaluation.resultType === 'descuento') acc.descuento += evaluation.percentValue;
        else if (evaluation.resultType === 'bonus') acc.bonus += evaluation.percentValue;
        return acc;
      },
      { cobro: 0, descuento: 0, bonus: 0 }
    );
  }, [evaluations]);

  const baseAwardAmount = wholesaleValue * totals.cobro;
  const discountAmount = baseAwardAmount * totals.descuento;
  const bonusAmount = baseAwardAmount * totals.bonus;
  const netAmount = baseAwardAmount - discountAmount + bonusAmount;

  const filters = (
    <div className="space-y-3">
      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Icons.Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Simulador</p>
            <p className="text-[13px] font-black text-slate-950">Configuración</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Area</span>
            <select
              value={selectedArea}
              onChange={event => setSelectedArea(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              {availableAreas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Ano</span>
            <select
              value={selectedYear}
              onChange={event => setSelectedYear(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              {availableYears.map(year => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Periodo</span>
            <select
              value={selectedPeriod}
              onChange={event => setSelectedPeriod(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              {periodOptions.map(period => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Wholesale base</span>
            <input
              value={wholesaleInput}
              onChange={event => setWholesaleInput(event.target.value)}
              placeholder="15000000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Fuente actual</p>
        <p className="mt-1 text-[13px] font-black text-slate-950">
          {sourceMode === 'clean' ? 'Simulador limpio desde sheets' : 'Sheet legado'}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          Configurás objetivos y reglas en Sheets. Los valores obtenidos se cargan acá en la web.
        </p>
      </div>
    </div>
  );

  return (
    <DashboardFrame
      title="Simulador Ventas / Postventa"
      subtitle="Cálculo de cobro, descuento y bonus desde Google Sheets"
      lastUpdated={new Date().toLocaleTimeString('es-AR')}
      onBack={onBack}
      isLoading={loading === LoadingState.LOADING}
      filters={filters}
      className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)]"
    >
      {loading === LoadingState.ERROR ? (
        <div className="rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Icons.AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-950">No se pudieron cargar los datos del simulador</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{errorMessage}</p>
          <button
            onClick={() => setRetryCount(count => count + 1)}
            className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          <section className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#1d4ed8_100%)] px-5 py-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.15)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-sky-200/80">Programa 2026</p>
                <h2 className="mt-2 text-[1.3rem] font-black uppercase italic leading-tight tracking-tight md:text-[1.8rem]">
                  Simulador de cobro
                </h2>
                <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-200/85 md:text-[13px]">
                  Cargás wholesale y resultados obtenidos. El sistema evalúa reglas y estima cobros, descuentos y bonus.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:w-[460px]">
                {[
                  { label: 'Indicadores', value: filteredIndicators.length, icon: Icons.Target },
                  { label: 'Cobro', value: formatPercent(totals.cobro), icon: Icons.TrendingUp },
                  { label: 'Descuento', value: formatPercent(totals.descuento), icon: Icons.TrendingDown },
                  { label: 'Bonus', value: formatPercent(totals.bonus), icon: Icons.Star },
                ].map(item => (
                  <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/10 p-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-200/75">{item.label}</p>
                        <p className="mt-1 text-sm font-black tracking-tight text-white">{item.value}</p>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/12 text-white">
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/92 p-2 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('simulator')}
                className={`rounded-[1rem] px-4 py-3 text-left transition ${
                  activeTab === 'simulator'
                    ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">Vista</p>
                <p className="mt-1 text-[13px] font-black">Simulador</p>
              </button>
              <button
                onClick={() => setActiveTab('scales')}
                className={`rounded-[1rem] px-4 py-3 text-left transition ${
                  activeTab === 'scales'
                    ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">Vista</p>
                <p className="mt-1 text-[13px] font-black">Escalas</p>
              </button>
            </div>
          </section>

          {activeTab === 'simulator' ? (
          <>
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Wholesale</p>
              <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(wholesaleValue)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Cobro base</p>
              <p className="mt-1 text-lg font-black text-emerald-600">{formatPercent(totals.cobro)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Descuento</p>
              <p className="mt-1 text-lg font-black text-rose-600">{formatPercent(totals.descuento)}</p>
              {totals.descuento > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">Aplicado sobre premio base: {formatCurrency(discountAmount)}</p>
              ) : null}
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Neto estimado</p>
              <p className={`mt-1 text-lg font-black ${netAmount >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(netAmount)}</p>
              {totals.bonus > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">Incluye bonus sobre premio base: {formatCurrency(bonusAmount)}</p>
              ) : null}
            </div>
          </section>

          {groupedSections.map(section => {
            const theme = pickAreaTheme(section.area);
            return (
              <section
                key={section.area}
                className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
              >
                <div className={`pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full blur-3xl ${theme.glow}`} />
                <div className="relative mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${theme.badge}`}>
                      {section.area}
                    </div>
                    <h2 className="mt-1 text-[1.05rem] font-black tracking-tight text-slate-950">{section.area}</h2>
                  </div>
                  <div className={`rounded-[0.95rem] border px-3 py-1.5 shadow-sm ${theme.panel}`}>
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Periodo</p>
                    <p className={`mt-0.5 text-[13px] font-black ${theme.text}`}>{selectedPeriod}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                  {section.items.map(indicator => {
                    const evaluation = evaluations[indicator.id];
                    const statusClass =
                      evaluation?.status === 'matched' || evaluation?.status === 'ok'
                        ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
                        : evaluation?.status === 'miss'
                          ? 'border-rose-200 bg-rose-50/90 text-rose-700'
                          : 'border-slate-200 bg-slate-100/90 text-slate-700';

                    return (
                      <article
                        key={indicator.id}
                        className="overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
                      >
                        <div className={`relative overflow-hidden bg-gradient-to-r ${theme.accent} px-3 py-2.5 text-white`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-[0.18em] text-white/75">Indicador</p>
                              <h3 className="mt-0.5 text-[0.92rem] font-black tracking-tight">{indicator.indicador}</h3>
                              <p className="mt-0.5 text-[10px] text-white/80">
                                Objetivo: {indicator.objetivo_texto || formatGoalValue(indicator.objetivo_valor, indicator.unidad, '-')}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/20 bg-white/12 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]">
                              {indicator.tipo_resultado}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 p-2.5">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[1.2fr_0.95fr]">
                            <div className="rounded-[0.9rem] border border-slate-200 bg-slate-50/70 p-2.5">
                              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Valor obtenido</p>
                              {indicator.tipo_input === 'booleano' ? (
                                <div className="mt-2 flex gap-1.5">
                                  <button
                                    onClick={() => setSimValues(prev => ({ ...prev, [indicator.id]: true }))}
                                    className={`rounded-full px-3 py-1.5 text-[10px] font-black transition ${simValues[indicator.id] === true ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
                                  >
                                    Si
                                  </button>
                                  <button
                                    onClick={() => setSimValues(prev => ({ ...prev, [indicator.id]: false }))}
                                    className={`rounded-full px-3 py-1.5 text-[10px] font-black transition ${simValues[indicator.id] === false ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <input
                                  value={typeof simValues[indicator.id] === 'string' ? (simValues[indicator.id] as string) : ''}
                                  onChange={event => setSimValues(prev => ({ ...prev, [indicator.id]: event.target.value }))}
                                  placeholder={indicator.unidad === 'porcentaje' ? '95 o 95%' : '4,86'}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 outline-none transition focus:border-cyan-300"
                                />
                              )}
                            </div>

                            <div className={`rounded-[0.9rem] border p-2.5 ${statusClass}`}>
                              <p className="text-[7px] font-black uppercase tracking-[0.12em] opacity-70">Resultado</p>
                              <div className="mt-1 flex items-end justify-between gap-2">
                                <p className="text-[14px] font-black">{evaluation?.level || '-'}</p>
                                <p className="text-[10px] font-black opacity-80">{evaluation?.percentText || '-'}</p>
                              </div>
                              <p className="mt-1 text-[10px] leading-4 opacity-80">{evaluation?.message || 'Sin evaluar'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div className="rounded-[0.9rem] border border-slate-200 bg-white p-2.5">
                              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Vigencia</p>
                              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-700">
                                {formatDate(indicator.vigencia_desde)} a {formatDate(indicator.vigencia_hasta)}
                              </p>
                            </div>

                            <div className="rounded-[0.9rem] border border-slate-200 bg-white p-2.5">
                              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Impacto</p>
                              <p className="mt-1 text-[14px] font-black text-slate-950">{formatCurrency(evaluation?.amount || 0)}</p>
                              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                                {evaluation?.resultType === 'cobro'
                                  ? 'Premio proyectado'
                                  : evaluation?.resultType === 'descuento'
                                    ? 'Ajuste sobre premio base'
                                    : evaluation?.resultType === 'bonus'
                                      ? 'Bonus adicional'
                                      : 'Sin impacto calculado'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          </>
          ) : (
            <section className="space-y-4">
              <div className="rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Programa visual</p>
                    <h2 className="mt-1 text-[1.35rem] font-black tracking-tight text-slate-950">Escalas y bonificaciones</h2>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      Cuadros generados desde Sheets para {selectedArea} {selectedPeriod !== 'all' ? `• ${selectedPeriod}` : ''}.
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">
                    {scaleCardGroups.length} cuadros activos
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {scaleCardGroups.map(group => {
                  const theme = pickAreaTheme(group.area);
                  const labels = getScaleCardLabels(group);
                  const badgeStyle = getImpactBadgeStyle(group.resultType);

                  return (
                    <article
                      key={group.key}
                      className="overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                    >
                      <div className={`bg-gradient-to-r ${theme.accent} px-4 py-4 text-white`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/75">{group.area}</p>
                            <h3 className="mt-1 text-[1.05rem] font-black tracking-tight">{group.indicator}</h3>
                            <p className="mt-1 text-[11px] text-white/80">
                              {group.objectiveText || `Periodo ${group.period}`}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.14em]">
                            {group.period}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className={`mb-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${badgeStyle}`}>
                          {group.resultType}
                        </div>

                        <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
                          <div className="grid grid-cols-3 bg-slate-50">
                            <div className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Escala</div>
                            <div className="border-l border-slate-200 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">{labels.threshold}</div>
                            <div className="border-l border-slate-200 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">{labels.impact}</div>
                          </div>
                          {group.rows.map((row, index) => (
                            <div key={row.id} className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                              <div className="px-3 py-3 text-[12px] font-black text-slate-800">{row.escala || '-'}</div>
                              <div className="border-l border-slate-200 px-3 py-3 text-[12px] font-bold text-slate-700">
                                {formatRuleThreshold(row, group.inputType, group.unit)}
                              </div>
                              <div className="border-l border-slate-200 px-3 py-3 text-[12px] font-black text-slate-900">
                                {row.impacto_texto || formatPercent(row.impacto_valor || 0)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardFrame>
  );
};

export default QualityObjectivesDashboard;
