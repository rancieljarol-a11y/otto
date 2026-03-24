// OttO - Agente de Ventas INTEGRADO v4
// Con IA para respuestas naturales y personalizadas

const Negocio = require('../models/negocio');
const Producto = require('../models/producto');
const Pedido = require('../models/pedido');
const WhatsAppService = require('../services/whatsapp');
const { DetectorComplejidad, EnrutadorMensajes } = require('./hibrido');
const { NormalizadorIntencion, UtilidadesTexto } = require('./normalizador');

const DEBUG = true;

function logdebug(...args) {
  if (DEBUG) console.log('[DEBUG]', ...args);
}

const ESTADOS = {
  INICIO: 'inicio',
  ESPERANDO_DIRECCION: 'esperando_direccion',
  ESPERANDO_HORA: 'esperando_hora',
  CONFIRMANDO: 'confirmando',
  COMPLETADO: 'completado'
};

class ValidadorIntencion {
  static validar(intencionNormalizada, contextoActual) {
    const { intencion, datos } = intencionNormalizada;
    
    if (intencion === 'confirmar_pedido' || intencion === 'confirmar') {
      if (!contextoActual?.productos?.length) {
        return {
          valida: false,
          intencion: 'desconocido',
          datos: {},
          error: 'No tienes ningún pedido en proceso. ¿Qué te gustaría pedir?',
          falta: ['producto']
        };
      }
      
      if (!contextoActual.direccion) {
        return {
          valida: false,
          intencion: 'dar_direccion',
          datos: {},
          error: '¿A qué dirección lo entregamos?',
          falta: ['direccion']
        };
      }
      
      if (!contextoActual.hora_entrega) {
        return {
          valida: false,
          intencion: 'dar_hora',
          datos: {},
          error: '¿Para qué hora lo necesitas?',
          falta: ['hora']
        };
      }
      
      return { valida: true, intencion, datos };
    }
    
    if (intencion === 'cancelar') {
      return { valida: true, intencion: 'cancelar', datos };
    }
    
    return { valida: true, intencion, datos };
  }
}

class MaquinaEstados {
  static clientes = {};

  static obtenerEstado(numeroCliente) {
    if (!this.clientes[numeroCliente]) {
      this.clientes[numeroCliente] = {
        estado: ESTADOS.INICIO,
        productos: [],
        direccion: null,
        hora_entrega: null,
        destinatario: null,
        nombre_cliente: null
      };
      logdebug(`   [Estado] Nuevo cliente: ${numeroCliente}`);
    }
    return this.clientes[numeroCliente];
  }

  static procesar(intencion, datos, numeroCliente, negocio = null) {
    const estado = this.obtenerEstado(numeroCliente);
    const costoEnvio = negocio?.costo_envio || 0;
    let respuesta = null;
    let nuevoEstado = estado.estado;
    
    logdebug(`   [Estado] Actual: ${estado.estado} | Intención: ${intencion}`);
    logdebug(`   [Estado] Productos: ${JSON.stringify(estado.productos)}`);
    logdebug(`   [Estado] Dirección: ${estado.direccion}`);
    logdebug(`   [Estado] Hora: ${estado.hora_entrega}`);

    // Si no hay productos y detecta crear_pedido sin producto, pedir producto
    if (estado.estado === ESTADOS.INICIO && intencion === 'crear_pedido' && !datos.producto) {
      respuesta = '¡Claro! 🌸 ¿Qué tipo de arreglo te gustaría?\n\nTenemos:\n• Ramo de Rosas - $35\n• Caja de Flores - $40\n• Centro de Mesa - $55\n• Arreglo Floral - $45';
      return { texto: respuesta, estado: ESTADOS.INICIO, pedido: estado };
    }

    switch (estado.estado) {
      case ESTADOS.INICIO:
        if (intencion === 'saludar') {
          respuesta = this.respuestaSaludo(estado);
        } else if (intencion === 'crear_pedido' || intencion === 'agregar_producto') {
          if (datos.producto) {
            const qty = datos.cantidad || datos.cantidad_producto || 1;
            const precioUnitario = datos.precio || 35;
            estado.productos.push({
              nombre: datos.producto,
              precio: precioUnitario * qty,
              cantidad: qty
            });
          }
          
          if (datos.direccion && datos.hora) {
            estado.direccion = datos.direccion;
            estado.hora_entrega = datos.hora;
            respuesta = this.respuestaConfirmar(estado, costoEnvio);
            nuevoEstado = ESTADOS.CONFIRMANDO;
          } else if (datos.direccion) {
            estado.direccion = datos.direccion;
            respuesta = this.respuestaHora(estado);
            nuevoEstado = ESTADOS.ESPERANDO_HORA;
          } else if (datos.hora) {
            estado.hora_entrega = datos.hora;
            respuesta = this.respuestaPedido(estado);
            nuevoEstado = ESTADOS.ESPERANDO_DIRECCION;
          } else {
            respuesta = this.respuestaPedido(estado);
            nuevoEstado = ESTADOS.ESPERANDO_DIRECCION;
          }
        } else if (intencion === 'ver_menu') {
          respuesta = this.respuestaMenu();
        } else if (intencion === 'consultar_precio') {
          respuesta = this.respuestaConsultaPrecio();
        } else {
          respuesta = this.respuestaDefault();
        }
        break;
        
      case ESTADOS.ESPERANDO_DIRECCION:
        if (intencion === 'dar_direccion') {
          estado.direccion = datos.direccion || this.extraerDireccion(datos.mensaje) || datos.mensaje || 'dirección no especificada';
          
          if (datos.hora) {
            estado.hora_entrega = datos.hora;
            respuesta = this.respuestaConfirmar(estado, costoEnvio);
            nuevoEstado = ESTADOS.CONFIRMANDO;
          } else {
            respuesta = this.respuestaHora(estado);
            nuevoEstado = ESTADOS.ESPERANDO_HORA;
          }
        } else if (intencion === 'crear_pedido' || intencion === 'agregar_producto') {
          if (datos.producto) {
            estado.productos = [{
              nombre: datos.producto,
              precio: 35,
              cantidad: 1
            }];
          }
          if (datos.direccion && datos.hora) {
            estado.direccion = datos.direccion;
            estado.hora_entrega = datos.hora;
            respuesta = this.respuestaConfirmar(estado, costoEnvio);
            nuevoEstado = ESTADOS.CONFIRMANDO;
          } else if (datos.direccion) {
            estado.direccion = datos.direccion;
            respuesta = this.respuestaHora(estado);
            nuevoEstado = ESTADOS.ESPERANDO_HORA;
          } else {
            respuesta = this.respuestaHora(estado);
            nuevoEstado = ESTADOS.ESPERANDO_HORA;
          }
        } else if (intencion === 'cancelar') {
          this.limpiar(numeroCliente);
          respuesta = 'OK, cancelado. ¿En qué más te puedo ayudar?';
          nuevoEstado = ESTADOS.INICIO;
        } else if (intencion === 'saludar') {
          respuesta = this.respuestaSaludo(estado);
        } else if (intencion === 'confirmar_pedido') {
          respuesta = '¿A qué dirección lo entregamos?';
        } else {
          estado.direccion = datos.mensaje || 'dirección no especificada';
          if (datos.hora) {
            estado.hora_entrega = datos.hora;
            respuesta = this.respuestaConfirmar(estado, costoEnvio);
            nuevoEstado = ESTADOS.CONFIRMANDO;
          } else {
            respuesta = this.respuestaHora(estado);
            nuevoEstado = ESTADOS.ESPERANDO_HORA;
          }
        }
        break;
        
      case ESTADOS.ESPERANDO_HORA:
        if (intencion === 'dar_hora') {
          estado.hora_entrega = datos.hora || this.extraerHoraDelMensaje(datos.mensaje) || 'ahora';
          respuesta = this.respuestaConfirmar(estado, costoEnvio);
          nuevoEstado = ESTADOS.CONFIRMANDO;
        } else if (intencion === 'confirmar_pedido' || intencion === 'confirmar') {
          const ahora = new Date();
          ahora.setHours(ahora.getHours() + 1);
          estado.hora_entrega = `${ahora.getHours()}:00`;
          respuesta = this.respuestaConfirmar(estado, costoEnvio);
          nuevoEstado = ESTADOS.CONFIRMANDO;
        } else if (intencion === 'cancelar') {
          this.limpiar(numeroCliente);
          respuesta = 'OK, cancelado.';
          nuevoEstado = ESTADOS.INICIO;
        } else if (intencion === 'crear_pedido' || intencion === 'agregar_producto') {
          if (datos.producto) {
            estado.productos.push({
              nombre: datos.producto,
              precio: 35,
              cantidad: 1
            });
          }
          respuesta = this.respuestaConfirmar(estado, costoEnvio);
        } else if (intencion === 'dar_direccion') {
          estado.hora_entrega = 'ahora';
          respuesta = this.respuestaConfirmar(estado, costoEnvio);
          nuevoEstado = ESTADOS.CONFIRMANDO;
        } else {
          estado.hora_entrega = this.extraerHoraDelMensaje(datos.mensaje) || datos.mensaje || 'ahora';
          respuesta = this.respuestaConfirmar(estado, costoEnvio);
          nuevoEstado = ESTADOS.CONFIRMANDO;
        }
        break;
        
      case ESTADOS.CONFIRMANDO:
        if (intencion === 'confirmar_pedido' || intencion === 'confirmar') {
          respuesta = `¡Perfecto! 🌹 Tu pedido está confirmado y lo tendrás en${estado.direccion ? ` ${estado.direccion}` : ''} a las ${estado.hora_entrega || 'pronto'}. ¡Que lo disfruten!`;
          this.limpiar(numeroCliente);
          nuevoEstado = ESTADOS.COMPLETADO;
        } else if (intencion === 'cancelar') {
          this.limpiar(numeroCliente);
          respuesta = 'OK, cancelado. ¿En qué más te ayudo?';
          nuevoEstado = ESTADOS.INICIO;
        } else if (intencion === 'crear_pedido') {
          if (datos.producto) {
            estado.productos = [{
              nombre: datos.producto,
              precio: 35,
              cantidad: 1
            }];
          }
          respuesta = this.respuestaHora(estado);
          nuevoEstado = ESTADOS.ESPERANDO_HORA;
        } else {
          respuesta = '¿Confirmamos ese pedido?';
        }
        break;
        
      default:
        respuesta = this.respuestaDefault();
    }
    
    estado.estado = nuevoEstado;
    logdebug(`   [Estado] Nuevo: ${nuevoEstado}`);
    
    return {
      texto: respuesta,
      estado: nuevoEstado,
      pedido: estado
    };
  }

  static limpiar(numeroCliente) {
    if (this.clientes[numeroCliente]) {
      delete this.clientes[numeroCliente];
      logdebug(`   [Estado] Limpiado: ${numeroCliente}`);
    }
  }

  static respuestaSaludo() {
    const saludos = [
      '¡Hola! 👋 ¿Qué tal? ¿En qué puedo ayudarte hoy?',
      '¡Hey! 🌸 Qué gusto verte por aquí. ¿Qué necesitas?',
      '¡Buenas! 😊 ¿En qué te puedo echar una mano?',
      '¡Hola, mi amor! 🌹 ¿Qué estás buscando?'
    ];
    return saludos[Math.floor(Math.random() * saludos.length)];
  }

  static respuestaPedido(estado) {
    const p = estado.productos[0];
    const frases = [
      `¡Entendido! 🌸 ¿Me dices a dónde lo mandamos?`,
      `Perfecto, un ${p.nombre} 🌹 ¿A dónde lo llevamos?`,
      `¡Ay qué bueno! 🎀 ¿Y la dirección para mandarlo?`
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  static respuestaHora(estado) {
    const frases = [
      `📍 Ya lo tenemos para ${estado.direccion}. ¿Para qué hora lo necesitas?`,
      `¡Qué地址! ${estado.direccion} ¿Y a qué hora lo quieres?`,
      `Perfecto, lo mandamos a ${estado.direccion}. ¿A qué hora? 🎀`
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  static respuestaConfirmar(estado, costoEnvio = 0) {
    if (!estado.productos[0]) return 'No hay productos en el pedido.';
    const p = estado.productos[0];
    const envio = parseFloat(costoEnvio);
    const total = p.precio + envio;

    const frases = [
      `🌹 *Detalles del pedido:*\n\n• ${p.cantidad || 1}x ${p.nombre} - $${p.precio}\n📍 *Dirección:* ${estado.direccion || 'pendiente'}\n⏰ *Hora:* ${estado.hora_entrega || 'pendiente'}${envio > 0 ? `\n🚚 *Envío:* $${envio.toFixed(2)}` : ''}\n\n*Total: $${total.toFixed(2)}*`,
      `📝 *Tu pedido:*\n\n${p.cantidad || 1} ${p.nombre} - $${p.precio}\n📍 ${estado.direccion || 'sin dirección'}\n⏰ ${estado.hora_entrega || 'sin hora'}${envio > 0 ? `\n🚚 Envío: $${envio.toFixed(2)}` : ''}\n\n💰 *Total: $${total.toFixed(2)}*`
    ];
    
    return frases[Math.floor(Math.random() * frases.length)];
  }

  static respuestaMenu() {
    return '📋 *Tenemos lo siguiente:*\n\n• Ramo de Rosas - $35\n• Caja de Flores - $40\n• Centro de Mesa - $55\n• Arreglo Floral - $45\n\n¿Qué te gusta?';
  }

  static respuestaConsultaPrecio() {
    return 'El más econónimco es el Ramo de Rosas a $35. ¡Está hermoso! 🌹';
  }

  static respuestaDefault() {
    return '¿Me lo puedes repetir? 😅 No te entendí bien.';
  }

  static extraerDireccion(mensaje) {
    if (!mensaje) return null;
    const msg = mensaje.toLowerCase();
    const patrones = [
      /calle\s+(\w+)/i, /avenida\s+(\w+)/i, /barrio\s+(\w+)/i,
      /la\s+sabina/i, /el\s+cercado/i, /sabina/i
    ];
    for (const p of patrones) {
      const m = msg.match(p);
      if (m) return m[0];
    }
    return null;
  }

  static extraerHoraDelMensaje(mensaje) {
    if (!mensaje) return null;
    const msg = mensaje.toLowerCase();
    const m = msg.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const m2 = m[2] || '00';
    const ampm = (m[3] || '').toLowerCase();
    if ((ampm === 'pm' || /tarde/i.test(msg)) && h < 12) h += 12;
    return `${h.toString().padStart(2, '0')}:${m2}`;
  }
}

class AgenteVentasIntegrado {
  constructor() {
    this.normalizador = new NormalizadorIntencion();
    this.stats = { mensajes: 0, logica: 0, ia: 0 };
  }

  static async procesar(mensaje, contexto) {
    const agente = new AgenteVentasIntegrado();
    return await agente.ejecutar(mensaje, contexto);
  }

  async ejecutar(mensaje, contexto) {
    const { negocio, cliente } = contexto;
    const numero = cliente.numero_whatsapp;
    this.stats.mensajes++;
    
    logdebug('\n' + '═'.repeat(50));
    logdebug(`📨 MENSAJE: "${mensaje}"`);
    logdebug(`👤 Cliente: ${numero}`);

    try {
      const estadoActual = MaquinaEstados.obtenerEstado(numero);
      logdebug(`   [Estado] Estado actual: ${estadoActual.estado}`);

      // 1. DETECTAR INTENCIÓN con normalizador (funciona bien)
      const intencionDetectada = this.normalizador.detectarIntencion(mensaje);
      logdebug(`🔍 Intención detectada: ${intencionDetectada}`);
      
      // 2. EXTRAER DATOS del mensaje
      const datos = this.normalizador.extraerDatosCompletos(mensaje);
      logdebug(`📦 Datos:`, datos);
      
      // 3. Si es SALUDO, responder directamente
      if (intencionDetectada === 'saludar') {
        const respuesta = MaquinaEstados.procesar('saludar', {}, numero, negocio);
        return { texto: respuesta.texto };
      }
      
      // 4. Si es VER_MENU, responder con el menú
      if (intencionDetectada === 'ver_menu') {
        const respuesta = MaquinaEstados.procesar('ver_menu', {}, numero, negocio);
        return { texto: respuesta.texto };
      }
      
      // 5. Si es CONFIRMAR o CANCELAR, procesar directamente
      if (intencionDetectada === 'confirmar_pedido' || intencionDetectada === 'cancelar') {
        const resultadoMaquina = MaquinaEstados.procesar(
          intencionDetectada,
          { mensaje },
          numero,
          negocio
        );
        return { texto: resultadoMaquina.texto };
      }
      
      // 6. Intentar usar IA para interpretar mensajes complejos
      const AgenteIA = require('./agente-ia');
      const agenteIA = new AgenteIA();
      const interpretacion = await agenteIA.interpretar(mensaje, estadoActual);
      
      if (interpretacion && interpretacion.intencion && interpretacion.confianza > 0.7) {
        console.log('[IA] Interpretado:', interpretacion.intencion);
        // Usar interpretación de IA
        const resultadoMaquina = MaquinaEstados.procesar(
          interpretacion.intencion,
          {
            producto: interpretacion.producto,
            cantidad: interpretacion.cantidad,
            direccion: interpretacion.direccion,
            hora: interpretacion.hora,
            destinatario: interpretacion.destinatario,
            mensaje
          },
          numero,
          negocio
        );
        return { texto: resultadoMaquina.texto };
      }
      
      // 7. Fallback: usar reglas locales
      // Si detectó crear_pedido pero sin producto específico, 
      //preguntar qué quiere sin marcar como desconocido
      let intencionValidada = intencionDetectada;
      let datosFinales = datos;
      
      // Si detectó crear_pedido pero sin producto específico, 
      //preguntar qué quiere sin marcar como desconocido
      if (intencionDetectada === 'crear_pedido' && !datos.producto) {
        // Preguntar qué producto quiere
        const respuesta = '¡Con mucho gusto! 🌸 ¿Qué tipo de arreglo te gustaría?\n\nTenemos:\n• Ramo de Rosas - $35\n• Caja de Flores - $40\n• Centro de Mesa - $55\n• Arreglo Floral - $45';
        return { texto: respuesta };
      }
      
      // Validar
      const validacion = { valida: true, intencion: intencionValidada, datos: datosFinales };
      
      // 6. Máquina de estados
      const resultadoMaquina = MaquinaEstados.procesar(
        validacion.intencion,
        { ...validacion.datos, mensaje },
        numero,
        negocio
      );
      
      logdebug(`🎯 Nuevo estado: ${resultadoMaquina.estado}`);

      return { texto: resultadoMaquina.texto };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return { texto: 'Tuve un problema. ¿Podrías repetirlo?' };
    }
  }

  // Ya no usamos ventas.js - usamos solo normalizador + máquina de estados
  async procesarConLogica(mensaje, contexto) {
    return { texto: 'OK' };
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = AgenteVentasIntegrado;
