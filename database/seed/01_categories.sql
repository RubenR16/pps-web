-- Categorías ficticias de CyberShop (idempotente).
INSERT IGNORE INTO categories (name, slug, description) VALUES
  ('Periféricos',    'perifericos',    'Teclados, ratones y auriculares para tu setup.'),
  ('Componentes',    'componentes',    'Procesadores, memorias y tarjetas gráficas.'),
  ('Redes',          'redes',          'Routers, adaptadores y cables para tu laboratorio.'),
  ('Almacenamiento', 'almacenamiento', 'SSD, discos externos y memorias USB.'),
  ('Hardware Hacking','hardware-hacking','Herramientas de electrónica y análisis de hardware.'),
  ('Accesorios',     'accesorios',     'Mochilas, soportes y todo lo demás.');
