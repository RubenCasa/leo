/**
 * Servicio de Productos — CRUD completo contra Supabase (PostgreSQL)
 * Capa Modelo del patrón MVC para la entidad Productos.
 */
import { supabase } from './supabase';

export interface ProductoDB {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  unidad: string;
  imagen_url: string;
  badge: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductoDTO {
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  unidad: string;
  imagen_url?: string;
  badge?: string;
}

export interface UpdateProductoDTO {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  categoria?: string;
  unidad?: string;
  imagen_url?: string;
  badge?: string;
  activo?: boolean;
}

// ============================================================================
// LECTURA (todos los roles pueden leer productos activos)
// ============================================================================

/**
 * Obtener todos los productos activos (para catálogo público).
 */
export const fetchProductos = async (): Promise<ProductoDB[]> => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    console.error('[ProductosService] Error al obtener productos:', error.message);
    throw error;
  }

  return data || [];
};

/**
 * Obtener TODOS los productos (incluyendo inactivos) — solo para admin.
 */
export const fetchTodosProductos = async (): Promise<ProductoDB[]> => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProductosService] Error al obtener todos los productos:', error.message);
    throw error;
  }

  return data || [];
};

/**
 * Obtener un producto por ID.
 */
export const fetchProductoPorId = async (id: number): Promise<ProductoDB | null> => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[ProductosService] Error al obtener producto:', error.message);
    return null;
  }

  return data;
};

// ============================================================================
// CREACIÓN (solo admin — RF regla de negocio: precio > 0, stock >= 0)
// ============================================================================

/**
 * Crear un nuevo producto. Valida reglas de negocio antes de insertar.
 */
export const crearProducto = async (dto: CreateProductoDTO): Promise<ProductoDB> => {
  // Validación de reglas de negocio
  if (dto.precio <= 0) {
    throw new Error('El precio debe ser mayor a $0.00. No se permite un precio menor o igual a cero.');
  }
  if (dto.stock < 0) {
    throw new Error('El stock no puede ser negativo.');
  }

  const { data, error } = await supabase
    .from('productos')
    .insert([{
      ...dto,
      activo: true,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('[ProductosService] Error al crear producto:', error.message);
    throw error;
  }

  return data;
};

// ============================================================================
// ACTUALIZACIÓN (solo admin — RF regla de negocio: precio > 0, stock >= 0)
// ============================================================================

/**
 * Actualizar un producto existente. Valida reglas de negocio.
 */
export const actualizarProducto = async (id: number, dto: UpdateProductoDTO): Promise<ProductoDB> => {
  // Validaciones de reglas de negocio
  if (dto.precio !== undefined && dto.precio <= 0) {
    throw new Error('El precio debe ser mayor a $0.00.');
  }
  if (dto.stock !== undefined && dto.stock < 0) {
    throw new Error('El stock no puede ser negativo.');
  }

  const { data, error } = await supabase
    .from('productos')
    .update({
      ...dto,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ProductosService] Error al actualizar producto:', error.message);
    throw error;
  }

  return data;
};

// ============================================================================
// ELIMINACIÓN (solo admin — RF: PROHIBIDO eliminar si stock > 0)
// ============================================================================

/**
 * Eliminar un producto. BLOQUEA la operación si el stock es mayor a 0.
 */
export const eliminarProducto = async (id: number): Promise<void> => {
  // Primero verificar el stock actual
  const producto = await fetchProductoPorId(id);
  if (!producto) {
    throw new Error('Producto no encontrado.');
  }

  // REGLA DE NEGOCIO CRÍTICA: No se puede eliminar si stock > 0
  if (producto.stock > 0) {
    throw new Error(
      `⚠️ DENEGADO: No se puede eliminar "${producto.nombre}" porque tiene ${producto.stock} unidades en stock. ` +
      `Primero debe agotar o transferir el inventario existente para proteger la integridad del inventario.`
    );
  }

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ProductosService] Error al eliminar producto:', error.message);
    throw error;
  }
};

// ============================================================================
// OPERACIONES DE STOCK (RF-04: Descuento automático de inventario)
// ============================================================================

/**
 * Descuenta stock de un producto tras confirmar un pedido.
 * Verifica que haya stock suficiente antes de descontar.
 */
export const descontarStock = async (productoId: number, cantidad: number): Promise<void> => {
  // Obtener stock actual
  const producto = await fetchProductoPorId(productoId);
  if (!producto) {
    throw new Error(`Producto con ID ${productoId} no encontrado.`);
  }

  if (producto.stock < cantidad) {
    throw new Error(
      `Stock insuficiente para "${producto.nombre}". ` +
      `Disponible: ${producto.stock}, Solicitado: ${cantidad}.`
    );
  }

  const nuevoStock = producto.stock - cantidad;

  const { error } = await supabase
    .from('productos')
    .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
    .eq('id', productoId);

  if (error) {
    console.error('[ProductosService] Error al descontar stock:', error.message);
    throw error;
  }
};

/**
 * Descuenta stock de múltiples productos en una transacción de pedido.
 */
export const descontarStockMultiple = async (
  items: Array<{ productoId: number; cantidad: number; nombre: string }>
): Promise<void> => {
  // Verificar stock de todos los productos primero
  for (const item of items) {
    const producto = await fetchProductoPorId(item.productoId);
    if (!producto) {
      throw new Error(`Producto "${item.nombre}" no encontrado en la base de datos.`);
    }
    if (producto.stock < item.cantidad) {
      throw new Error(
        `Stock insuficiente para "${item.nombre}". ` +
        `Disponible: ${producto.stock}, En tu carrito: ${item.cantidad}.`
      );
    }
  }

  // Si todos tienen stock, descontar uno por uno
  for (const item of items) {
    await descontarStock(item.productoId, item.cantidad);
  }
};

// ============================================================================
// PEDIDOS
// ============================================================================

export interface CreatePedidoDTO {
  usuario_id: string;
  numero_pedido: string;
  total: number;
  metodo_pago: string;
  auth_code: string;
  items: Array<{
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

/**
 * Crea un pedido completo con sus detalles y descuenta el stock automáticamente.
 */
export const crearPedidoCompleto = async (dto: CreatePedidoDTO): Promise<number> => {
  // 1. Insertar el pedido principal
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert([{
      usuario_id: dto.usuario_id,
      numero_pedido: dto.numero_pedido,
      total: dto.total,
      metodo_pago: dto.metodo_pago,
      auth_code: dto.auth_code,
      estado: 'completado'
    }])
    .select('id')
    .single();

  if (pedidoError) {
    console.error('[ProductosService] Error al crear pedido:', pedidoError.message);
    throw pedidoError;
  }

  const pedidoId = pedido.id;

  // 2. Insertar los detalles del pedido
  const detalles = dto.items.map(item => ({
    pedido_id: pedidoId,
    producto_id: item.producto_id,
    nombre_producto: item.nombre_producto,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal
  }));

  const { error: detalleError } = await supabase
    .from('detalle_pedidos')
    .insert(detalles);

  if (detalleError) {
    console.error('[ProductosService] Error al insertar detalles del pedido:', detalleError.message);
    throw detalleError;
  }

  // 3. Descontar stock de cada producto (RF-04)
  for (const item of dto.items) {
    await descontarStock(item.producto_id, item.cantidad);
  }

  return pedidoId;
};

/**
 * Guardar comprobante SRI en la base de datos.
 */
export const guardarComprobanteSRI = async (
  pedidoId: number,
  claveAcceso: string,
  secuencial: string,
  xmlContenido: string
): Promise<void> => {
  const { error } = await supabase
    .from('comprobantes_sri')
    .insert([{
      pedido_id: pedidoId,
      clave_acceso: claveAcceso,
      secuencial,
      xml_contenido: xmlContenido,
      estado: 'emitido'
    }]);

  if (error) {
    console.error('[ProductosService] Error al guardar comprobante SRI:', error.message);
    throw error;
  }
};

// ============================================================================
// REPORTES Y ESTADÍSTICAS (para Dashboard admin)
// ============================================================================

/**
 * Obtener todos los pedidos (para reportes del admin).
 */
export const fetchTodosPedidos = async () => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      usuarios (nombre, email, cedula),
      detalle_pedidos (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProductosService] Error al obtener pedidos:', error.message);
    throw error;
  }

  return data || [];
};

/**
 * Obtener estadísticas resumidas para el dashboard.
 */
export const fetchEstadisticasDashboard = async () => {
  // Total de productos
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true });

  // Total de pedidos
  const { count: totalPedidos } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true });

  // Total de usuarios
  const { count: totalUsuarios } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true });

  // Ventas totales
  const { data: ventasData } = await supabase
    .from('pedidos')
    .select('total');
  
  const ventasTotales = ventasData?.reduce((sum, p) => sum + Number(p.total), 0) || 0;

  // Pedidos por mes (últimos 6 meses)
  const { data: pedidosMensuales } = await supabase
    .from('pedidos')
    .select('created_at, total')
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  return {
    totalProductos: totalProductos || 0,
    totalPedidos: totalPedidos || 0,
    totalUsuarios: totalUsuarios || 0,
    ventasTotales,
    pedidosMensuales: pedidosMensuales || []
  };
};

/**
 * Obtener todos los usuarios (solo admin).
 */
export const fetchTodosUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      roles (nombre, descripcion)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProductosService] Error al obtener usuarios:', error.message);
    throw error;
  }

  return data || [];
};

/**
 * Cambiar el rol de un usuario (solo admin).
 */
export const cambiarRolUsuario = async (usuarioId: string, nuevoRolId: number): Promise<void> => {
  const { error } = await supabase
    .from('usuarios')
    .update({ rol_id: nuevoRolId })
    .eq('id', usuarioId);

  if (error) {
    console.error('[ProductosService] Error al cambiar rol:', error.message);
    throw error;
  }
};

// ============================================================================
// HISTORIAL DE FACTURAS Y COMPROBANTES POR USUARIO (Supabase)
// ============================================================================

export interface FacturaUsuarioDB {
  id: number;
  pedido_id: number;
  clave_acceso: string;
  secuencial: string;
  xml_contenido: string;
  estado: string;
  created_at: string;
  pedidos?: {
    numero_pedido: string;
    total: number;
    metodo_pago: string;
    created_at: string;
  };
}

/**
 * Obtiene el registro e historial de facturas SRI de un usuario desde Supabase.
 */
export const obtenerFacturasUsuario = async (usuarioId: string): Promise<FacturaUsuarioDB[]> => {
  // 1. Obtener los pedidos de este usuario
  const { data: pedidosUsuario, error: pedidosError } = await supabase
    .from('pedidos')
    .select('id, numero_pedido, total, metodo_pago, created_at')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });

  if (pedidosError) {
    console.error('[ProductosService] Error al obtener pedidos del usuario:', pedidosError.message);
    throw new Error(`Error Supabase Pedidos: ${pedidosError.message}`);
  }

  if (!pedidosUsuario || pedidosUsuario.length === 0) {
    return [];
  }

  const pedidoIds = pedidosUsuario.map(p => p.id);

  // 2. Obtener los comprobantes SRI asociados a los pedidos del usuario
  const { data: comprobantes, error: comprobantesError } = await supabase
    .from('comprobantes_sri')
    .select('*')
    .in('pedido_id', pedidoIds)
    .order('created_at', { ascending: false });

  if (comprobantesError) {
    console.error('[ProductosService] Error al obtener comprobantes SRI:', comprobantesError.message);
    throw new Error(`Error Supabase Comprobantes: ${comprobantesError.message}`);
  }

  // 3. Vincular los datos del pedido a cada comprobante
  return (comprobantes || []).map(comp => {
    const pedido = pedidosUsuario.find(p => p.id === comp.pedido_id);
    return {
      ...comp,
      pedidos: pedido ? {
        numero_pedido: pedido.numero_pedido,
        total: Number(pedido.total),
        metodo_pago: pedido.metodo_pago || 'card',
        created_at: pedido.created_at
      } : undefined
    };
  });
};
