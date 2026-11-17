-- Productos FICTICIOS de CyberShop (idempotente: no duplica si ya existen por nombre).
-- Marcas y modelos inventados. Precios en euros.

-- La tabla temporal se crea copiando tipos Y collation de las tablas reales (products / categories),
-- así las comparaciones de texto nunca fallan por "Illegal mix of collations".
CREATE TEMPORARY TABLE tmp_products AS
SELECT c.slug AS category_slug, p.name, p.description, p.price, p.stock, p.is_featured
  FROM products p, categories c
 WHERE 1 = 0;

INSERT INTO tmp_products (category_slug, name, description, price, stock, is_featured) VALUES
('perifericos', 'Teclado mecánico NovaKey K87', 'Teclado mecánico compacto TKL con switches lineales, retroiluminación RGB por tecla y cable USB-C desmontable.', 79.90, 35, 1),
('perifericos', 'Ratón inalámbrico PulseX M3', 'Ratón ligero de 62 g con sensor de 26.000 DPI, conexión de 2,4 GHz y hasta 70 horas de batería.', 49.90, 60, 0),
('perifericos', 'Auriculares Echo H500', 'Auriculares cerrados con sonido envolvente 7.1 virtual, almohadillas de espuma viscoelástica y micrófono con cancelación de ruido.', 89.00, 28, 1),
('perifericos', 'Monitor curvo CurveView 27 pulgadas', 'Panel VA QHD de 165 Hz con 1 ms de respuesta, curvatura 1500R y soporte regulable en altura.', 329.00, 12, 1),
('perifericos', 'Webcam ClearCam 1080p', 'Webcam Full HD con enfoque automático, micrófono estéreo integrado y tapa de privacidad física.', 39.95, 80, 0),

('componentes', 'Procesador Vortex R7 de 8 núcleos', 'Procesador de 8 núcleos y 16 hilos con frecuencia de hasta 5,0 GHz. Incluye disipador de serie.', 289.00, 15, 1),
('componentes', 'Memoria RAM Orbix DDR5 32 GB', 'Kit de 2 x 16 GB DDR5 a 6000 MHz con disipador de aluminio y perfil XMP preconfigurado.', 119.90, 40, 0),
('componentes', 'Tarjeta gráfica Nebula RX de 8 GB', 'Tarjeta gráfica con 8 GB GDDR6, trazado de rayos por hardware y refrigeración de triple ventilador.', 449.00, 7, 1),
('componentes', 'Fuente modular Titan 750 W', 'Fuente certificada 80 Plus Gold con cableado totalmente modular y ventilador silencioso de 135 mm.', 99.00, 22, 0),

('redes', 'Router Wi-Fi 6 Aether AX3000', 'Router de doble banda con cuatro antenas, cuatro puertos Gigabit y control parental desde la app.', 119.00, 25, 1),
('redes', 'Adaptador USB Wi-Fi Nexa AC1200', 'Adaptador USB 3.0 de doble banda con antena orientable, ideal para equipos de sobremesa.', 24.90, 90, 0),
('redes', 'Switch Gigabit Linkon de 8 puertos', 'Switch de sobremesa sin gestión con ocho puertos Gigabit, carcasa metálica y consumo muy bajo.', 29.95, 55, 0),
('redes', 'Cable Ethernet Cat7 blindado 5 m', 'Cable de red Cat7 con doble apantallado y conectores RJ45 chapados en oro.', 12.50, 150, 0),

('almacenamiento', 'SSD NVMe Quanta de 1 TB', 'Unidad de estado sólido PCIe 4.0 con lecturas de hasta 7.000 MB/s y disipador incluido.', 84.90, 45, 1),
('almacenamiento', 'Disco duro externo Vaultix de 2 TB', 'Disco portátil USB 3.0 con carcasa antigolpes y software de copias de seguridad.', 74.00, 33, 0),
('almacenamiento', 'Memoria USB Flashy de 128 GB', 'Pendrive USB 3.2 con velocidades de lectura de hasta 400 MB/s y diseño retráctil.', 15.99, 200, 0),
('almacenamiento', 'Tarjeta microSD Pixelon de 256 GB', 'Tarjeta microSD clase A2 y V30, pensada para consolas portátiles, drones y cámaras de acción.', 27.90, 70, 0),

('hardware-hacking', 'Kit de destornilladores de precisión 64 en 1', 'Set con 56 puntas intercambiables, mango giratorio, ventosa y herramientas de apertura para electrónica.', 22.50, 120, 0),
('hardware-hacking', 'Placa de desarrollo Pico-Lab con Wi-Fi', 'Placa con microcontrolador de doble núcleo, Wi-Fi y Bluetooth, ideal para proyectos de IoT y prototipos.', 8.90, 300, 0),
('hardware-hacking', 'Analizador lógico USB Logiq de 8 canales', 'Analizador lógico de 24 MHz para depurar protocolos I2C, SPI y UART, compatible con software de código abierto.', 18.90, 60, 1),
('hardware-hacking', 'Estación de soldadura Solderix de 60 W', 'Estación con temperatura regulable de 200 a 450 grados, pantalla digital y modo de reposo automático.', 54.90, 18, 0),

('accesorios', 'Mochila antirrobo Shadow de 15,6 pulgadas', 'Mochila con cremalleras ocultas, puerto de carga USB externo y compartimento acolchado para portátil.', 44.90, 40, 0),
('accesorios', 'Soporte de aluminio para portátil Lift', 'Soporte plegable y ajustable en seis alturas, compatible con portátiles de 10 a 17 pulgadas.', 29.00, 65, 0),
('accesorios', 'Alfombrilla XXL Neon Grid', 'Alfombrilla de 90 x 40 cm con base antideslizante, superficie de microtextura y bordes cosidos.', 19.90, 110, 0);

INSERT INTO products (category_id, name, description, price, stock, is_featured)
SELECT c.id, t.name, t.description, t.price, t.stock, t.is_featured
  FROM tmp_products t
  JOIN categories c ON c.slug = t.category_slug
 WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = t.name);

DROP TEMPORARY TABLE tmp_products;
