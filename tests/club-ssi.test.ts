import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { averageClubScore, clubScore, formatClubSaleDate } from '../services/clubSsi';
import { parseClubSsiCsv, splitClubCategories, summarizeClubSsi } from '../services/clubSsi';

test('separa categorías y evita duplicados dentro de un registro', () => {
  assert.deepEqual(splitClubCategories(' Atención, Entrega;atencion\n, N/A, -'), ['Atención', 'Entrega']);
});

test('conserva comentarios con comas y cuenta cada categoría por separado', () => {
  const rows = parseClubSsiCsv('Sucursal,Comentario,Categorización\nJujuy,"Muy bien, gracias","Atención, Entrega"\nSalta,Excelente,atencion\nJujuy,Pendiente,');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].comment, 'Muy bien, gracias');
  assert.deepEqual(rows[2].categories, []);
  assert.deepEqual(summarizeClubSsi(rows), [{ name: 'Atención', value: 2 }, { name: 'Entrega', value: 1 }]);
});

test('rechaza columnas desconocidas en lugar de mostrar cifras incorrectas', () => {
  assert.throws(() => parseClubSsiCsv('Cliente,Puntaje\nAna,10'), /columna de categorización/);
  assert.deepEqual(parseClubSsiCsv(''), []);
});

test('lee las 14 columnas reales y conserva las barras en categorías y modelo', () => {
  const headers = ['AÑO', 'PROVINCIA', 'SEMESTRE', 'CE', 'Ola', 'Satis. General', 'Recom.', 'Q1.1 principales motivos de la calificación de la satisfacción general con los servicios de concesionario', 'VIN', 'NOMBRE', 'Modelo', 'Fecha venta', 'Canal Venta', 'CATEGORIZACION'];
  const rows = parseClubSsiCsv(Papa.unparse([headers,
    ['2026', 'Salta', '1 SEMESTRE', '3087', '2', '8', '10', 'Demora, y poco asesoramiento', '', '', 'TERA / PLAN DE AHORRO', 'marzo 2026', 'PDA', 'Demora en la entrega, Falta de explicación/ asesoramiento'],
    ['2026', 'Jujuy', '1 SEMESTRE', '3059', '2', '0', '', 'Comentario', '', '', 'AMAROK', '46174', 'RETAIL', 'Mala atención'],
  ]));
  assert.equal(rows[0].comment, 'Demora, y poco asesoramiento');
  assert.equal(rows[0].branch, 'SALTA');
  assert.equal(rows[0].year, '2026');
  assert.equal(rows[0].wave, '2');
  assert.equal(rows[0].channel, 'PDA');
  assert.equal(rows[0].model, 'TERA / PLAN DE AHORRO');
  assert.equal(rows[0].categories.length, 2);
  assert.equal(rows[1].saleDate, '1/6/2026');
  assert.deepEqual(averageClubScore(rows, 'satisfaction'), { count: 2, value: 4 });
  assert.deepEqual(averageClubScore(rows, 'recommendation'), { count: 1, value: 10 });
  assert.equal(clubScore('11'), null);
  assert.equal(clubScore('texto'), null);
  assert.equal(clubScore('7,5'), 7.5);
  assert.equal(formatClubSaleDate('marzo 2026'), 'marzo 2026');
});
