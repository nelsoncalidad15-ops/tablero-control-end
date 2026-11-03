import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseSatisfactionSurveyCSV } from '../services/dataService';

test('SSI: lee las columnas A:N sin confundir Q1.1 con la nota general', () => {
  const headers = ['AÑO', 'PROVINCIA', 'SEMESTRE', 'CE', 'Ola', 'Satis. General', 'Recom.', 'Q1.1 principales motivos de la calificación de la satisfacción general con los servicios de concesionario', 'VIN', 'NOMBRE', 'Modelo', 'Fecha venta', 'Canal Venta', 'CATEGORIZACION'];
  const rows = parseSatisfactionSurveyCSV(Papa.unparse([headers,
    ['2026', 'Salta', '1 SEMESTRE', '3087', '2', '8', '10', 'Demora, y poco asesoramiento', 'VIN1', 'Ana', 'TERA / PLAN DE AHORRO', '46174', 'PDA', 'Demora en la entrega, Falta de explicación/ asesoramiento'],
    ['2026', 'Jujuy', '1 SEMESTRE', '3059', '2', '0', '', '', '', '', 'AMAROK', 'marzo 2026', 'RETAIL', ''],
  ]));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].anio, 2026);
  assert.equal(rows[0].satisfaccion_general, 8);
  assert.equal(rows[0].recomendacion, 10);
  assert.equal(rows[0].motivo_calificacion, 'Demora, y poco asesoramiento');
  assert.equal(rows[0].modelo, 'TERA / PLAN DE AHORRO');
  assert.equal(rows[0].fecha_venta, '1/6/2026');
  assert.equal(rows[1].satisfaccion_general, 0);
  assert.equal(rows[1].recomendacion, null);
  assert.equal(rows[1].fecha_venta, 'marzo 2026');
});

