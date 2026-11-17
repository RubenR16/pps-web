'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createUploadService } = require('../src/services/upload.service');
const { HttpError } = require('../src/utils/httpError');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

function tmpService() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybershop-up-'));
  return { dir, service: createUploadService({ baseDir: dir }) };
}

test('saveImage guarda el archivo con su nombre original en la carpeta indicada', async () => {
  const { dir, service } = tmpService();
  const url = await service.saveImage(PNG, 'products', 'teclado.png');
  assert.equal(url, '/uploads/products/teclado.png');
  assert.ok(fs.existsSync(path.join(dir, 'products', 'teclado.png')));
});

test('saveImage se queda solo con el nombre del archivo, sin directorios', async () => {
  const { dir, service } = tmpService();
  const url = await service.saveImage(PNG, 'comments', '../../foto.png');
  assert.equal(url, '/uploads/comments/foto.png');
  assert.ok(fs.existsSync(path.join(dir, 'comments', 'foto.png')));
});

test('saveImage usa un nombre por defecto si no llega ninguno', async () => {
  const { service } = tmpService();
  assert.equal(await service.saveImage(PNG, 'comments'), '/uploads/comments/imagen');
});

test('saveImage rechaza archivos vacíos y carpetas desconocidas', async () => {
  const { service } = tmpService();
  await assert.rejects(service.saveImage(Buffer.alloc(0), 'products', 'a.png'), (e) => e instanceof HttpError && e.status === 400);
  await assert.rejects(service.saveImage(PNG, '../../etc', 'a.png'), /Carpeta de subida no válida/);
});

test('remove borra el archivo a partir de su URL pública', async () => {
  const { dir, service } = tmpService();
  const url = await service.saveImage(PNG, 'comments', 'borrar.png');
  assert.equal(await service.remove(url), true);
  assert.ok(!fs.existsSync(path.join(dir, 'comments', 'borrar.png')));
  assert.equal(await service.remove(url), false); // ya no existe
});

test('remove ignora URLs que no son de /uploads/products o /uploads/comments', async () => {
  const { dir, service } = tmpService();
  fs.writeFileSync(path.join(dir, 'otro.txt'), 'x');
  for (const url of ['/uploads/../otro.txt', '../otro.txt', '/etc/passwd', null, undefined, 42]) {
    assert.equal(await service.remove(url), false, String(url));
  }
  assert.ok(fs.existsSync(path.join(dir, 'otro.txt')));
});
