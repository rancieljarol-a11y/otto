// Test del normalizador con NLP
const { NormalizadorIntencion } = require('./normalizador');

function test() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST: NORMALIZADOR v4 CON NLP');
  console.log('═══════════════════════════════════════════════════\n');

  const normalizador = new NormalizadorIntencion();

  // Casos de prueba
  const casos = [
    // Saludos
    { msg: 'hola', esperado: 'saludar' },
    { msg: 'buenos días', esperado: 'saludar' },
    { msg: 'que tal', esperado: 'saludar' },
    
    // Pedidos con errores ortográficos
    { msg: 'quiro un ramo', esperado: 'crear_pedido' },
    { msg: 'kiero una caja', esperado: 'crear_pedido' },
    { msg: 'ramoo de rose', esperado: 'crear_pedido' },
    { msg: 'pedir un arrangue', esperado: 'crear_pedido' },
    
    // Pedido completo (producto + dirección + hora)
    { msg: 'quiero un ramo para la calle principal a las 3pm', esperado: 'crear_pedido' },
    
    // Confirmación
    { msg: 'sí', esperado: 'confirmar_pedido' },
    { msg: 'si', esperado: 'confirmar_pedido' },
    { msg: 'ok', esperado: 'confirmar_pedido' },
    { msg: 'claro', esperado: 'confirmar_pedido' },
    
    // Cancelación
    { msg: 'no', esperado: 'cancelar' },
    { msg: 'cancelar', esperado: 'cancelar' },
    { msg: 'nah', esperado: 'cancelar' },
    
    // Menú
    { msg: 'ver menú', esperado: 'ver_menu' },
    { msg: 'que tienen?', esperado: 'ver_menu' },
    
    // Precio
    { msg: 'cuánto cuesta?', esperado: 'consultar_precio' },
    { msg: 'precio', esperado: 'consultar_precio' }
  ];

  console.log('📌 Probando casos:\n');
  
  let ok = 0;
  let fail = 0;
  
  for (const caso of casos) {
    const msgProcesado = normalizador.preprocess(caso.msg);
    const analisis = normalizador.analizarMensaje(msgProcesado);
    const intencion = normalizador.detectarConContexto(caso.msg, null);
    
    const esOK = intencion === caso.esperado;
    if (esOK) ok++;
    else fail++;
    
    console.log(`   ${esOK ? '✅' : '❌'} "${caso.msg}"`);
    console.log(`        → "${msgProcesado}"`);
    console.log(`        → espera: ${caso.esperado} | obtiene: ${intencion}`);
    if (analisis.producto) console.log(`        📦 producto: ${analisis.producto}`);
    if (analisis.hora) console.log(`        ⏰ hora: ${analisis.hora}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`   RESULTADO: ${ok}/${casos.length} correctos`);
  if (fail === 0) {
    console.log('   ✅ ¡TODOS LOS TESTS PASARON!');
  } else {
    console.log(`   ⚠️  ${fail} tests fallaron`);
  }
  console.log('═══════════════════════════════════════════════════\n');
}

test();
