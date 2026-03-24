// OttO - Test del Sistema Híbrido
// Este script prueba el detector de complejidad y el enrutador

const { DetectorComplejidad, EnrutadorMensajes } = require('./hibrido');

async function test() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST: SISTEMA HÍBRIDO (Lógica + IA)');
  console.log('═══════════════════════════════════════════════════\n');

  const enrutador = new EnrutadorMensajes();
  
  // ============================================================
  // CASO 1: Mensajes SIMPLES - NO usan IA (5 mensajes)
  // ============================================================
  console.log('📌 CASO 1: Mensajes NORMALES (usa Lógica)\n');
  console.log('   Meta: 5 mensajes → todos deberían ser SIMPLES\n');
  
  const mensajesSimples = [
    { texto: 'hola', esperado: 'Lógica' },
    { texto: 'quiero un ramo de rosas', esperado: 'Lógica' },
    { texto: 'calle principal 123', esperado: 'Lógica' },
    { texto: '3pm', esperado: 'Lógica' },
    { texto: 'sí, confirmar', esperado: 'Lógica' }
  ];

  let simplesOK = 0;
  for (const m of mensajesSimples) {
    const esSimple = DetectorComplejidad.esMensajeSimple(m.texto);
    const status = esSimple ? '✅' : '❌';
    console.log(`   ${status} "${m.texto}"`);
    console.log(`        → ${esSimple ? 'Lógica' : 'IA'} (esperado: ${m.esperado})`);
    if (esSimple) simplesOK++;
  }
  console.log(`   Resultado: ${simplesOK}/5 con Lógica\n`);

  // ============================================================
  // CASO 2: Mensajes COMPLEJOS - SÍ usan IA (2 mensajes)
  // ============================================================
  console.log('📌 CASO 2: Mensajes COMPLEJOS (usa IA)\n');
  console.log('   Meta: 2 mensajes → deberían ser COMPLEJOS\n');
  
  const mensajesComplejos = [
    { texto: 'quiero mandarle un ramo de flores a mi mama que vive en la calle principal cerca del supermercado pero no se exactamente que hora va a estar ella alli porque tiene trabajo', esperado: 'IA' },
    { texto: 'tengo una reunion a las 3 y necesito que el ramo llegue antes pero no se si tienen disponible para esa hora y cuanto cuesta el delivery porque vivo lejos', esperado: 'IA' }
  ];

  let complejosOK = 0;
  for (const m of mensajesComplejos) {
    const esSimple = DetectorComplejidad.esMensajeSimple(m.texto);
    const status = !esSimple ? '✅' : '❌';
    console.log(`   ${status} "${m.texto.substring(0, 50)}..."`);
    console.log(`        → ${esSimple ? 'Lógica' : 'IA'} (esperado: ${m.esperado})`);
    if (!esSimple) complejosOK++;
  }
  console.log(`   Resultado: ${complejosOK}/2 con IA\n`);

  // ============================================================
  // CASO 3: Contexto de pedido en progreso
  // ============================================================
  console.log('📌 CASO 3: Contexto de pedido\n');
  console.log('   (Cuando hay un pedido en proceso)\n');
  
  const contextoConPedido = {
    productos: [{ nombre: 'Ramo de Rosas', precio: 35 }],
    estado: 'esperando_direccion'
  };

  const respuestas = [
    { texto: 'calle 1', esperado: 'Lógica (respuesta corta)' },
    { texto: 'la calle principal del barrio cerca del supermercado ek', esperado: 'IA (respuesta larga)' }
  ];

  for (const m of respuestas) {
    const esSimple = DetectorComplejidad.esMensajeSimple(m.texto, contextoConPedido);
    console.log(`   "${m.texto}"`);
    console.log(`        → ${esSimple ? '✅ Lógica' : '❌ IA'}: ${m.esperado}`);
  }
  console.log('');

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('═══════════════════════════════════════════════════');
  console.log('   📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════\n');
  
  const totalSimples = simplesOK;
  const totalComplejos = complejosOK;
  const total = totalSimples + totalComplejos;
  const pctIA = Math.round((totalComplejos / total) * 100);
  
  console.log(`   Mensajes probados: ${total}`);
  console.log(`   • Con Lógica: ${totalSimples} (${100 - pctIA}%)`);
  console.log(`   • Con IA: ${totalComplejos} (${pctIA}%)`);
  console.log('');
  
  if (simplesOK === 5 && complejosOK === 2) {
    console.log('   ✅ ¡TODOS LOS TESTS PASARON!');
    console.log('   ✅ Sistema híbrido funcionando correctamente');
    console.log('   ✅ Lógica priorizada para mensajes simples');
    console.log('   ✅ IA disponible para mensajes complejos');
  } else {
    console.log('   ⚠️  Algunos tests no pasaron');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

test().catch(console.error);
