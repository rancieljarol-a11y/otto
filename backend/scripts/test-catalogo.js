// OttO - Test Módulo Catálogo con Costos
// Ejecutar: node scripts/test-catalogo.js

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
  console.log('\n🧪 TEST: Catálogo con Costos por Componente\n');
  console.log('='.repeat(50));
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const client = await pool.connect();

    // Obtener un negocio de prueba
    const negocio = await client.query(`
      INSERT INTO negocios (nombre, slug, whatsapp_dueno, plan)
      VALUES ('Floristería Test', 'floristeria-test-' || floor(random()*1000)::int, '+51999999999', 'founder')
      RETURNING id
    `);
    const negocioId = negocio.rows[0].id;
    console.log('✅ Negocio creado:', negocioId);
    testsPassed++;

    // TEST: Crear producto con categorías
    console.log('\n📦 TEST 1: Crear productos con categorías');
    const productos = await client.query(`
      INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria, stock_actual, stock_minimo, activo)
      VALUES 
        ($1, 'Arreglo Floral Básico', 'Rosas y Gerberas', 45.00, 'Arreglos', 10, 3, true),
        ($1, 'Ramo de Rosas', '12 rosas rojas', 35.00, 'Ramos', 15, 5, true),
        ($1, 'Centro de Mesa', 'Mix de flores seasonality', 55.00, 'Centros', 8, 2, true),
        ($1, 'Caja de Flores', '6 rosas + follaje', 40.00, 'Cajas', 12, 4, true)
      RETURNING id, nombre, categoria, precio
    `, [negocioId]);
    console.log('   ✅ Productos creados:', productos.rows.length);
    console.log('   Categorías:', [...new Set(productos.rows.map(p => p.categoria))].join(', '));
    testsPassed++;

    // TEST: Listar productos por categoría
    console.log('\n📋 TEST 2: Listar productos por categoría');
    const arregles = await client.query(`
      SELECT nombre, precio FROM productos 
      WHERE negocio_id = $1 AND categoria = 'Arreglos'
    `, [negocioId]);
    console.log('   ✅ Arreglos:', arregles.rows.map(p => p.nombre).join(', '));
    testsPassed++;

    // TEST: Registrar costos por componente
    console.log('\n💰 TEST 3: Registrar costos por componente');
    const productoId = productos.rows[0].id;
    await client.query(`
      INSERT INTO costos_productos (negocio_id, producto_id, componente, costo_unitario, cantidad_uso)
      VALUES 
        ($1, $2, 'Rosas', 0.50, 8),
        ($1, $2, 'Gerberas', 0.40, 5),
        ($1, $2, 'Follaje', 0.30, 3),
        ($1, $2, 'Florero', 2.00, 1),
        ($1, $2, 'Ribbon', 0.50, 1)
    `, [negocioId, productoId]);
    
    const costos = await client.query(`
      SELECT componente, costo_unitario, cantidad_uso FROM costos_productos 
      WHERE producto_id = $1
    `, [productoId]);
    
    // Calcular costo total
    let costoTotal = 0;
    for (const c of costos.rows) {
      costoTotal += c.costo_unitario * c.cantidad_uso;
    }
    const precioVenta = parseFloat(productos.rows[0].precio);
    const margen = precioVenta - costoTotal;
    const margenPorcentaje = ((margen / precioVenta) * 100).toFixed(1);
    
    console.log('   ✅ Componentes:', costos.rows.length);
    console.log('   Costo total: S/.' + costoTotal.toFixed(2));
    console.log('   Precio venta: S/.' + precioVenta.toFixed(2));
    console.log('   Margen: S/.' + margen.toFixed(2) + ' (' + margenPorcentaje + '%)');
    testsPassed++;

    // TEST: Actualizar stock (bajo mínimo)
    console.log('\n📦 TEST 4: Verificar stock bajo mínimo');
    await client.query(`
      UPDATE productos SET stock_actual = 2 WHERE id = $1
    `, [productoId]);
    
    const bajoStock = await client.query(`
      SELECT nombre, stock_actual, stock_minimo 
      FROM productos 
      WHERE negocio_id = $1 AND stock_actual <= stock_minimo
    `, [negocioId]);
    console.log('   ✅ Productos bajo stock:', bajoStock.rows.map(p => p.nombre).join(', '));
    testsPassed++;

    // TEST: Opción de personalización
    console.log('\n🎨 TEST 5: Opciones de personalización');
    await client.query(`
      INSERT INTO opciones_personalizacion (negocio_id, producto_id, tipo, nombre, precio_adicional, activo)
      VALUES 
        ($1, $2, 'flor', 'Rosas Rojas', 0, true),
        ($1, $2, 'flor', 'Rosas Blancas', 0, true),
        ($1, $2, 'flor', 'Mix de Colores', 5.00, true),
        ($1, $2, 'size', 'Pequeño', -5.00, true),
        ($1, $2, 'size', 'Mediano', 0, true),
        ($1, $2, 'size', 'Grande', 10.00, true)
    `, [negocioId, productoId]);
    
    const personalizaciones = await client.query(`
      SELECT tipo, nombre, precio_adicional FROM opciones_personalizacion 
      WHERE producto_id = $1 AND activo = true
    `, [productoId]);
    console.log('   ✅ Personalizaciones:', personalizaciones.rows.length);
    console.log('   Tipos:', [...new Set(personalizaciones.rows.map(p => p.tipo))].join(', '));
    testsPassed++;

    // Limpiar datos de prueba
    await client.query('DELETE FROM costos_productos WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM opciones_personalizacion WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM productos WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM negocios WHERE id = $1', [negocioId]);
    console.log('\n🧹 Datos de prueba limpiados');

    client.release();

  } catch (error) {
    console.log('\n   ❌ Error:', error.message);
    testsFailed++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN');
  console.log('='.repeat(50));
  console.log(`   ✅ Pasados: ${testsPassed}`);
  console.log(`   ❌ Fallidos: ${testsFailed}`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 MÓDULO 1 - CATÁLOGO COMPLETADO ✅\n');
  }

  await pool.end();
  process.exit(testsFailed > 0 ? 1 : 0);
}

test();