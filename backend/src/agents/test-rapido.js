// OttO - Test Automatizado Multi-Escenario
// Ejecuta todos los casos de prueba de una vez

const AgenteVentasIntegrado = require('./ventas-integrado');
const { NormalizadorIntencion } = require('./normalizador');

async function test() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST MULTI-ESCENARIO (20+ casos en paralelo)');
  console.log('═══════════════════════════════════════════════════\n');

  const contexto = {
    negocio: { id: '4e95adf6-b979-4f82-a711-86c07e872bf2', nombre: 'Floristería Rosa', costo_envio: 50 },
    cliente: { id: 'test', numero_whatsapp: '+51999999999' },
    conversacion: { id: 'test-conv' }
  };

  // Casos de prueba organizados por categoría
  const escenarios = [
    // === SALUDOS ===
    { msg: 'hola', esperado: 'saludar' },
    { msg: 'buenos días', esperado: 'saludar' },
    { msg: 'que tal', esperado: 'saludar' },
    
    // === CATÁLOGO ===
    { msg: 'ver menú', esperado: 'ver_menu' },
    { msg: 'qué tienes disponible', esperado: 'ver_menu' },
    { msg: 'tienes de venta', esperado: 'ver_menu' },
    
    // === PEDIDOS SIMPLES ===
    { msg: 'quiero un ramo', esperado: 'crear_pedido' },
    { msg: 'necesito una caja', esperado: 'crear_pedido' },
    { msg: 'pedir un arreglo', esperado: 'crear_pedido' },
    
    // === PEDIDOS CON CANTIDAD ===
    { msg: 'quiero 2 ramos', esperado: 'crear_pedido' },
    { msg: 'necesito 3 cajas', esperado: 'crear_pedido' },
    { msg: '5 arreglos por favor', esperado: 'crear_pedido' },
    
    // === ERRORES ORTOGRÁFICOS ===
    { msg: 'quiro un ramo', esperado: 'crear_pedido' },
    { msg: 'kiero una caja', esperado: 'crear_pedido' },
    { msg: 'ramoo de rose', esperado: 'crear_pedido' },
    
    // === PEDIDO COMPLETO (producto + dirección + hora) ===
    { msg: 'quiero un ramo para la calle primera a las 4pm', esperado: 'crear_pedido' },
    { msg: 'necesito un arreglo para la sabina a las 3pm', esperado: 'crear_pedido' },
    
    // === DESTINATARIOS ===
    { msg: 'para mi mamá', esperado: 'crear_pedido' },
    { msg: 'para maria del colmado', esperado: 'crear_pedido' },
    { msg: 'entregar a pedro', esperado: 'crear_pedido' },
    
    // === CONFIRMACIÓN ===
    { msg: 'sí', esperado: 'confirmar_pedido' },
    { msg: 'ok', esperado: 'confirmar_pedido' },
    { msg: 'claro', esperado: 'confirmar_pedido' },
    
    // === CANCELACIÓN ===
    { msg: 'no', esperado: 'cancelar' },
    { msg: 'cancelar', esperado: 'cancelar' },
    { msg: 'nah', esperado: 'cancelar' }
  ];

  const normalizador = new NormalizadorIntencion();
  let ok = 0;
  let fail = 0;
  const resultados = [];

  console.log('🧪 Ejecutando', escenarios.length, 'escenarios...\n');

  for (const test of escenarios) {
    try {
      const intencion = normalizador.detectarIntencion(test.msg, null);
      const esOK = intencion === test.esperado;
      
      if (esOK) ok++;
      else fail++;
      
      resultados.push({
        msg: test.msg,
        esperado: test.esperado,
        obtenido: intencion,
        ok: esOK
      });
    } catch (e) {
      fail++;
      resultados.push({
        msg: test.msg,
        error: e.message
      });
    }
  }

  // Mostrar resultados
  console.log('📊 RESULTADOS:\n');
  
  for (const r of resultados) {
    if (r.error) {
      console.log(`   ❌ "${r.msg}" → ERROR: ${r.error}`);
    } else {
      console.log(`   ${r.ok ? '✅' : '❌'} "${r.msg}"`);
      console.log(`        espera: ${r.esperado} | obtiene: ${r.obtenido}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`   📈 TOTAL: ${ok}/${escenarios.length} correctos (${Math.round(ok/escenarios.length*100)}%)`);
  
  if (fail === 0) {
    console.log('   ✅ ¡TODOS LOS TESTS PASARON!');
  } else {
    console.log(`   ⚠️  ${fail} tests fallaron`);
  }
  console.log('═══════════════════════════════════════════════════\n');
}

test();
