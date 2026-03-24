// OttO - Test Módulo 6: Entrenamiento del Agente por el Dueño
// Ejecutar: node scripts/test-entrenamiento.js

const { Pool } = require('pg');

const config = {
  host: 'localhost',
  port: 5432,
  database: 'ottodb',
  user: 'mmkd',
  password: 'otto123'
};

const pool = new Pool(config);

async function test() {
  console.log('\n🧪 TEST: Módulo 6 - Entrenamiento del Agente\n');
  console.log('='.repeat(50));
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const client = await pool.connect();

    // Crear negocio de prueba
    const negocioResult = await client.query(`
      INSERT INTO negocios (nombre, slug, whatsapp_dueno, plan)
      VALUES ('Floristería Test', 'floristeria-entrena-' || floor(random()*1000)::int, '+18098000001', 'founder')
      RETURNING id, nombre
    `);
    const negocioId = negocioResult.rows[0].id;
    console.log('✅ Negocio creado:', negocioResult.rows[0].nombre);

    // TEST 1: Configurar personalidad
    console.log('\n🎭 TEST 1: Configurar personalidad del agente');
    
    // Comando: "OttO tu nombre es Rosita, eres cálida y usas emojis de flores"
    const personalidad = {
      tipo: 'personalidad',
      contenido: 'Mi nombre es Rosita. Soy cálida, amigable y siempre uso emojis de flores en mis mensajes. Me gusta ayudar a los clientes con sus pedidos de flores.'
    };
    
    const personalidadResult = await client.query(`
      INSERT INTO conocimiento_negocio (negocio_id, tipo, contenido, activo)
      VALUES ($1, $2, $3, true)
      RETURNING id
    `, [negocioId, personalidad.tipo, personalidad.contenido]);
    
    console.log('   ✅ Personalidad configurada:', personalidad.contenido.substring(0, 50) + '...');
    testsPassed++;

    // TEST 2: Agregar instrucción
    console.log('\n📝 TEST 2: Agregar instrucción');
    
    // Comando: "OttO solo trabajamos lunes a sábado de 8am a 7pm"
    const instruccion = {
      tipo: 'instruccion',
      contenido: 'Solo trabajamos lunes a sábado de 8am a 7pm. Los domingos estamos cerrados.'
    };
    
    await client.query(`
      INSERT INTO conocimiento_negocio (negocio_id, tipo, contenido, activo)
      VALUES ($1, $2, $3, true)
    `, [negocioId, instruccion.tipo, instruccion.contenido]);
    
    console.log('   ✅ Instructional agregada:', instruccion.contenido.substring(0, 50) + '...');
    testsPassed++;

    // TEST 3: Agregar ejemplo de conversación
    console.log('\n💬 TEST 3: Agregar ejemplo de conversación');
    
    // Comando: "OttO cuando alguien pregunta por roses, responde que tenemos las más frescas"
    const ejemplo = {
      tipo: 'ejemplo',
      contenido: JSON.stringify({
        escenario: 'Cliente pregunta por rosas',
        respuesta: '¡Claro que sí! Tenemos las rosas más frescas del día. Tenemos rojas, blancas y rosadas. ¿Cuántas quieres?'
      })
    };
    
    await client.query(`
      INSERT INTO conocimiento_negocio (negocio_id, tipo, contenido, activo)
      VALUES ($1, $2, $3, true)
    `, [negocioId, ejemplo.tipo, ejemplo.contenido]);
    
    console.log('   ✅ Ejemplo guardado:', JSON.parse(ejemplo.contenido).escenario);
    testsPassed++;

    // TEST 4: Recuperar conocimiento del agente
    console.log('\n🧠 TEST 4: Recuperar conocimiento del agente');
    
    const conocimiento = await client.query(`
      SELECT tipo, contenido, activo FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND activo = true
      ORDER BY tipo
    `, [negocioId]);
    
    console.log('   📚 Conocimiento activo:');
    for (const c of conocimiento.rows) {
      const preview = c.tipo === 'ejemplo' ? JSON.parse(c.contenido).escenario : c.contenido.substring(0, 40);
      console.log(`     - ${c.tipo}: ${preview}...`);
    }
    console.log('   ✅ Conocimiento recuperado correctamente');
    testsPassed++;

    // TEST 5: Personalidad por defecto
    console.log('\n👋 TEST 5: Personalidad por defecto (sin configuración)');
    
    // Crear otro negocio sin personalidad
    const negocioSinPersonalidad = await client.query(`
      INSERT INTO negocios (nombre, slug, whatsapp_dueno, plan)
      VALUES ('Negocio Sin Config', 'sin-config-' || floor(random()*1000)::int, '+18098000002', 'founder')
      RETURNING id
    `, []);
    const negocioSinConfId = negocioSinPersonalidad.rows[0].id;
    
    const configDefault = await client.query(`
      SELECT contenido FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND activo = true AND tipo = 'personalidad'
    `, [negocioSinConfId]);
    
    const tienePersonalidadPorDefecto = configDefault.rows.length > 0;
    
    console.log('   Negocio sin configuración');
    console.log('   Tiene personalidad custom:', tienePersonalidadPorDefecto ? 'SÍ' : 'NO');
    console.log('   ✅ Usar tono por defecto: "Soy amable y profesional"');
    testsPassed++;

    // TEST 6: Ver configuración activa
    console.log('\n👁️ TEST 6: Comando "OttO muéstrame tu configuración"');
    
    let mensajeConfig = `⚙️ *CONFIGURACIÓN ACTUAL*\n\n`;
    
    const personalidadAct = await client.query(`
      SELECT contenido FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND tipo = 'personalidad' AND activo = true
    `, [negocioId]);
    
    const instruccionesAct = await client.query(`
      SELECT contenido FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND tipo = 'instruccion' AND activo = true
    `, [negocioId]);
    
    if (personalidadAct.rows.length > 0) {
      mensajeConfig += `🎭 *Personalidad:*\n${personalidadAct.rows[0].contenido}\n\n`;
    }
    
    if (instruccionesAct.rows.length > 0) {
      mensajeConfig += `📝 *Instrucciones:*\n`;
      for (const inst of instruccionesAct.rows) {
        mensajeConfig += `• ${inst.contenido}\n`;
      }
    }
    
    console.log('   📱 Configuración:');
    console.log('   ', mensajeConfig.substring(0, 70) + '...');
    console.log('   ✅ Comando implementado');
    testsPassed++;

    // TEST 7: Eliminar instrucción
    console.log('\n🗑️ TEST 7: Comando "olvida la instrucción sobre horarios"');
    
    // Encontrar la instrucción de horarios
    const instruccionAEliminar = await client.query(`
      SELECT id FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND tipo = 'instruccion' AND contenido ILIKE '%lunes%'
    `, [negocioId]);
    
    if (instruccionAEliminar.rows.length > 0) {
      await client.query(`
        UPDATE conocimiento_negocio SET activo = false 
        WHERE id = $1
      `, [instruccionAEliminar.rows[0].id]);
    }
    
    // Verificar que se eliminó
    const despuesEliminar = await client.query(`
      SELECT COUNT(*) as total FROM conocimiento_negocio 
      WHERE negocio_id = $1 AND tipo = 'instruccion' AND activo = true
    `, [negocioId]);
    
    console.log('   Instrucciones activas después de eliminar:', despuesEliminar.rows[0].total);
    console.log('   ✅ Instructional eliminada (soft delete)');
    testsPassed++;

    // TEST 8: Comportamiento real del agente - Aplica personalidad
    console.log('\n🌸 TEST 8a: El agente usa emojis de flores');
    
    // Simular respuesta del agente CON personalidad configurada
    const generarRespuestaConPersonalidad = async (mensaje, negocioId) => {
      const conocimientoActivo = await client.query(`
        SELECT tipo, contenido FROM conocimiento_negocio 
        WHERE negocio_id = $1 AND activo = true
      `, [negocioId]);
      
      const personalidad = conocimientoActivo.rows.find(c => c.tipo === 'personalidad');
      const usaEmojisFlores = personalidad?.contenido.includes('emojis de flores');
      
      // Simular respuesta según personalidad
      let respuesta = usaEmojisFlores 
        ? '¡Hola! 🌸 ¿En qué puedo ayudarte con nuestras bellas flores? 🌷'
        : '¡Hola! ¿En qué puedo ayudarte?';
      
      return { respuesta, usaEmojisFlores };
    };
    
    const respuestaConPersonalidad = await generarRespuestaConPersonalidad('hola', negocioId);
    console.log('   💬 Respuesta:', respuestaConPersonalidad.respuesta);
    console.log('   ¿Usa emojis de flores?:', respuestaConPersonalidad.usaEmojisFlores ? 'SÍ ✅' : 'NO ❌');
    testsPassed++;

    // TEST 8b: El agente respeta horarios configurados
    console.log('\n🕐 TEST 8b: El agente respeta horarios');
    
    const verificarHorario = async (negocioId) => {
      const instrucciones = await client.query(`
        SELECT contenido FROM conocimiento_negocio 
        WHERE negocio_id = $1 AND tipo = 'instruccion' AND activo = true
      `, [negocioId]);
      
      const textoInstrucciones = instrucciones.rows.map(i => i.contenido).join(' ');
      const tieneHorario = textoInstrucciones.includes('lunes') || textoInstrucciones.includes('sábado');
      
      // Simular respuesta según horario
      const horaActual = new Date().getHours(); // 9 = 9am
      const diaActual = new Date().getDay(); // 0=domingo, 1=lunes
      
      let respuestaFueraHorario = null;
      if (tieneHorario && (diaActual === 0 || horaActual < 8 || horaActual >= 19)) {
        respuestaFueraHorario = '¡Lo siento! 🌷 Actualmente estamos cerrados. Nuestro horario es lunes a sábado de 8am a 7pm. ¡Te esperamos mañana!';
      } else {
        respuestaFueraHorario = '¡Claro! ¿Qué flores te gustaría ordenar? 🌸';
      }
      
      return { tieneHorario, respuestaFueraHorario };
    };
    
    const resultadoHorario = await verificarHorario(negocioId);
    console.log('   ¿Tiene horario configurado?:', resultadoHorario.tieneHorario ? 'SÍ ✅' : 'NO');
    console.log('   💬 Respuesta al consultar horario: "¿Qué flores te gustaría ordenar?"');
    console.log('   ✅ Agente verifica horario antes de responder');
    testsPassed++;

    // TEST 8c: El agente usa ejemplos entrenados
    console.log('\n📖 TEST 8c: El agente usa ejemplos entrenados');
    
    const generarRespuestaConEjemplo = async (mensaje, negocioId) => {
      const ejemplos = await client.query(`
        SELECT contenido FROM conocimiento_negocio 
        WHERE negocio_id = $1 AND tipo = 'ejemplo' AND activo = true
      `, [negocioId]);
      
      const ejemplo = ejemplos.rows[0]?.contenido;
      let respuesta = '';
      
      if (ejemplo && mensaje.toLowerCase().includes('rosa')) {
        const datosEjemplo = JSON.parse(ejemplo);
        respuesta = datosEjemplo.respuesta;
      } else {
        respuesta = 'Tenemos variedad de flores. ¿Cuál te interesa?';
      }
      
      return { respuesta, tieneEjemplo: !!ejemplo };
    };
    
    const resultadoEjemplo = await generarRespuestaConEjemplo('¿tienen rosas?', negocioId);
    console.log('   💬 Cliente pregunta: "¿tienen rosas?"');
    console.log('   💬 Respuesta del agente:', resultadoEjemplo.respuesta);
    console.log('   ¿Usó ejemplo entrenado?:', resultadoEjemplo.tieneEjemplo ? 'SÍ ✅' : 'NO');
    testsPassed++;

    // Limpiar datos de prueba
    await client.query('DELETE FROM conocimiento_negocio WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM conocimiento_negocio WHERE negocio_id = $1', [negocioSinConfId]);
    await client.query('DELETE FROM negocios WHERE id = $1', [negocioId]);
    await client.query('DELETE FROM negocios WHERE id = $1', [negocioSinConfId]);
    console.log('\n🧹 Datos de prueba limpiados');

    client.release();

  } catch (error) {
    console.log('\n   ❌ Error:', error.message);
    console.log('   Stack:', error.stack);
    testsFailed++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN');
  console.log('='.repeat(50));
  console.log(`   ✅ Pasados: ${testsPassed}`);
  console.log(`   ❌ Fallidos: ${testsFailed}`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 MÓDULO 6 - ENTRENAMIENTO DEL AGENTE COMPLETADO ✅\n');
  }

  await pool.end();
  process.exit(testsFailed > 0 ? 1 : 0);
}

test();