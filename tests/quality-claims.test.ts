import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQualityCSV } from '../services/dataService';

test('Reclamo / Observación contiene el comentario del cliente y Observación Calidad IA no lo contamina', () => {
  const csv = [
    'Sucursal,Orden,Reclamo / Observación,Observación Calidad IA,Fecha Reclamo/ Queja,Cliente',
    'SALTA,5443002,,"Se solicita registrar el contacto realizado con el cliente...",01/09/2025,"JORGE YAMIL, NASSER"',
    'EXPRESS,107491,"El Sr. Juan Manuel comenta que cuando le dijeron que habían cosas...","Revisado",15/02/2026,BN FULSA SAS',
  ].join('\n');

  const records = parseQualityCSV(csv);
  assert.equal(records.length, 2);

  // Row 1: Sin comentario de cliente pero con observación de IA
  assert.equal(records[0].observacion, '');
  assert.equal(records[0].observacion_calidad_ia, 'Se solicita registrar el contacto realizado con el cliente...');
  assert.equal(records[0].anio, 2025);
  assert.equal(records[0].mes, 'Septiembre');

  // Row 2: Con comentario de cliente
  assert.equal(records[1].observacion, 'El Sr. Juan Manuel comenta que cuando le dijeron que habían cosas...');
  assert.equal(records[1].observacion_calidad_ia, 'Revisado');
  assert.equal(records[1].anio, 2026);
  assert.equal(records[1].mes, 'Febrero');
});

test('extrae años 2025 y 2026 desde diversos formatos de fecha de reclamo', () => {
  const csv = [
    'Sucursal,Orden,Reclamo / Observación,Fecha Reclamo/ Queja,Cliente',
    'JUJUY,1001,Falla motor,1-sept-25,Cliente 1',
    'JUJUY,1002,Ruido tren delantero,2025-11-14,Cliente 2',
    'SALTA,1003,Pintura,10/01/2026,Cliente 3',
    'SALTA,1004,Aire acondicionado,1-mar-26,Cliente 4',
  ].join('\n');

  const records = parseQualityCSV(csv);
  assert.equal(records[0].anio, 2025);
  assert.equal(records[1].anio, 2025);
  assert.equal(records[2].anio, 2026);
  assert.equal(records[3].anio, 2026);
});


test('Reclamo sin detalles con Requerimiento del cliente preserva observacion vacia y no toma el requerimiento de taller', () => {
  const csv = [
    'Sucursal,Orden,Requerimiento del cliente,Reclamo / Observación,Observación Calidad IA,Nota reclamo,Motivos de Reclamo',
    'SALTA,5443141,"SERVICIO DE 10.000 KM",,"Se solicita ampliar la información registrada...",3,"Reclamos sin detalles"'
  ].join('\n');

  const records = parseQualityCSV(csv);
  assert.equal(records.length, 1);
  assert.equal(records[0].observacion, '');
  assert.equal(records[0].requerimiento_cliente, 'SERVICIO DE 10.000 KM');
  assert.equal(records[0].motivo, 'Reclamos sin detalles');
});
