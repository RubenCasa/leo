-- ============================================================================
-- SOLUCIÓN INMEDIATA AL ERROR DE RECURSIÓN INFINITA EN SUPABASE
-- Error: "infinite recursion detected in policy for relation usuarios"
-- Instrucciones: Copia todo este código, ve a Supabase Dashboard -> SQL Editor -> New Query,
-- pega el código y presiona RUN.
-- ============================================================================

-- 1. Crear funciones helper SECURITY DEFINER para chequear roles sin activar políticas RLS de usuarios en bucle
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id = 1
  );
$$;

CREATE OR REPLACE FUNCTION public.es_admin_o_vendedor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IN (1, 2)
  );
$$;

-- 2. Eliminar las políticas antiguas que causaban el bucle de recursión en la tabla usuarios
DROP POLICY IF EXISTS "usuarios_self_select" ON usuarios;
DROP POLICY IF EXISTS "usuarios_admin_update" ON usuarios;

-- 3. Crear las nuevas políticas limpias para usuarios
CREATE POLICY "usuarios_self_select" ON usuarios FOR SELECT
  USING (id = auth.uid() OR public.es_admin());

CREATE POLICY "usuarios_admin_update" ON usuarios FOR UPDATE
  USING (id = auth.uid() OR public.es_admin());

-- 4. Actualizar las políticas de productos para usar la función segura
DROP POLICY IF EXISTS "productos_admin_all" ON productos;
DROP POLICY IF EXISTS "productos_admin_update" ON productos;
DROP POLICY IF EXISTS "productos_admin_delete" ON productos;

CREATE POLICY "productos_admin_all" ON productos FOR INSERT
  WITH CHECK (public.es_admin());

CREATE POLICY "productos_admin_update" ON productos FOR UPDATE
  USING (public.es_admin());

CREATE POLICY "productos_admin_delete" ON productos FOR DELETE
  USING (public.es_admin());

-- 5. Actualizar la política de pedidos para usar la función segura
DROP POLICY IF EXISTS "pedidos_self_select" ON pedidos;

CREATE POLICY "pedidos_self_select" ON pedidos FOR SELECT
  USING (usuario_id = auth.uid() OR public.es_admin_o_vendedor());
