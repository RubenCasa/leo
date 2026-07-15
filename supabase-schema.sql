-- ============================================================================
-- LEO-CONNECT: Schema Completo para Supabase (PostgreSQL)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- =====================
-- 1. TABLA: ROLES
-- =====================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(20) UNIQUE NOT NULL,
  descripcion TEXT
);

INSERT INTO roles (nombre, descripcion) VALUES
  ('administrador', 'Gestión total del sistema, precios e inventario'),
  ('vendedor', 'Procesar pedidos y ver stock en tiempo real'),
  ('cliente', 'Acceso al catálogo y compras en línea')
ON CONFLICT (nombre) DO NOTHING;

-- =====================
-- 2. TABLA: USUARIOS
-- =====================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  cedula VARCHAR(13),
  telefono VARCHAR(15),
  rol_id INTEGER NOT NULL DEFAULT 3 REFERENCES roles(id),
  activo BOOLEAN DEFAULT true,
  codigo_verificacion VARCHAR(6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 3. TABLA: PRODUCTOS
-- =====================
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  categoria VARCHAR(50) NOT NULL,
  unidad VARCHAR(50),
  imagen_url TEXT,
  badge VARCHAR(30),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. TABLA: PEDIDOS
-- =====================
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  numero_pedido VARCHAR(30) UNIQUE NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'completado',
  metodo_pago VARCHAR(30),
  auth_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. TABLA: DETALLE_PEDIDOS
-- =====================
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  nombre_producto VARCHAR(150) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- =====================
-- 6. TABLA: COMPROBANTES_SRI
-- =====================
CREATE TABLE IF NOT EXISTS comprobantes_sri (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  clave_acceso VARCHAR(49) NOT NULL,
  secuencial VARCHAR(9) NOT NULL,
  xml_contenido TEXT,
  estado VARCHAR(20) DEFAULT 'emitido',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- RLS (Row Level Security)
-- =====================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_sri ENABLE ROW LEVEL SECURITY;

-- Productos: lectura para todos, escritura solo admin
CREATE POLICY "productos_select_all" ON productos FOR SELECT USING (true);
CREATE POLICY "productos_admin_all" ON productos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id = 1));
CREATE POLICY "productos_admin_update" ON productos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id = 1));
CREATE POLICY "productos_admin_delete" ON productos FOR DELETE
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id = 1));

-- Usuarios: cada quien ve su perfil, admin ve todos
CREATE POLICY "usuarios_self_select" ON usuarios FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM usuarios u2 WHERE u2.id = auth.uid() AND u2.rol_id = 1));
CREATE POLICY "usuarios_self_insert" ON usuarios FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "usuarios_admin_update" ON usuarios FOR UPDATE
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM usuarios u2 WHERE u2.id = auth.uid() AND u2.rol_id = 1));

-- Pedidos: usuario ve sus pedidos, admin ve todos
CREATE POLICY "pedidos_self_select" ON pedidos FOR SELECT
  USING (usuario_id = auth.uid() OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IN (1,2)));
CREATE POLICY "pedidos_insert" ON pedidos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Detalle pedidos: acceso a través de pedidos
CREATE POLICY "detalle_select" ON detalle_pedidos FOR SELECT USING (true);
CREATE POLICY "detalle_insert" ON detalle_pedidos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Comprobantes: usuario ve los suyos, admin ve todos
CREATE POLICY "comprobantes_select" ON comprobantes_sri FOR SELECT USING (true);
CREATE POLICY "comprobantes_insert" ON comprobantes_sri FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Revocar ejecución pública de rls_auto_enable (si existe en la base)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- =====================
-- SEED DATA: 23 Productos de Lácteos Leo
-- =====================
INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria, unidad, imagen_url, badge) VALUES
  ('leo-queso-maduro', 'Queso Maduro', 'Queso madurado, sabor intenso y textura firme. Ideal para tablas, sánduches y sopas.', 1.70, 100, 'quesos', '/ 500g', '/productos/maduro.png', 'Popular'),
  ('leo-queso-tierno', 'Queso Tierno', 'Queso suave y cremoso, ideal para untar o preparar sánduches. Rico en calcio y bajo en sal.', 1.70, 100, 'quesos', '/ 500g', '/productos/Tierno.png', 'Tierno'),
  ('leo-queso-cuadrado-500', 'Queso Cuadrado 500g', 'Queso de mesa en presentación cuadrada de 500g, ideal para uso diario y cocina tradicional.', 1.70, 100, 'quesos', '/ 500g', '/productos/Queso-mesa-500.png', 'Clásico'),
  ('leo-queso-familiar-750', 'Queso Familiar', 'Queso de mesa en presentación familiar, perfecto para familias grandes y todas tus comidas.', 2.25, 80, 'quesos', '/ 750g', '/productos/Queso-mesa-750.png', 'Familiar'),
  ('leo-queso-redondo-500', 'Queso de Mesa Redondo', 'Queso de mesa en presentación redonda tradicional, ideal para uso diario en el hogar.', 1.70, 100, 'quesos', '/ 500g', '/productos/mesa-redondo.png', 'Tradicional'),
  ('leo-mozzarella-pequeno', 'Mozzarella Pequeño', 'Mozzarella en presentación pequeña, perfecta para consumo individual o refrigerios rápidos.', 0.80, 150, 'quesos', '/ 125g', '/productos/mozarella-pequeño-.png', 'Práctico'),
  ('leo-mozzarella-entero-500', 'Mozzarella Entero 500g', 'Mozzarella entero o laminado de 500g, perfecto para fundir en pizzas, lasañas y sándwiches gourmet.', 2.50, 80, 'quesos', '/ 500g', '/productos/Mozarella-entero-500gr.png', 'Familiar'),
  ('leo-cheddar-500', 'Queso Cheddar 500g', 'Queso cheddar madurado con sabor intenso y textura firme, especial para hamburguesas y cocina.', 2.50, 60, 'quesos', '/ 500g', '/productos/cheedar-500g.png', 'Nuevo'),
  ('leo-mozzarella-bolita', 'Queso Mozzarella (Bolita)', 'Mozzarella fresca en presentación de bolitas (bocaditos), excelente para ensaladas y picadas.', 1.70, 90, 'quesos', '/ 500g', '/productos/bolita-mozarella.png', 'Especial'),
  ('leo-bloque-mozzarella', 'Bloque de Mozzarella', 'Queso suave y elástico en formato industrial de 2.5 kg, rendimiento superior para restaurantes y pizzerías.', 12.00, 30, 'quesos', '/ 2.5 kg', '/productos/bloque-mozarella-1.png', 'Premium'),
  ('leo-funda-yogurt', 'Funda de Yogurt', 'Yogurt en presentación de funda, práctico y económico para la lonchera y el consumo diario.', 1.60, 200, 'yogures', '/ Pack 90ml', '/productos/funda-yogurt-1.png', 'Práctico'),
  ('leo-yogurt-cereal', 'Yogurt con Cereal', 'Yogurt natural combinado con cereal crujiente, perfecto para un desayuno nutritivo y delicioso en cualquier lugar.', 3.00, 120, 'yogures', '/ Pack 90ml', '/productos/yogurt-cereal.png', 'Nuevo'),
  ('leo-yogurt-medio-litro', 'Yogurt de 1/2 Lt', 'Yogurt natural de medio litro en variados sabores frutales, ideal para consumo individual o en pareja.', 0.50, 250, 'yogures', '/ 250ml', '/productos/yogurt-12.png', 'Económico'),
  ('leo-yogurt-1lt', 'Yogur Natural 1L', 'Yogur natural cremoso y fresco, rico en probióticos y calcio. Con auténtica pulpa de frutas.', 1.00, 200, 'yogures', '/ 1 Litro', '/productos/yogurt-1lt.png', 'Fresco'),
  ('leo-yogurt-2lt', 'Yogur Natural 2L', 'Yogur natural en presentación familiar de 2 litros, el favorito para compartir en la mesa familiar.', 1.60, 150, 'yogures', '/ 2 Litros', '/productos/yogurt-2lt-junto.png', 'Familiar'),
  ('leo-yogurt-4lt', 'Yogurt 4L (Galón)', 'Yogurt natural en presentación familiar máxima de 4 litros, rendimiento insuperable para toda la semana.', 3.25, 80, 'yogures', '/ 4 Litros', '/productos/yogurt-4lt.png', 'Familiar'),
  ('leo-naranjada', 'Naranjadas', 'Refrescante bebida de naranja con un sabor natural que te llena de energía en cada sorbo.', 1.50, 200, 'bebidas', '/ Pack 200ml', '/productos/naranjada.png', 'Natural'),
  ('leo-colas', 'Colas', 'Bebida refrescante sabor cola, excelente acompañamiento para tus refrigerios y comidas.', 1.50, 200, 'bebidas', '/ Pack 200ml', '/productos/cola.png', 'Refrescante'),
  ('leo-bolos', 'Bolos', 'Bebida refrescante tradicional en forma de bolos helados, perfecta para refrescarse en los días soleados.', 1.50, 200, 'bebidas', '/ Pack 200ml', '/productos/bolos-1.png', 'Refrescante'),
  ('leo-bebas', 'Bebas Refrescantes', 'Bebida refrescante natural para el hogar o la lonchera de los niños.', 1.00, 180, 'bebidas', '/ 200ml', '/productos/beba.png', 'Natural'),
  ('leo-gelatina', 'Gelatina', 'Gelatina refrescante y deliciosa en variados sabores, perfecta como postre o merienda.', 1.50, 150, 'especiales', '/ Pack 100ml', '/productos/gelatina1.png', 'Dulce'),
  ('leo-mantequilla-bolita', 'Bolita de Mantequilla', 'Mantequilla artesanal en forma de bolitas elaborada con crema de leche fresca de pastoreo, sin aditivos.', 1.00, 100, 'especiales', '/ 500g', '/productos/bolita-mantequilla.jpeg', 'Artesanal'),
  ('leo-queso-manaba', 'Queso Manaba', 'Queso tradicional con sabor auténtico y punto de sal criollo, ideal para verde, bolón o patacones.', 2.50, 70, 'especiales', '/ 500g', '/productos/manaba.jpeg', 'Tradicional')
ON CONFLICT (codigo) DO NOTHING;
