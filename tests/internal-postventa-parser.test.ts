import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInternalPostventaCSV } from '../services/dataService';

test('Organización y Lavado conservan las calificaciones numéricas del CSV', () => {
  const csv = [
    'or_fecfin,nombre_sucursal,Servicio_Prestado,Trato_Personal,Organizacion,Trabajo_del_taller,Lavado',
    '2026-09-15,JUJUY,5,4,4,5,3',
  ].join('\n');

  const [record] = parseInternalPostventaCSV(csv);
  assert.equal(record.mes, 'Septiembre');
  assert.equal(record.anio, 2026);
  assert.equal(record.organizacion, 4);
  assert.equal(record.lavado, 3);
});

