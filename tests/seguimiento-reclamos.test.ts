import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSeguimientoSummary, parseArgentinaDate, parseReclamosRows } from '../services/seguimientoReclamos';

const headers = [
  'Nro', 'Sucursal', 'Orden', 'Sector Resp.', 'Requerimiento del cliente', 'Reclamo/Queja',
  'Nota reclamo', 'Reclamo / Observación', 'Fecha Reclamo/ Queja', 'Mes', 'Cliente',
  'Asesor asignado', 'Tecnico asignado', 'Causa Raíz', 'Acción Contencion',
  'Acción correctiva', 'Responsable de Solución', 'Fecha de llamado de contecion a las 24 HS',
  'Reclamo Resuelto? SI/ NO', 'Observacion de resolucion', 'Fecha de resolucion',
  'Días de demora', 'GESTIONADO bien o mal', 'Motivos de Reclamo', 'Cierre por Calidad',
  'Estado de Reclamo', 'Revisar IA', 'Observación Calidad IA', 'Estado IA',
  'Fecha revisión IA', 'Contexto / Análisis IA + Acciones sugeridas', 'Mandar mail', 'Estado Mail Reclamo',
];

const row = (values: Record<string, string>) => headers.map(header => values[header] ?? '');

const sample = parseReclamosRows([
  headers,
  row({
    Nro: '1', Sucursal: 'AUTOSOL JUJUY', Orden: 'OR 254351', 'Sector Resp.': 'Organización',
    'Reclamo/Queja': 'Reclamo', 'Fecha Reclamo/ Queja': '01/09/2025', Cliente: 'CLIENTE PRIVADO',
    'Asesor asignado': 'ASESOR CONFIDENCIAL', 'Causa Raíz': 'Causa', 'Acción Contencion': 'Contención',
    'Acción correctiva': 'Corrección', 'Responsable de Solución': 'Responsable', 'Reclamo Resuelto? SI/ NO': 'SI',
    'GESTIONADO bien o mal': 'Mal', 'Motivos de Reclamo': 'Organización; Lavado', 'Nota reclamo': 'TEXTO PRIVADO',
  }),
  row({
    Nro: '2', Sucursal: 'Jujuy', Orden: '254351', 'Sector Resp.': 'Trabajo del taller',
    'Reclamo/Queja': 'Queja', 'Fecha Reclamo/ Queja': '1-sept-25', Cliente: 'OTRO CLIENTE',
    'Asesor asignado': 'ASESOR CONFIDENCIAL', 'Responsable de Solución': 'Asignado',
    'GESTIONADO bien o mal': '', 'Motivos de Reclamo': 'Trabajo del taller',
  }),
  row({
    Nro: '3', Sucursal: 'Salta', Orden: 'OR-99', 'Sector Resp.': 'Lavado',
    'Reclamo/Queja': 'Queja', 'Fecha Reclamo/ Queja': '2026-09-01',
  }),
  row({
    Nro: '5', Sucursal: 'Salta', Orden: 'OR-101', 'Sector Resp.': 'Servicio Prestado',
    'Reclamo/Queja': 'Reclamo', 'Fecha Reclamo/ Queja': '2025-09-20',
    'Causa Raíz': 'Causa', 'Acción Contencion': 'Contención', 'Acción correctiva': 'Corrección',
    'Responsable de Solución': 'Responsable', 'GESTIONADO bien o mal': 'Bien',
  }),
  row({ Nro: '4', Sucursal: 'Jujuy', Orden: 'OR-100', 'Sector Resp.': 'Servicio Prestado', 'Fecha Reclamo/ Queja': 'fecha inválida' }),
  Array(headers.length).fill(''),
]);

test('interpreta formatos argentinos sin desplazar el día por zona horaria', () => {
  for (const value of ['1-sept-25', '1-sep-25', '01/09/2025', '2025-09-01']) {
    const date = parseArgentinaDate(value);
    assert.ok(date);
    assert.equal(date.toISOString(), '2025-09-01T00:00:00.000Z');
  }
});

test('cuenta filas válidas por separado y deduplica OR por sucursal y orden', () => {
  const result = buildSeguimientoSummary(sample, { year: 2025, month: 9 });
  assert.equal(result.summary.records, 3);
  assert.equal(result.summary.uniqueOrders, 2);
  assert.equal(result.summary.complete, 2);
  assert.equal(result.summary.pendingToComplete, 1);
  assert.equal(result.summary.observed, 1);
  assert.equal(result.summary.correctComplete, 1);
  assert.equal(result.summary.resolved, 1);
  assert.equal(result.dataQuality.invalidIdentityRows, 0);
  assert.equal(result.dataQuality.invalidDateRows, 1);
  assert.equal(result.dataQuality.blankRows, 1);
});

test('aplica filtros combinados y no mezcla ejercicios', () => {
  const byType = buildSeguimientoSummary(sample, { year: 2025, month: 9, branch: 'Jujuy', type: 'QUEJA' });
  assert.equal(byType.summary.records, 1);
  assert.equal(byType.summary.uniqueOrders, 1);
  const nextYear = buildSeguimientoSummary(sample, { year: 2026, month: 9 });
  assert.equal(nextYear.summary.records, 1);
  assert.equal(nextYear.summary.uniqueOrders, 1);
});

test('muestra métricas agregadas por asesor y permite filtrar sin exponer filas personales', () => {
  const summary = buildSeguimientoSummary(sample, { year: 2025, month: 9, advisor: 'asesor confidencial' });
  assert.equal(summary.summary.records, 2);
  assert.equal(summary.summary.uniqueOrders, 1);
  assert.equal(summary.summary.complete, 1);
  assert.equal(summary.summary.pendingToComplete, 1);
  assert.equal(summary.advisorBreakdown.length, 1);
  assert.equal(summary.advisorBreakdown[0].name, 'ASESOR CONFIDENCIAL');
  assert.equal(summary.advisorBreakdown[0].records, 2);
  assert.ok(summary.advisorMatrix.some(item => item.advisorKey === 'asesor confidencial'));

  const response = JSON.stringify(summary);
  for (const privateValue of ['CLIENTE PRIVADO', 'OTRO CLIENTE', '254351', 'TEXTO PRIVADO', 'Causa', 'Contención']) {
    assert.equal(response.includes(privateValue), false);
  }
});
