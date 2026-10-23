import assert from 'node:assert/strict';
import test from 'node:test';
import { qualityDate, matchesQualityDate } from '../services/qualityPeriod';
import { parseDetailedQualityCSV } from '../services/dataService';

test('BDENCfechaFin se conserva separada de la fecha del servicio', () => {
  const [record] = parseDetailedQualityCSV('mes,codid,BDENCfechaFin,fecha de servicio,categorizacion\noct,474006,2026-10-20 10:40:51,5/10/2026,"Asesoramiento deficiente, Nueva falla"');
  assert.equal(record.fecha_fin_encuesta, '2026-10-20 10:40:51');
  assert.equal(record.fecha_servicio, '5/10/2026');
  assert.equal(matchesQualityDate(record.fecha_fin_encuesta, '2026-10-20', '2026-10-20'), true);
});

test('rango inclusivo, abierto, sin fecha y fechas inválidas', () => {
  assert.equal(qualityDate('20/10/2026 23:59:59'), '2026-10-20');
  assert.equal(qualityDate('2026-02-30'), '');
  assert.equal(matchesQualityDate('2026-10-20 23:59:59', '2026-10-20', '2026-10-20'), true);
  assert.equal(matchesQualityDate('2026-10-21', '', '2026-10-20'), false);
  assert.equal(matchesQualityDate('2026-10-19', '2026-10-20', ''), false);
  assert.equal(matchesQualityDate(undefined, '', ''), true);
  assert.equal(matchesQualityDate(undefined, '2026-10-20', ''), false);
  assert.equal(matchesQualityDate('2026-10-20', '2026-10-21', '2026-10-19'), false);
});
