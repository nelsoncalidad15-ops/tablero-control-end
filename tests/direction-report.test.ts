import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIntegratedActionBlock,
  composeDirectionReportPages,
  computeDirectionReportData,
  DEFAULT_SURVEY_SUB_OPTIONS,
  duplicateDirectionReportForNewPeriod,
} from '../services/directionReportData';
import {
  DirectionReportDocument,
  RawDirectionDataSources,
} from '../types/directionReport';

const createMockRawSources = (): RawDirectionDataSources => ({
  cemOs: [
    // Julio: 1 encuesta con nota 4.0 en Jujuy
    {
      id: 'cem-1',
      mes: 'Julio',
      anio: 2026,
      sucursal: 'JUJUY',
      codigo: '3059',
      chasis: 'VIN-J1',
      cem_score: 4.0,
      fecha_link_llega: '10/07/2026',
    } as any,
    // Agosto: 3 encuestas con nota 5.0 en Jujuy -> Promedio real ponderado Q3 Jujuy = (4+5+5+5)/4 = 4.75 (NO promedio simple de 4.0 y 5.0 = 4.50)
    {
      id: 'cem-2',
      mes: 'Agosto',
      anio: 2026,
      sucursal: 'JUJUY',
      codigo: '3059',
      chasis: 'VIN-J2',
      cem_score: 5.0,
      fecha_link_llega: '12/08/2026',
    } as any,
    {
      id: 'cem-3',
      mes: 'Agosto',
      anio: 2026,
      sucursal: 'JUJUY',
      codigo: '3059',
      chasis: 'VIN-J3',
      cem_score: 5.0,
      fecha_link_llega: '14/08/2026',
    } as any,
    {
      id: 'cem-4',
      mes: 'Septiembre',
      anio: 2026,
      sucursal: 'JUJUY',
      codigo: '3059',
      chasis: 'VIN-J4',
      cem_score: 5.0,
      fecha_link_llega: '18/09/2026',
    } as any,
    // Salta en Q3: 2 encuestas con nota 4.20 (Debajo del objetivo 4.60)
    {
      id: 'cem-5',
      mes: 'Julio',
      anio: 2026,
      sucursal: 'SALTA',
      codigo: '3087',
      chasis: 'VIN-S1',
      cem_score: 4.2,
      fecha_link_llega: '15/07/2026',
    } as any,
    {
      id: 'cem-6',
      mes: 'Agosto',
      anio: 2026,
      sucursal: 'SALTA',
      codigo: '3087',
      chasis: 'VIN-S2',
      cem_score: 4.2,
      fecha_link_llega: '20/08/2026',
    } as any,
  ],
  detailedQuality: [
    {
      id: 'dq-1',
      mes: 'Julio',
      anio: 2026,
      sucursal: 'JUJUY',
      cod_id: '101',
      vin: 'V1',
      q1_score: 4.9,
      q2_score: 4.8,
      q3_score: 4.9,
      q4_score: 4.9,
      q6_score: 4.7,
    } as any,
    {
      id: 'dq-2',
      mes: 'Agosto',
      anio: 2026,
      sucursal: 'SALTA',
      cod_id: '102',
      vin: 'V2',
      q1_score: 4.5,
      q2_score: 4.4,
      q3_score: 4.3,
      q4_score: 4.4,
      q6_score: 4.1,
    } as any,
  ],
  qualityClaims: [
    {
      id: 'qc-1',
      sucursal: 'JUJUY',
      mes: 'Julio',
      anio: 2026,
      sector: 'Taller',
      motivo: 'Demora en entrega',
      cliente: 'Juan',
      observacion: 'Demora',
      responsable: 'Taller',
      estado: 'Cerrado',
      orden: 'OR-100',
      resuelto: 'SI',
    },
    {
      id: 'qc-2',
      sucursal: 'JUJUY',
      mes: 'Agosto',
      anio: 2026,
      sector: 'Taller',
      motivo: 'Falla diagnóstico',
      cliente: 'Juan',
      observacion: 'Repetición en la misma OR',
      responsable: 'Taller',
      estado: 'Abierto',
      orden: 'OR-100',
      resuelto: 'NO',
    },
  ],
  salesClaims: [],
  salesQuality: [],
  internalPostventa: [],
  postventaKpis: [],
  actionPlans: [],
  pcgcChecklist: [],
  objectivesSummary: [
    {
      id: 'obj-os',
      area: 'Ventas',
      indicador: 'CEM OS',
      periodo: 'Trimestral',
      anio: 2026,
      vigencia_desde: '',
      vigencia_hasta: '',
      tipo_input: 'numero',
      tipo_resultado: 'cobro',
      tipo_objetivo: 'requisito',
      objetivo_texto: '>= 4,60',
      objetivo_valor: 4.6,
      unidad: 'puntos',
      orden: 1,
      tiene_escala: true,
      tiene_bonus: false,
      activa: true,
    },
    {
      id: 'obj-lvs',
      area: 'Postventa',
      indicador: 'LVS',
      periodo: 'Trimestral',
      anio: 2026,
      vigencia_desde: '',
      vigencia_hasta: '',
      tipo_input: 'numero',
      tipo_resultado: 'cobro',
      tipo_objetivo: 'requisito',
      objetivo_texto: '>= 4,80',
      objetivo_valor: 4.8,
      unidad: 'puntos',
      orden: 2,
      tiene_escala: true,
      tiene_bonus: false,
      activa: true,
    },
  ],
  objectivesScales: [],
  ssiSurveys: [
    {
      id: 'ssi-1',
      anio: 2026,
      provincia: 'Jujuy',
      semestre: '2 SEMESTRE',
      ce: '3059',
      cod_id: '1',
      ola: '3',
      satisfaccion_general: 10,
      recomendacion: 10,
      motivo_calificacion: 'Excelente atención',
      vin: 'VIN-SSI-1',
      nombre: 'Cliente SSI',
      modelo: 'AMAROK',
      fecha_venta: '15/08/2026',
      canal_venta: 'RETAIL',
      categorizacion: 'Atención sobresaliente',
      causa_raiz: '',
      accion_correctiva: '',
      accion_preventiva: '',
    },
  ],
  csiSurveys: [
    {
      id: 'csi-1',
      anio: 2026,
      provincia: 'Salta',
      semestre: '2 SEMESTRE',
      ce: '3087',
      cod_id: '2',
      ola: '3',
      satisfaccion_general: 7,
      recomendacion: 6,
      motivo_calificacion: 'Demora en repuesto',
      vin: 'VIN-CSI-1',
      nombre: 'Cliente CSI',
      modelo: 'TAOS',
      fecha_venta: '20/08/2026',
      canal_venta: 'TALLER',
      categorizacion: 'Demora de repuestos',
      causa_raiz: '',
      accion_correctiva: '',
      accion_preventiva: '',
    },
  ],
  clubSsiRecords: [],
  failedSources: [],
  loadedAt: '2026-10-01T00:00:00.000Z',
});

test('Modo trimestral consolida observaciones reales y no promedia promedios mensuales simples', () => {
  const raw = createMockRawSources();
  const q3Data = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'BOTH',
  });

  // Jujuy tiene 1 nota de 4.0 en Julio y 3 notas de 5.0 en Agosto/Septiembre -> (4 + 5 + 5 + 5) / 4 = 4.75
  assert.equal(q3Data.jujuy.osScore, 4.75);
  assert.equal(q3Data.jujuy.osCompliance, 'compliant');

  // Salta tiene 2 notas de 4.20 -> 4.20 (Debajo de 4.60)
  assert.equal(q3Data.salta.osScore, 4.2);
  assert.equal(q3Data.salta.osCompliance, 'deviated');

  // Deduplicación de OR únicas en Postventa: 2 reclamos sobre la misma OR-100 en Jujuy = 1 OR única
  assert.equal(q3Data.jujuy.pvClaimsTotal, 2);
  assert.equal(q3Data.jujuy.pvClaimsUniqueOr, 1);
});

test('Modo mensual filtra únicamente los registros del mes seleccionado', () => {
  const raw = createMockRawSources();
  const julyData = computeDirectionReportData(raw, {
    periodType: 'monthly',
    year: 2026,
    month: 'Julio',
    quarter: 'Q3',
    branchSelection: 'JUJUY',
  });

  assert.equal(julyData.jujuy.osScore, 4.0);
  assert.equal(julyData.jujuy.osValidCount, 1);
  assert.equal(julyData.jujuy.osCompliance, 'deviated');
});

test('SSI, CSI y Club SSI se calculan por separado sin mezclar sus registros', () => {
  const raw = createMockRawSources();
  const computed = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'BOTH',
  });

  assert.equal(computed.ssiStudy.validSurveysCount, 1);
  assert.equal(computed.ssiStudy.satisfactionAvg, 10);
  assert.equal(computed.ssiStudy.t2bPercent, 100);

  assert.equal(computed.csiStudy.validSurveysCount, 1);
  assert.equal(computed.csiStudy.satisfactionAvg, 7);
  assert.equal(computed.csiStudy.t2bPercent, 0);
});

test('Planes de acción integrados: oculto cuando cumple, desplegado solo para la sucursal desviada sin inventar causas', () => {
  // Caso 1: Indicador cumple objetivo en Jujuy y Salta
  const compliantBlock = buildIntegratedActionBlock(
    'ventas_os',
    'OS de Marca',
    'compliant',
    'compliant',
    'compliant',
    'BOTH',
    [],
    true
  );
  assert.equal(compliantBlock.visible, false);
  assert.equal(compliantBlock.actions.length, 0);

  // Caso 2: Jujuy cumple y Salta está desviada -> despliega acción únicamente para SALTA y sin texto inventado
  const saltaDeviatedBlock = buildIntegratedActionBlock(
    'ventas_os',
    'OS de Marca',
    'compliant',
    'deviated',
    'compliant',
    'BOTH',
    [],
    true
  );
  assert.equal(saltaDeviatedBlock.visible, true);
  assert.equal(saltaDeviatedBlock.actions.length, 1);
  assert.equal(saltaDeviatedBlock.actions[0].branch, 'SALTA');
  assert.equal(saltaDeviatedBlock.actions[0].rootCause, '');
  assert.equal(saltaDeviatedBlock.actions[0].correctiveAction, '');
});

test('Composición dinámica de páginas incluye solo módulos seleccionados y duplicación marca textos heredados', () => {
  const raw = createMockRawSources();
  const computedQ3 = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'JUJUY',
  });

  // Selección mínima: únicamente OS y LVS para Jujuy
  const minimalPages = composeDirectionReportPages(
    {
      periodType: 'quarterly',
      year: 2026,
      month: 'Septiembre',
      quarter: 'Q3',
      branchSelection: 'JUJUY',
      enabledModules: ['ventas_os', 'postventa_lvs', 'planes_accion_integrados'],
      surveySubOptions: DEFAULT_SURVEY_SUB_OPTIONS,
    },
    computedQ3
  );

  // Portada + Resumen Ejecutivo + Ventas OS + Postventa LVS = 4 páginas (sin páginas vacías de SSI, CSI, Auditorías ni Incentivos)
  assert.equal(minimalPages.length, 4);
  assert.equal(minimalPages.some(p => p.templateType === 'survey_study'), false);
  assert.equal(minimalPages.some(p => p.templateType === 'incentives'), false);

  // Simular edición manual en Resumen Ejecutivo y duplicar hacia Q4
  minimalPages[1].narrativeBody = 'Conclusión redactada en Q3 que debe revisarse en Q4.';
  const sourceDoc: DirectionReportDocument = {
    id: 'doc-q3',
    name: 'Informe Q3 2026',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    emittedDate: '01/10/2026',
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'JUJUY',
    enabledModules: ['ventas_os', 'postventa_lvs', 'planes_accion_integrados'],
    surveySubOptions: DEFAULT_SURVEY_SUB_OPTIONS,
    pages: minimalPages,
  };

  const computedQ4 = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Diciembre',
    quarter: 'Q4',
    branchSelection: 'JUJUY',
  });

  const duplicatedDoc = duplicateDirectionReportForNewPeriod(
    sourceDoc,
    {
      name: 'Informe Q4 2026',
      periodType: 'quarterly',
      year: 2026,
      month: 'Diciembre',
      quarter: 'Q4',
      branchSelection: 'JUJUY',
      keepImages: true,
    },
    computedQ4
  );

  assert.equal(duplicatedDoc.quarter, 'Q4');
  assert.equal(duplicatedDoc.duplicatedFromPeriod, 'Q3 2026');
  assert.equal(duplicatedDoc.pages[1].isInheritedPendingReview, true);
});

test('Objetivos de marca configurables (customTargets) actualizan metas y evaluación de cumplimiento', () => {
  const raw = createMockRawSources();

  // Caso 1: Salta tiene 4.20 en OS. Con meta estándar 4.60 está desviada
  const defaultComputed = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'SALTA',
  });
  assert.equal(defaultComputed.salta.osTarget, 4.6);
  assert.equal(defaultComputed.salta.osCompliance, 'deviated');

  // Caso 2: Con objetivo personalizado más flexible 4.10, Salta pasa a compliant
  const customComputed = computeDirectionReportData(raw, {
    periodType: 'quarterly',
    year: 2026,
    month: 'Septiembre',
    quarter: 'Q3',
    branchSelection: 'SALTA',
    customTargets: {
      os: 4.1,
      lvs: 4.5,
      lavado: 4.0,
      ssi: 8.5,
      csi: 8.5,
    },
  });
  assert.equal(customComputed.salta.osTarget, 4.1);
  assert.equal(customComputed.salta.osCompliance, 'compliant');
  assert.equal(customComputed.salta.lvsTarget, 4.5);
  assert.equal(customComputed.salta.lavadoTarget, 4.0);
});
