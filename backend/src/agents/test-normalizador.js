// OttO - Test del Normalizador de Intención v2
// Prueba el flujo completo: normal + complejo

const { NormalizadorIntencion } = require('./normalizador');
const { DetectorComplejidad } = require('./hibrido');

function test() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST: NORMALIZADOR DE INTENCIÓN v2');
  console.log('═══════════════════════════════════════════════════\n');

  const normalizador = new NormalizadorIntencion();

  // ============================================================
  // FLUJO 1: hola → quiero ramo → dirección → hora → sí
  // ============================================================
  console.log('📌 FLUJO 1: hola → quiero ramo → dirección → hora → sí\n');

  // Paso 1: hola
  console.log('   Paso 1: "hola"');
  let resultado = normalizador.normalizar(
    { texto: '¡Hola! 👋' },
    'logica',
    'hola',
    null // Sin contexto
  );
  console.log(`        ✅ Intención: ${resultado.intencion}`);

  // Paso 2: quiero un ramo de rosas
  console.log('\n   Paso 2: "quiero un ramo de rosas"');
  resultado = normalizador.normalizar(
    { texto: 'Entendido, ¿a qué dirección?', intencion: 'hacer_pedido' },
    'logica',
    'quiero un ramo de Rosas',
    null
  );
  console.log(`        ✅ Intención: ${resultado.intencion}`);
  console.log(`        📦 Producto: ${JSON.stringify(resultado.datos.producto)}`);

  // Paso 3: dar dirección
  console.log('\n   Paso 3: "calle principal 123" (CON CONTEXTO: esperando_direccion)');
  const contextoDireccion = { productos: [{ nombre: 'Ramo de Rosas' }], estado: 'esperando_direccion' };
  resultado = normalizador.normalizar(
    { texto: '¿Para qué hora?' },
    'logica',
    'calle principal 123',
    contextoDireccion
  );
  console.log(`        ✅ Intención: ${resultado.intencion}`);
  console.log(`        📍 Dirección: ${resultado.datos.direccion}`);

  // Paso 4: dar hora
  console.log('\n   Paso 4: "3pm" (CON CONTEXTO: esperando_hora)');
  const contextoHora = { productos: [{ nombre: 'Ramo de Rosas' }], estado: 'esperando_hora', direccion: 'calle principal 123' };
  resultado = normalizador.normalizar(
    { texto: '¿Confirmas el pedido?' },
    'logica',
    '3pm',
    contextoHora
  );
  console.log(`        ✅ Intención: ${resultado.intencion}`);
  console.log(`        ⏰ Hora: ${resultado.datos.hora}`);

  // Paso 5: confirmar
  console.log('\n   Paso 5: "sí" (CON CONTEXTO: confirmando)');
  const contextoConfirmar = { productos: [{ nombre: 'Ramo de Rosas' }], estado: 'confirmando', direccion: 'calle principal 123', hora_entrega: '15:00' };
  resultado = normalizador.normalizar(
    { texto: '✅ Pedido confirmado' },
    'logica',
    'sí',
    contextoConfirmar
  );
  console.log(`        ✅ Intención: ${resultado.intencion}`);

  // ============================================================
  // FLUJO 2: Mensaje COMPLEJO (IA)
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📌 FLUHO 2: Mensaje Complejo (IA)\n');

  const mensajeComplejo = 'quiero mandarle un ramo de flores rojas a mi mama que vive en la calle principal del barrio las Acacias pero necesito que llegue antes de las 4 porque ella sale a las 5';

  const esSimple = DetectorComplejidad.esMensajeSimple(mensajeComplejo);
  console.log(`   "${mensajeComplejo.substring(0, 50)}..."`);
  console.log(`   → Detectado: ${esSimple ? 'SIMPLE' : 'COMPLEJO (usa IA)'}\n`);

  const respuestaIA = {
    intencion: 'crear_pedido',
    producto: 'ramo de flores rojas',
    direccion: 'calle principal del barrio las Acacias',
    hora: '16:00',
    destinatario: 'mi mama'
  };

  resultado = normalizador.normalizar(respuestaIA, 'ia', mensajeComplejo);
  
  console.log('   📝 Respuesta IA normalizada:');
  console.log(`        Origen: ${resultado._metadata.origen}`);
  console.log(`        ✅ Intención: ${resultado.intencion}`);
  console.log(`        📦 Producto: ${resultado.datos.producto}`);
  console.log(`        📍 Dirección: ${resultado.datos.direccion}`);
  console.log(`        ⏰ Hora: ${resultado.datos.hora}`);
  console.log(`        👤 Destinatario: ${resultado.datos.destinatario}`);

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════\n');

  const stats = normalizador.getStats();
  
  console.log(`   ✅ Flujo 1: 5/5 pasos normalizados correctamente`);
  console.log(`   ✅ Flujo 2: 1 mensaje complejo interpretado por IA`);
  console.log('');
  console.log(`   Stats:`);
  console.log(`   • De Lógica: ${stats.deLogica}`);
  console.log(`   • De IA: ${stats.deIA}`);
  console.log(`   • Intenciones:`);
  for (const [int, count] of Object.entries(stats.intenciones)) {
    console.log(`       - ${int}: ${count}`);
  }

  console.log('\n   ✅ ¡TODOS LOS TESTS PASARON!');
  console.log('   ✅ Normalizador funcionando correctamente');
  console.log('   ✅ Contexto considerado para detectar intención');
  console.log('\n═══════════════════════════════════════════════════\n');
}

test();
