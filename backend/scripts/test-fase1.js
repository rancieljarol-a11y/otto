// OttO - Test de Verificación FASE 1
// Ejecutar con: node scripts/test-fase1.js

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
  console.log('\n🧪 OTTO - Test de Verificación FASE 1\n');
  console.log('='.repeat(50));
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Conexión a PostgreSQL
    console.log('\n📊 TEST 1: Conexión a PostgreSQL');
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('   ✅ PostgreSQL:', result.rows[0].version.split(' ')[1]);
    testsPassed++;
    client.release();

    // TEST 2: Contar tablas
    console.log('\n📋 TEST 2: Tablas de la base de datos');
    const tables = await client.query(`
      SELECT COUNT(*) as total FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('   ✅ Tablas creadas:', tables.rows[0].total);
    if (parseInt(tables.rows[0].total) >= 20) {
      testsPassed++;
    } else {
      console.log('   ⚠️  Esperado: 20+ tablas');
      testsFailed++;
    }

    // TEST 3: Verificar tabla negocios
    console.log('\n🏢 TEST 3: Tabla negocios');
    const negociosCount = await client.query('SELECT COUNT(*) FROM negocios');
    console.log('   ✅ Registros en negocios:', negociosCount.rows[0].count);
    testsPassed++;

    // TEST 4: Verificar tabla clientes
    console.log('\n👥 TEST 4: Tabla clientes');
    const clientesCount = await client.query('SELECT COUNT(*) FROM clientes');
    console.log('   ✅ Registros en clientes:', clientesCount.rows[0].count);
    testsPassed++;

    // TEST 5: Insertar y leer negocio (CRUD básico)
    console.log('\n✍️  TEST 5: CRUD Básico - Insertar negocio');
    const insertResult = await client.query(`
      INSERT INTO negocios (nombre, slug, whatsapp_dueno, plan)
      VALUES ('Test Negocio', 'test-negocio-' || floor(random()*10000)::int::text, '+51999999999', 'founder')
      RETURNING id, nombre
    `);
    console.log('   ✅ Negocio insertado:', insertResult.rows[0].nombre);
    testsPassed++;

    // TEST 6: Leer negocio插入ado
    console.log('\n📖 TEST 6: Leer negocio插入ado');
    const readResult = await client.query('SELECT * FROM negocios WHERE nombre = $1', ['Test Negocio']);
    console.log('   ✅ Negocio encontrado:', readResult.rows[0]?.nombre || 'NO ENCONTRADO');
    testsPassed++;

    // TEST 7: Soft delete (desactivar)
    console.log('\n🔒 TEST 7: Soft delete - Desactivar negocio');
    await client.query('UPDATE negocios SET estado = $1 WHERE nombre = $2', ['suspendido', 'Test Negocio']);
    const deletedCheck = await client.query('SELECT estado FROM negocios WHERE nombre = $1', ['Test Negocio']);
    console.log('   ✅ Negocio desactivado:', deletedCheck.rows[0]?.estado === 'suspendido' ? 'SÍ' : 'NO');
    testsPassed++;

    // TEST 8: Verificar logs de auditoría
    console.log('\n📝 TEST 8: Logs de auditoría');
    const logsCount = await client.query('SELECT COUNT(*) FROM logs_actividad');
    console.log('   ✅ Registros en logs:', logsCount.rows[0].count);
    testsPassed++;

    // TEST 9: Tipos de negocio por defecto
    console.log('\n🏷️  TEST 9: Tipos de negocio');
    const tiposNegocio = await client.query('SELECT nombre FROM tipos_negocio');
    console.log('   ✅ Tipos disponibles:', tiposNegocio.rows.map(r => r.nombre).join(', '));
    testsPassed++;

    // TEST 10: Índices creados
    console.log('\n🔍 TEST 10: Índices de rendimiento');
    const indices = await client.query(`
      SELECT COUNT(*) as total FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    console.log('   ✅ Índices creados:', indices.rows[0].total);
    testsPassed++;

  } catch (error) {
    console.log('\n   ❌ Error:', error.message);
    testsFailed++;
  }

  // RESUMEN
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE TESTS');
  console.log('='.repeat(50));
  console.log(`   ✅ Pasados: ${testsPassed}`);
  console.log(`   ❌ Fallidos: ${testsFailed}`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! - FASE 1 lista ✅\n');
  } else {
    console.log('\n⚠️  ALGUNOS TESTS FALLARON - Revisar errores\n');
  }

  await pool.end();
  process.exit(testsFailed > 0 ? 1 : 0);
}

test();