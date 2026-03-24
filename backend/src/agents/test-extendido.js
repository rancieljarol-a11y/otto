// OttO - Test Extendido con 50+ casos
// Cobertura completa de todos los escenarios posibles

const { NormalizadorIntencion } = require('./normalizador');

function test() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST EXTENDIDO (50+ casos)');
  console.log('═══════════════════════════════════════════════════\n');

  const normalizador = new NormalizadorIntencion();

  // 50+ escenarios
  const escenarios = [
    // === SALUDOS (5) ===
    { msg: 'hola', esperado: 'saludar' },
    { msg: 'buenos días', esperado: 'saludar' },
    { msg: 'buenas tardes', esperado: 'saludar' },
    { msg: 'que tal', esperado: 'saludar' },
    { msg: 'hey', esperado: 'saludar' },
    
    // === CATÁLOGO (10) ===
    { msg: 'ver menú', esperado: 'ver_menu' },
    { msg: 'menú', esperado: 'ver_menu' },
    { msg: 'qué tienes', esperado: 'ver_menu' },
    { msg: 'qué tienen', esperado: 'ver_menu' },
    { msg: 'tienes disponible', esperado: 'ver_menu' },
    { msg: 'de venta', esperado: 'ver_menu' },
    { msg: 'que tienes de venta', esperado: 'ver_menu' },
    { msg: 'catálogo', esperado: 'ver_menu' },
    { msg: 'ver productos', esperado: 'ver_menu' },
    { msg: 'qué modelos tienes', esperado: 'ver_menu' },
    
    // === PEDIDOS SIMPLES (10) ===
    { msg: 'quiero un ramo', esperado: 'crear_pedido' },
    { msg: 'necesito una caja', esperado: 'crear_pedido' },
    { msg: 'pedir un arreglo', esperado: 'crear_pedido' },
    { msg: 'quiero comprar', esperado: 'crear_pedido' },
    { msg: 'mándame un detalle', esperado: 'crear_pedido' },
    { msg: 'envíame flores', esperado: 'crear_pedido' },
    { msg: 'ordenando un ramo', esperado: 'crear_pedido' },
    { msg: 'necesito enviar', esperado: 'crear_pedido' },
    { msg: 'para llevar', esperado: 'crear_pedido' },
    { msg: 'quiero algo bonito', esperado: 'crear_pedido' },
    
    // === ERRORES ORTOGRÁFICOS (8) ===
    { msg: 'quiro un ramo', esperado: 'crear_pedido' },
    { msg: 'kiero una caja', esperado: 'crear_pedido' },
    { msg: 'ramoo de rose', esperado: 'crear_pedido' },
    { msg: 'caxa de flores', esperado: 'crear_pedido' },
    { msg: 'arregloo floral', esperado: 'crear_pedido' },
    { msg: 'flore', esperado: 'crear_pedido' },
    { msg: 'rose', esperado: 'crear_pedido' },
    { msg: 'tengo un pedido', esperado: 'crear_pedido' },
    
    // === PEDIDOS CON CANTIDAD (8) ===
    { msg: '2 ramos', esperado: 'crear_pedido' },
    { msg: '3 cajas', esperado: 'crear_pedido' },
    { msg: '5 arreglos', esperado: 'crear_pedido' },
    { msg: 'quiero 2 ramos', esperado: 'crear_pedido' },
    { msg: 'necesito 3 flores', esperado: 'crear_pedido' },
    { msg: '4 ramos de rosas', esperado: 'crear_pedido' },
    { msg: '10 rosas', esperado: 'crear_pedido' },
    { msg: 'medio docena', esperado: 'crear_pedido' },
    
    // === PRODUCTOS ESPECÍFICOS (5) ===
    { msg: 'ramo de rosas', esperado: 'crear_pedido' },
    { msg: 'caja de flores', esperado: 'crear_pedido' },
    { msg: 'centro de mesa', esperado: 'crear_pedido' },
    { msg: 'arreglo floral', esperado: 'crear_pedido' },
    { msg: 'detalle sorpresa', esperado: 'crear_pedido' },
    
    // === PEDIDO COMPLETO (8) ===
    { msg: 'ramo para la calle 1 a las 4pm', esperado: 'crear_pedido' },
    { msg: 'caja a la sabina 3pm', esperado: 'crear_pedido' },
    { msg: 'arreglo para el cercado a las 5', esperado: 'crear_pedido' },
    { msg: 'quiero ramo calle principal 2pm', esperado: 'crear_pedido' },
    { msg: 'necesito caja en mi casa 3pm', esperado: 'crear_pedido' },
    { msg: 'arreglo a la iglesia 4pm', esperado: 'crear_pedido' },
    { msg: 'flores para la escuela 5pm', esperado: 'crear_pedido' },
    { msg: 'ramo en el barrio a las 6', esperado: 'crear_pedido' },
    
    // === CONFIRMACIÓN (5) ===
    { msg: 'sí', esperado: 'confirmar_pedido' },
    { msg: 'si', esperado: 'confirmar_pedido' },
    { msg: 'ok', esperado: 'confirmar_pedido' },
    { msg: 'de acuerdo', esperado: 'confirmar_pedido' },
    { msg: 'perfecto', esperado: 'confirmar_pedido' },
    
    // === CANCELACIÓN (5) ===
    { msg: 'no', esperado: 'cancelar' },
    { msg: 'cancelar', esperado: 'cancelar' },
    { msg: 'nah', esperado: 'cancelar' },
    { msg: 'olvídalo', esperado: 'cancelar' },
    { msg: 'mejor no', esperado: 'cancelar' }
  ];

  let ok = 0;
  let fail = 0;

  console.log('🧪 Ejecutando', escenarios.length, 'escenarios...\n');

  for (const test of escenarios) {
    const intencion = normalizador.detectarIntencion(test.msg, null);
    const esOK = intencion === test.esperado;
    
    if (esOK) ok++;
    else fail++;
    
    console.log(`${esOK ? '✅' : '❌'} "${test.msg}" → ${intencion} (esperado: ${test.esperado})`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📈 RESULTADO: ${ok}/${escenarios.length} = ${Math.round(ok/escenarios.length*100)}%`);
  console.log('═══════════════════════════════════════════════════\n');
}

test();
