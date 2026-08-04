import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import {
  ChartWrapper,
  DashboardFrame,
  DataTable,
  EmptyStatePanel,
  LuxuryKPICard,
  StatusBadge,
} from './DashboardUI';
import { Icons } from './Icon';
import { AMBIENTE_CONSUMPTION_SHEET_KEY, MONTHS } from '../constants';
import { fetchEnvironmentalConsumptionData } from '../services/dataService';
import { EnvironmentalConsumptionRecord, LoadingStatus } from '../types';

interface EnvironmentalConsumptionDashboardProps {
  sheetUrl?: string;
  onBack?: () => void;
}

type ConsumptionSummary = {
  total: number;
  energia: number;
  agua: number;
  indicadorEnergia: number;
  indicadorAgua: number;
};

type MonthlyRow = ConsumptionSummary & {
  mes: string;
  mesCorto: string;
  orden: number;
};

const ENERGY_COLOR = '#f59e0b';
const WATER_COLOR = '#0ea5e9';

const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));

const formatKwh = (value: number) => formatNumber(value) + ' kWh';
const formatWater = (value: number) => formatNumber(value, 1) + ' m\u00b3';
const formatEnergyIntensity = (value: number) => formatNumber(value, 2) + ' kWh/u';
const formatWaterIntensity = (value: number) => formatNumber(value, 2) + ' m\u00b3/u';

const aggregate = (records: EnvironmentalConsumptionRecord[]): ConsumptionSummary => {
  const totals = records.reduce(
    (sum, record) => ({
      total: sum.total + Number(record.total || 0),
      energia: sum.energia + Number(record.consumoEnergiaKwh || 0),
      agua: sum.agua + Number(record.consumoAguaM3 || 0),
    }),
    { total: 0, energia: 0, agua: 0 }
  );

  return {
    ...totals,
    indicadorEnergia: totals.total ? totals.energia / totals.total : 0,
    indicadorAgua: totals.total ? totals.agua / totals.total : 0,
  };
};

const dedupeByCompanyPeriod = (records: EnvironmentalConsumptionRecord[]) => {
  const values = new Map<string, EnvironmentalConsumptionRecord>();
  const duplicateKeys = new Set<string>();

  records.forEach(record => {
    const key = record.empresa.toLowerCase() + '-' + record.anio + '-' + record.mesNumero;
    if (values.has(key)) duplicateKeys.add(key);
    values.set(key, record);
  });

  return {
    records: Array.from(values.values()).sort(
      (a, b) => a.anio - b.anio || a.mesNumero - b.mesNumero || a.empresa.localeCompare(b.empresa, 'es')
    ),
    duplicateCount: duplicateKeys.size,
  };
};

const variation = (current: number, previous: number) => {
  if (!previous) return undefined;
  return {
    value: Number((Math.abs((current - previous) / previous) * 100).toFixed(1)),
    isUp: current <= previous,
  };
};

const getCompanyColor = (company: string) => {
  const normalized = company.toLowerCase();
  if (normalized.includes('jujuy')) return '#118dff';
  if (normalized.includes('salta')) return '#2ea744';
  return '#0f766e';
};

const TrendChart = ({ data, mode }: { data: MonthlyRow[]; mode: 'energy' | 'water' }) => {
  const isEnergy = mode === 'energy';
  const color = isEnergy ? ENERGY_COLOR : WATER_COLOR;
  const title = isEnergy ? 'Evolucion de energia' : 'Evolucion de agua';
  const mainKey = isEnergy ? 'energia' : 'agua';
  const indicatorKey = isEnergy ? 'indicadorEnergia' : 'indicadorAgua';

  return (
    <ChartWrapper title={title} subtitle="Consumo absoluto e intensidad mensual" className="h-[385px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="mesCorto" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
          <YAxis
            yAxisId="main"
            tickFormatter={(value: number) => formatNumber(value)}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
          />
          <YAxis
            yAxisId="indicator"
            orientation="right"
            tickFormatter={(value: number) => formatNumber(value, isEnergy ? 0 : 2)}
            tick={{ fill: color, fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === 'Consumo'
                ? (isEnergy ? formatKwh(Number(value)) : formatWater(Number(value)))
                : (isEnergy ? formatEnergyIntensity(Number(value)) : formatWaterIntensity(Number(value))),
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
          <Bar
            yAxisId="main"
            dataKey={mainKey}
            name="Consumo"
            fill={color}
            radius={[9, 9, 0, 0]}
            maxBarSize={46}
          />
          <Line
            yAxisId="indicator"
            dataKey={indicatorKey}
            name="Intensidad"
            type="monotone"
            stroke={isEnergy ? '#b45309' : '#0284c7'}
            strokeWidth={2.8}
            dot={{ r: 3, fill: color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

const EnvironmentalConsumptionDashboard: React.FC<EnvironmentalConsumptionDashboardProps> = ({
  sheetUrl = AMBIENTE_CONSUMPTION_SHEET_KEY,
  onBack,
}) => {
  const [data, setData] = useState<EnvironmentalConsumptionRecord[]>([]);
  const [loading, setLoading] = useState<LoadingStatus>({ isLoading: true, error: null });
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading({ isLoading: true, error: null });
      try {
        const records = await fetchEnvironmentalConsumptionData(sheetUrl);
        if (!active) return;
        setData(records);
        setLoading({ isLoading: false, error: null });
      } catch {
        if (!active) return;
        setLoading({ isLoading: false, error: 'No se pudo cargar la hoja de consumos ambientales.' });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [sheetUrl]);

  const normalized = useMemo(() => dedupeByCompanyPeriod(data), [data]);

  const years = useMemo(
    () => Array.from(new Set(normalized.records.map(record => record.anio))).sort((a, b) => a - b),
    [normalized.records]
  );

  const companies = useMemo(
    () => Array.from(new Set(normalized.records.map(record => record.empresa))).sort((a, b) => a.localeCompare(b, 'es')),
    [normalized.records]
  );

  useEffect(() => {
    const latest = years[years.length - 1];
    if (latest && (!selectedYear || !years.includes(selectedYear))) setSelectedYear(latest);
  }, [selectedYear, years]);

  const filtered = useMemo(
    () =>
      normalized.records.filter(record => {
        const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(record.empresa);
        const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(record.mesNumero);
        return record.anio === selectedYear && companyMatch && monthMatch;
      }),
    [normalized.records, selectedCompanies, selectedMonths, selectedYear]
  );

  const summary = useMemo(() => aggregate(filtered), [filtered]);

  const monthSet = useMemo(() => new Set(filtered.map(record => record.mesNumero)), [filtered]);

  const previousSummary = useMemo(() => {
    if (!selectedYear || monthSet.size === 0) return aggregate([]);
    return aggregate(
      normalized.records.filter(record => {
        const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(record.empresa);
        return record.anio === selectedYear - 1 && companyMatch && monthSet.has(record.mesNumero);
      })
    );
  }, [monthSet, normalized.records, selectedCompanies, selectedYear]);

  const monthlySeries = useMemo(
    () =>
      MONTHS.map((mes, index) => {
        const monthRecords = filtered.filter(record => record.mesNumero === index + 1);
        if (!monthRecords.length) return null;
        return {
          mes,
          mesCorto: mes.substring(0, 3),
          orden: index + 1,
          ...aggregate(monthRecords),
        };
      }).filter((record): record is MonthlyRow => Boolean(record)),
    [filtered]
  );

  const companyRows = useMemo(
    () =>
      (selectedCompanies.length ? selectedCompanies : companies)
        .map(empresa => ({
          empresa,
          color: getCompanyColor(empresa),
          ...aggregate(filtered.filter(record => record.empresa === empresa)),
        }))
        .filter(record => record.total > 0)
        .sort((a, b) => b.energia - a.energia),
    [companies, filtered, selectedCompanies]
  );

  const latestRecord = useMemo(
    () =>
      normalized.records.reduce<EnvironmentalConsumptionRecord | null>((latest, record) => {
        if (!latest) return record;
        return record.anio * 100 + record.mesNumero > latest.anio * 100 + latest.mesNumero
          ? record
          : latest;
      }, null),
    [normalized.records]
  );

  const outlierCount = useMemo(
    () =>
      normalized.records.filter(record => {
        const energy = record.total ? record.consumoEnergiaKwh / record.total : 0;
        const water = record.total ? record.consumoAguaM3 / record.total : 0;
        return (energy > 0 && (energy < 5 || energy > 45)) || water > 0.4;
      }).length,
    [normalized.records]
  );

  const maxEnergy = Math.max(...companyRows.map(row => row.indicadorEnergia), 1);
  const maxWater = Math.max(...companyRows.map(row => row.indicadorAgua), 0.01);
  const energySparkline = monthlySeries.length > 1 ? monthlySeries.map(row => row.energia) : undefined;
  const waterSparkline = monthlySeries.length > 1 ? monthlySeries.map(row => row.agua) : undefined;

  const toggleCompany = (company: string) => {
    if (company === 'TODAS') {
      setSelectedCompanies([]);
      return;
    }

    setSelectedCompanies(current =>
      current.includes(company) ? current.filter(value => value !== company) : [...current, company]
    );
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths(current =>
      current.includes(month) ? current.filter(value => value !== month) : [...current, month]
    );
  };

  const cards = [
    {
      title: 'Energia consumida',
      value: formatKwh(summary.energia),
      color: ENERGY_COLOR,
      icon: Icons.Zap,
      trend: variation(summary.energia, previousSummary.energia),
      sparklineData: energySparkline,
      label: 'Periodo seleccionado',
      detail: selectedYear ? 'Menor es mejor vs ' + (selectedYear - 1) : 'Menor es mejor',
    },
    {
      title: 'Agua consumida',
      value: formatWater(summary.agua),
      color: WATER_COLOR,
      icon: Icons.Droplet,
      trend: variation(summary.agua, previousSummary.agua),
      sparklineData: waterSparkline,
      label: 'Periodo seleccionado',
      detail: selectedYear ? 'Menor es mejor vs ' + (selectedYear - 1) : 'Menor es mejor',
    },
    {
      title: 'Intensidad energia',
      value: formatEnergyIntensity(summary.indicadorEnergia),
      color: '#d97706',
      icon: Icons.Zap,
      trend: variation(summary.indicadorEnergia, previousSummary.indicadorEnergia),
      sparklineData: monthlySeries.length > 1 ? monthlySeries.map(row => row.indicadorEnergia) : undefined,
      label: 'Consumo / unidades',
      detail: 'Indicador ponderado',
    },
    {
      title: 'Intensidad agua',
      value: formatWaterIntensity(summary.indicadorAgua),
      color: '#0284c7',
      icon: Icons.Droplet,
      trend: variation(summary.indicadorAgua, previousSummary.indicadorAgua),
      sparklineData: monthlySeries.length > 1 ? monthlySeries.map(row => row.indicadorAgua) : undefined,
      label: 'Consumo / unidades',
      detail: 'Indicador ponderado',
    },
    {
      title: 'Unidades atendidas',
      value: formatNumber(summary.total),
      color: '#0f172a',
      icon: Icons.Activity,
      label: 'Base de comparacion',
      detail: 'Total de servicios',
    },
  ];

  return (
    <DashboardFrame
      title="Ambiente / Consumos"
      subtitle="Seguimiento de agua, energia e intensidad de consumo"
      onBack={onBack}
      isLoading={loading.isLoading}
      lastUpdated={new Date().toLocaleString('es-AR')}
      context={
        <>
          <StatusBadge status="info" label={selectedYear ? 'Ano ' + selectedYear : 'Cargando'} />
          <StatusBadge status="info" label={selectedCompanies.length ? selectedCompanies.length + ' empresa(s)' : 'Todas las empresas'} />
        </>
      }
    >
      <motion.section
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.2rem] border border-teal-200/70 bg-[radial-gradient(circle_at_86%_8%,rgba(34,211,238,0.35),transparent_23%),radial-gradient(circle_at_12%_90%,rgba(16,185,129,0.20),transparent_30%),linear-gradient(135deg,#052e2b_0%,#0f3d3e_50%,#0f172a_100%)] px-6 py-7 text-white shadow-[0_20px_55px_rgba(15,118,110,0.24)] md:px-8"
      >
        <div className="pointer-events-none absolute -right-9 -top-9 h-44 w-44 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.34em] text-teal-100/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal-200/20 bg-teal-300/10">
                <Icons.Leaf className="h-4 w-4 text-emerald-200" />
              </span>
              Gestion ambiental
            </p>
            <h2 className="mt-5 max-w-2xl text-[2rem] font-black leading-[0.94] tracking-tight md:text-[2.7rem]">
              Consumos que se pueden leer, comparar y mejorar.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-50/75">
              Los indicadores se recalculan sobre el total de unidades para comparar periodos y sedes de forma justa.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between text-teal-100/80">
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Ultimo periodo</span>
                <Icons.Calendar className="h-4 w-4" />
              </div>
              <p className="mt-3 text-lg font-black uppercase">
                {latestRecord ? latestRecord.mes.substring(0, 3) + ' ' + latestRecord.anio : 'Sin datos'}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between text-teal-100/80">
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Recursos</span>
                <div className="flex gap-2"><Icons.Zap className="h-4 w-4 text-amber-300" /><Icons.Droplet className="h-4 w-4 text-cyan-200" /></div>
              </div>
              <p className="mt-3 text-lg font-black">Agua + energia</p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] backdrop-blur-xl md:p-6">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400"><Icons.Calendar className="h-3.5 w-3.5" /> Ano</span>
            <div className="flex flex-wrap gap-2">
              {years.map(year => (
                <button key={year} onClick={() => setSelectedYear(year)} className={'rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ' + (selectedYear === year ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-700')}>
                  {year}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-2 pt-1 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400"><Icons.Leaf className="h-3.5 w-3.5" /> Empresa</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleCompany('TODAS')} className={'rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ' + (selectedCompanies.length === 0 ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300')}>
                Todas
              </button>
              {companies.map(company => (
                <button key={company} onClick={() => toggleCompany(company)} className={'rounded-xl border px-4 py-2 text-[10px] font-black transition-all ' + (selectedCompanies.includes(company) ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300')}>
                  {company.replace(/^Autosol\s+/i, '')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400"><Icons.Filter className="h-3.5 w-3.5" /> Meses</span>
              <button onClick={() => { setSelectedCompanies([]); setSelectedMonths([]); }} className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-700 hover:text-teal-950">Restablecer</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setSelectedMonths([])} className={'rounded-xl border px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all ' + (selectedMonths.length === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-500')}>
                Todo el ano
              </button>
              {MONTHS.map((month, index) => (
                <button key={month} onClick={() => toggleMonth(index + 1)} className={'rounded-xl border px-3 py-2 text-[9px] font-black uppercase transition-all ' + (selectedMonths.includes(index + 1) ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-300')}>
                  {month.substring(0, 3)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status="info" label={selectedMonths.length ? selectedMonths.length + ' mes(es)' : 'Todos los meses'} />
              <span className="pt-1 text-[10px] font-bold text-slate-400">Comparacion contra el mismo periodo del ano anterior.</span>
            </div>
          </div>
        </div>
      </section>

      {loading.error ? (
        <EmptyStatePanel icon={Icons.AlertTriangle} title="Fuente no disponible" subtitle={loading.error + ' Configura LINK_CONSUMOS_AMBIENTE en Render y confirma el acceso de lector a la hoja.'} />
      ) : filtered.length === 0 ? (
        <EmptyStatePanel icon={Icons.Leaf} title="Sin consumos para este filtro" subtitle="No hay filas compatibles con el ano, la empresa o los meses elegidos." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(card => (
              <LuxuryKPICard
                key={card.title}
                title={card.title}
                value={card.value}
                color={card.color}
                icon={card.icon}
                featured={card.title === 'Energia consumida' || card.title === 'Agua consumida'}
                trend={card.trend}
                sparklineData={card.sparklineData}
                footerLabel={card.label}
                footerValue={card.value}
                footerDetail={card.detail}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TrendChart data={monthlySeries} mode="energy" />
            <TrendChart data={monthlySeries} mode="water" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <ChartWrapper title="Comparacion entre empresas" subtitle="Intensidad de consumo en el periodo seleccionado" className="h-auto">
              <div className="space-y-5">
                {companyRows.map(row => (
                  <div key={row.empresa} className="rounded-[1.3rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <p className="text-sm font-black text-slate-900">{row.empresa}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{formatNumber(row.total)} unidades</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black"><span className="flex items-center gap-2 text-amber-700"><Icons.Zap className="h-3.5 w-3.5" /> Energia</span><span>{formatEnergyIntensity(row.indicadorEnergia)}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: String(Math.max(6, (row.indicadorEnergia / maxEnergy) * 100)) + '%' }} /></div>
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black"><span className="flex items-center gap-2 text-sky-700"><Icons.Droplet className="h-3.5 w-3.5" /> Agua</span><span>{formatWaterIntensity(row.indicadorAgua)}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-sky-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500" style={{ width: String(Math.max(6, (row.indicadorAgua / maxWater) * 100)) + '%' }} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartWrapper>

            <section className="space-y-4">
              <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50/75 p-5 shadow-[0_12px_34px_rgba(180,83,9,0.06)]">
                <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><Icons.AlertTriangle className="h-5 w-5" /></div><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-700">Calidad de datos</p><p className="mt-2 text-sm font-bold leading-6 text-amber-950">{normalized.duplicateCount ? 'Hay ' + normalized.duplicateCount + ' periodo(s) duplicado(s). Se usa la ultima fila cargada para no duplicar el consumo.' : 'No se detectaron periodos duplicados por empresa.'}</p></div></div>
              </div>
              <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50/75 p-5 shadow-[0_12px_34px_rgba(2,132,199,0.06)]">
                <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white"><Icons.Activity className="h-5 w-5" /></div><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-700">Lectura a revisar</p><p className="mt-2 text-sm font-bold leading-6 text-sky-950">{outlierCount ? outlierCount + ' registro(s) muestran intensidades inusuales. Se mantienen visibles para validacion, sin correcciones automaticas.' : 'Las intensidades cargadas se encuentran dentro de los rangos de seguimiento.'}</p></div></div>
              </div>
            </section>
          </div>

          <DataTable
            title="Detalle mensual de consumos"
            subtitle="Indicadores recalculados sobre el total de unidades para cada periodo."
            data={[...filtered].sort((a, b) => b.anio - a.anio || b.mesNumero - a.mesNumero || a.empresa.localeCompare(b.empresa, 'es'))}
            pageSize={12}
            columns={[
              { header: 'Empresa', accessor: 'empresa' },
              { header: 'Periodo', accessor: 'periodo', render: (_value, row) => (row as EnvironmentalConsumptionRecord).mes.substring(0, 3).toUpperCase() + ' ' + (row as EnvironmentalConsumptionRecord).anio },
              { header: 'TUS', accessor: 'totalUnidadesServicio', render: value => formatNumber(Number(value || 0)) },
              { header: 'Entregas 0 Km', accessor: 'entregas0Km', render: value => formatNumber(Number(value || 0)) },
              { header: 'Total', accessor: 'total', render: value => formatNumber(Number(value || 0)) },
              { header: 'Energia', accessor: 'consumoEnergiaKwh', render: value => formatKwh(Number(value || 0)) },
              { header: 'Agua', accessor: 'consumoAguaM3', render: value => formatWater(Number(value || 0)) },
              { header: 'Ind. energia', accessor: 'indicadorEnergia', render: (_value, row) => { const record = row as EnvironmentalConsumptionRecord; return formatEnergyIntensity(record.total ? record.consumoEnergiaKwh / record.total : 0); } },
              { header: 'Ind. agua', accessor: 'indicadorAgua', render: (_value, row) => { const record = row as EnvironmentalConsumptionRecord; return formatWaterIntensity(record.total ? record.consumoAguaM3 / record.total : 0); } },
            ]}
          />
        </>
      )}
    </DashboardFrame>
  );
};

export default EnvironmentalConsumptionDashboard;
