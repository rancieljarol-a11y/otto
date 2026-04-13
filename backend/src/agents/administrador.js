// OttO - Agente Administrador
// Solo para: dueño, supervisor
// Nivel: 50% reglas, 30% NLP, 20% IA

const Negocio = require('../models/negocio');
const Cliente = require('../models/cliente');
const Producto = require('../models/producto');
const Pedido = require('../models/pedido');
const Gastos = require('../models/gastos');
const WhatsAppService = require('../services/whatsapp');

class AgenteAdministrador {
  // Verificar permisos
  static puedeEjecutar(rol) {
    return ['dueño', 'supervisor'].includes(rol);
  }

  // Procesar comando de administración
  static async procesar(mensaje, contexto) {
    const { rol } = contexto;
    
    if (!this.puedeEjecutar(rol)) {
      return { texto: 'No tienes permisos de administrador.', error: 'sin_permisos' };
    }

    const msgLower = mensaje.toLowerCase();
    const partes = mensaje.split(' ');
    const comando = partes[1]?.toLowerCase() || partes[0]?.toLowerCase();

    // Comandos de administración
    const comandos = {
      // Gestión de productos
      'agregar': () => this.agregarProducto(mensaje, contexto),
      'editar': () => this.editarProducto(mensaje, contexto),
      'eliminar': () => this.eliminarProducto(mensaje, contexto),
      'stock': () => this.actualizarStock(mensaje, contexto),
      
      // Gestión de clientes
      'bloquear': () => this.bloquearCliente(mensaje, contexto),
      'desbloquear': () => this.desbloquearCliente(mensaje, contexto),
      'deuda': () => this.manejarDeuda(mensaje, contexto),
      
      // Reportes
      'reporte': () => this.generarReporte(mensaje, contexto),
      'stats': () => this.verStats(contexto),
      'ventas': () => this.verVentas(mensaje, contexto),
      
      // Gestión del negocio
      'config': () => this.configurarNegocio(mensaje, contexto),
      'horario': () => this.configurarHorario(mensaje, contexto),
      'personalidad': () => this.configurarPersonalidad(mensaje, contexto),
      
      // Empleados
      'empleado': () => this.gestionarEmpleado(mensaje, contexto),
      
      // Pagos y costos
      'gasto': () => this.registrarGasto(mensaje, contexto),
      'costo': () => this.actualizarCosto(mensaje, contexto),
      
      // Misc
      'ayuda': () => this.ayudaAdmin()
    };

    if (comandos[comando]) {
      return await comandos[comando]();
    }

    // Si no es un comando, tratar como texto libre
    return { texto: 'Comando no reconocido. Escribe "admin ayuda" para ver comandos disponibles.' };
  }

  // ========== GESTIÓN DE PRODUCTOS ==========

  static async agregarProducto(mensaje, contexto) {
    const { negocio } = contexto;
    // Extraer: nombre | precio | categoría | descripción
    const partes = mensaje.split('|').map(p => p.trim());
    
    if (partes.length < 2) {
      return { texto: 'Uso: agregar producto | nombre | precio | categoría | descripción' };
    }

    const producto = await Producto.create(negocio.id, {
      nombre: partes[0],
      precio: parseFloat(partes[1]),
      categoria: partes[2] || 'General',
      descripcion: partes[3] || '',
      activo: true
    });

    return { texto: `✅ Producto agregado: *${producto.nombre}* - RD$${producto.precio.toFixed(2)}` };
  }

  static async editarProducto(mensaje, contexto) {
    const { negocio } = contexto;
    // Extraer: id | campo | valor
    const match = mensaje.match(/editar\s+producto\s+(\S+)\s+(\w+)\s+(.+)/i);
    if (!match) {
      return { texto: 'Uso: editar producto [id] [campo] [valor]' };
    }

    const [_, id, campo, valor] = match;
    const actualizacion = { [campo]: campo === 'precio' ? parseFloat(valor) : valor };
    
    const producto = await Producto.update(id, negocio.id, actualizacion);
    return { texto: `✅ Producto actualizado: *${producto.nombre}*` };
  }

  static async eliminarProducto(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/eliminar\s+producto\s+(\S+)/i);
    if (!match) {
      return { texto: 'Uso: eliminar producto [id]' };
    }

    await Producto.deactivate(match[1], negocio.id);
    return { texto: '✅ Producto eliminado (desactivado)' };
  }

  static async actualizarStock(mensaje, contexto) {
    const { negocio } = contexto;
    // stock producto_id cantidad
    const match = mensaje.match(/stock\s+(\S+)\s+([+-]?\d+)/i);
    if (!match) {
      return { texto: 'Uso: stock [producto_id] [+/-cantidad]' };
    }

    const [_, productoId, cantidad] = match;
    const producto = await Producto.updateStock(productoId, negocio.id, parseInt(cantidad));
    
    return { texto: `📦 Stock de *${producto.nombre}* actualizado: ${producto.stock_actual} unidades` };
  }

  // ========== GESTIÓN DE CLIENTES ==========

  static async bloquearCliente(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/bloquear\s+cliente\s+(\S+)/i);
    if (!match) {
      return { texto: 'Uso: bloquear cliente [teléfono/id]' };
    }

    await Cliente.block(match[1], negocio.id);
    return { texto: '✅ Cliente bloqueado' };
  }

  static async desbloquearCliente(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/desbloquear\s+cliente\s+(\S+)/i);
    if (!match) {
      return { texto: 'Uso: desbloquear cliente [teléfono/id]' };
    }

    await Cliente.unblock(match[1], negocio.id);
    return { texto: '✅ Cliente desbloqueado' };
  }

  static async manejarDeuda(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/deuda\s+(\S+)\s+(agregar|pagar|ver)\s*([\d.]*)?/i);
    if (!match) {
      return { texto: 'Uso: deuda [cliente] [agregar|pagar|ver] [monto]' };
    }

    const [_, clienteId, accion, monto] = match;

    if (accion === 'ver') {
      const cliente = await Cliente.findById(clienteId, negocio.id);
      return { texto: `💰 Deuda actual: RD$${(cliente?.deuda_activa || 0).toFixed(2)}` };
    }

    if (accion === 'agregar') {
      await Cliente.addDeuda(clienteId, negocio.id, parseFloat(monto));
      return { texto: `✅ Deuda agregada: RD$${parseFloat(monto).toFixed(2)}` };
    }

    if (accion === 'pagar') {
      await Cliente.payDeuda(clienteId, negocio.id, parseFloat(monto));
      return { texto: `✅ Pago registrado` };
    }
  }

  // ========== REPORTES ==========

  static async generarReporte(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/reporte\s+(diario|semanal|mensual)?/i);
    const tipo = match?.[1] || 'diario';
    
    const hoy = new Date();
    let desde, hasta;

    if (tipo === 'diario') {
      desde = new Date(hoy.setHours(0,0,0,0));
      hasta = new Date(hoy.setHours(23,59,59,999));
    } else if (tipo === 'semanal') {
      desde = new Date(hoy.setDate(hoy.getDate() - 7));
      hasta = new Date();
    } else {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      hasta = new Date();
    }

    const stats = await Pedido.getStats(negocio.id, desde, hasta);
    const gastos = await Gastos.getTotal(negocio.id, desde, hasta);
    
    const ingresos = parseFloat(stats.ventas_totales || 0);
    const gastosTotal = parseFloat(gastos?.total || 0);
    const gananciaNeta = ingresos - gastosTotal;

    let reporte = `📊 *REPORTE ${tipo.toUpperCase()}*\n\n`;
    reporte += `*Ventas:*\n`;
    reporte += `• Pedidos: ${stats.total_pedidos || 0}\n`;
    reporte += `• Ingresos: RD$${ingresos.toFixed(2)}\n`;
    reporte += `• Promedio: RD$${(stats.promedio_pedido || 0).toFixed(2)}\n\n`;
    reporte += `*Gastos:* RD$${gastosTotal.toFixed(2)}\n\n`;
    reporte += `*GANANCIA NETA: RD$${gananciaNeta.toFixed(2)}*`;

    return { texto: reporte };
  }

  static async verStats(contexto) {
    const { negocio } = contexto;
    const stats = await Pedido.getStats(negocio.id);
    const clientes = await Cliente.getStats(negocio.id);

    let mensaje = `📈 *ESTADÍSTICAS*\n\n`;
    mensaje += `*Pedidos:*\n`;
    mensaje += `• Nuevos: ${stats.nuevos}\n`;
    mensaje += `• Confirmados: ${stats.confirmados}\n`;
    mensaje += `• Entregados: ${stats.entregados}\n`;
    mensaje += `• Cancelados: ${stats.cancelados}\n\n`;
    mensaje += `*Clientes:*\n`;
    mensaje += `• Total: ${clientes.total}\n`;
    mensaje += `• Bloqueados: ${clientes.bloqueados}\n`;
    mensaje += `• Con deuda: ${clientes.con_deuda}`;

    return { texto: mensaje };
  }

  static async verVentas(msg, contexto) {
    const { negocio } = contexto;
    const match = msg.match(/ventas\s+(\d+)?/i);
    const limit = parseInt(match?.[1]) || 10;

    const pedidos = await Pedido.getRecientes(negocio.id, limit);

    let mensaje = `🛒 *ÚLTIMAS VENTAS*\n\n`;
    for (const p of pedidos) {
      const fecha = new Date(p.fecha_pedido).toLocaleTimeString('es-PE');
      mensaje += `*${p.numero_pedido}* - ${fecha}\n`;
      mensaje += `  ${p.estado} | RD$${p.total.toFixed(2)}\n`;
    }

    return { texto: mensaje };
  }

  // ========== GESTIÓN DEL NEGOCIO ==========

  static async configurarNegocio(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/config\s+(\w+)\s+(.+)/i);
    if (!match) {
      return { texto: 'Uso: config [campo] [valor]' };
    }

    const [_, campo, valor] = match;
    await Negocio.update(negocio.id, { [campo]: valor });

    return { texto: `✅ Configuración actualizada: ${campo} = ${valor}` };
  }

  static async configurarHorario(mensaje, contexto) {
    const { negocio } = contexto;
    // horario lunes 08:00-22:00
    const match = mensaje.match(/horario\s+(\w+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})/i);
    if (!match) {
      return { texto: 'Uso: horario [día] [inicio]-[fin]\nejemplo: horario lunes 08:00-22:00' };
    }

    const [_, dia, inicio, fin] = match;
    const horario = negocio.horario_atencion || {};
    horario[dia.toLowerCase()] = { inicio, fin, activo: true };

    await Negocio.update(negocio.id, { horario_atencion: horario });
    return { texto: `✅ Horario actualizado para ${dia}: ${inicio} - ${fin}` };
  }

  static async configurarPersonalidad(mensaje, contexto) {
    const { negocio } = contexto;
    // personalidad Soy un bot amigable...
    const match = mensaje.match(/personalidad\s+(.+)/i);
    if (!match) {
      return { texto: 'Uso: personalidad [texto de personalidad del bot]' };
    }

    await Negocio.update(negocio.id, { personalidad_bot: match[1] });
    return { texto: '✅ Personalidad del bot actualizada' };
  }

  // ========== EMPLEADOS ==========

  static async gestionarEmpleado(mensaje, contexto) {
    const { negocio } = contexto;
    const match = mensaje.match(/empleado\s+(agregar|eliminar|ver)\s+(.+)?/i);
    if (!match) {
      return { texto: 'Uso: empleado [agregar|eliminar|ver] [número]' };
    }

    const [_, accion, dato] = match;

    if (accion === 'ver') {
      const empleados = await Negocio.getNumerosAutorizados(negocio.id);
      let msg = '👥 *Empleados autorizados:*\n\n';
      for (const e of empleados) {
        msg += `• ${e.nombre} (${e.rol}): ${e.numero_whatsapp}\n`;
      }
      return { texto: msg };
    }

    if (accion === 'agregar') {
      const [numero, nombre, rol] = dato.split(' ').filter(Boolean);
      await Negocio.addNumeroAutorizado(negocio.id, numero, nombre, rol || 'empleado');
      return { texto: `✅ Empleado agregado: ${nombre}` };
    }

    if (accion === 'eliminar') {
      const db = require('../config/database');
      await db.query(
        `UPDATE numeros_autorizados SET activo = false 
         WHERE negocio_id = $1 AND numero_whatsapp = $2`,
        [negocio.id, dato]
      );
      return { texto: '✅ Empleado eliminado' };
    }
  }

  // ========== GASTOS ==========

  static async registrarGasto(mensaje, contexto) {
    const { negocio } = contexto;
    // gasto | descripción | monto | tipo(fijo/variable)
    const partes = mensaje.split('|').map(p => p.trim());
    
    if (partes.length < 3) {
      return { texto: 'Uso: gasto | descripción | monto | tipo' };
    }

    const GastosModel = require('../models/gastos');
    await GastosModel.create(negocio.id, {
      descripcion: partes[0],
      monto: parseFloat(partes[1]),
      tipo: partes[2] || 'variable',
      fecha: new Date()
    });

    return { texto: `✅ Gasto registrado: RD$${parseFloat(partes[1]).toFixed(2)}` };
  }

  static async actualizarCosto(mensaje, contexto) {
    const { negocio } = contexto;
    // costo | producto_id | componente | costo
    const partes = mensaje.split('|').map(p => p.trim());
    
    const CostosModel = require('../models/costos');
    await CostosModel.upsert(negocio.id, {
      producto_id: partes[1],
      componente: partes[2],
      costo_unitario: parseFloat(partes[3])
    });

    return { texto: '✅ Costo actualizado' };
  }

  // ========== AYUDA ==========

  static ayudaAdmin() {
    return `*ADMIN - Comandos disponibles:*

*Productos:*
agregar producto | nombre | precio | categoría
editar producto [id] [campo] [valor]
eliminar producto [id]
stock [id] [+/-cantidad]

*Clientes:*
bloquear cliente [teléfono]
desbloquear cliente [teléfono]
deuda [cliente] [agregar|pagar|ver] [monto]

*Reportes:*
reporte [diario|semanal|mensual]
stats
ventas [cantidad]

*Negocios:*
config [campo] [valor]
horario [día] [inicio]-[fin]
personalidad [texto]

*Empleados:*
empleado ver
empleado agregar [número] [nombre] [rol]
empleado eliminar [número]

*Gastos:*
gasto | descripción | monto | tipo
costo | producto | componente | costo

*General:*
ayuda - mostrar esta ayuda`;
  }
}

module.exports = AgenteAdministrador;