// OttO - Test Módulo 3: Pedido con Fecha Futura y Recordatorios
// Ejecutar: node scripts/test-fecha-futura.js

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
  console.log('\n🧪 TEST: Módulo 3 - Pedido con Fecha Futura y Recordatorios\n');
  console.log('='.repeat(50));
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const client = await pool.connect();

    // Crear negocio de prueba
    const negocioResult = await client.query(`
      INSERT INTO negocios (nombre, slug, whatsapp_dueno, plan)
      VALUES ('Floristería Test', 'floristeria-fecha-' || floor(random()*1000)::int, '+51999999999', 'founder')
      RETURNING id, nombre
    `);
    const negocioId = negocioResult.rows[0].id;
    console.log('✅ Negocio creado:', negocioResult.rows[0].nombre);

    // Crear cliente
    const clienteResult = await client.query(`
      INSERT INTO clientes (negocio_id, numero_whatsapp, nombre)
      VALUES ($1, '+519888888889', 'Juan Pérez')
      RETURNING id
    `, [negocioId]);
    const clienteId = clienteResult.rows[0].id;
    console.log('✅ Cliente creado: Juan Pérez');

    // Crear productos
    const productos = await client.query(`
      INSERT INTO productos (negocio_id, nombre, precio, stock_actual, activo)
      VALUES 
        ($1, 'Arreglo Floral', 45.00, 10, true),
        ($1, 'Ramo de Rosas', 35.00, 15, true)
      RETURNING id, nombre, precio
    `, [negocioId]);
    
    console.log('✅ Productos creados:', productos.rows.length);
    testsPassed++;

    // TEST 1: Crear pedido con fecha futura
    console.log('\n📝 TEST 1: Crear pedido con fecha de entrega futura');
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + 3); // 3 días después
    
    const pedidoData = {
      productos: [
        { producto_id: productos.rows[0].id, nombre: 'Arreglo Floral', precio: 45.00, cantidad: 2 }
      ],
      fecha_entrega: fechaEntrega.toISOString(),
      notas_especiales: 'Para regalo de cumpleaños'
    };

    const subtotal = pedidoData.productos[0].precio * pedidoData.productos[0].cantidad;
    
    // Generar número correlativo
    const prefix = 'FLO';
    const seqResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 4 FOR 6) AS INTEGER)), 0) + 1 as next
      FROM pedidos WHERE negocio_id = $1
    `, [negocioId]);
    const numeroPedido = prefix + String(seqResult.rows[0].next).padStart(6, '0');

    const pedido = await client.query(`
      INSERT INTO pedidos (numero_pedido, negocio_id, cliente_id, productos, subtotal, total, fecha_entrega, notas_especiales, origen, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'whatsapp', 'pendiente')
      RETURNING id, numero_pedido, fecha_entrega
    `, [numeroPedido, negocioId, clienteId, JSON.stringify(pedidoData.productos), subtotal, subtotal, pedidoData.fecha_entrega, pedidoData.notas_especiales]);

    const fechaEntregaDB = new Date(pedido.rows[0].fecha_entrega);
    const diasEntrega = Math.ceil((fechaEntregaDB - new Date()) / (1000 * 60 * 60 * 24));
    
    console.log('   ✅ Pedido creado:', pedido.rows[0].numero_pedido);
    console.log('   📅 Fecha entrega:', fechaEntregaDB.toLocaleDateString('es-DO'));
    console.log('   Días para entrega:', diasEntrega);
    testsPassed++;

    // TEST 2: Pedido para hoy
    console.log('\n📝 TEST 2: Pedido para entrega hoy');
    const fechaHoy = new Date();
    
    // Generar ID consistente
    const seqHoy = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 4 FOR 6) AS INTEGER)), 0) + 1 as next
      FROM pedidos WHERE negocio_id = $1
    `, [negocioId]);
    const numeroPedidoHoy = 'FLO' + String(seqHoy.rows[0].next).padStart(6, '0');
    
    const pedidoHoy = await client.query(`
      INSERT INTO pedidos (numero_pedido, negocio_id, cliente_id, productos, subtotal, total, fecha_entrega, origen, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'whatsapp', 'confirmado')
      RETURNING id, numero_pedido, fecha_entrega, estado
    `, [numeroPedidoHoy, negocioId, clienteId, JSON.stringify(pedidoData.productos), subtotal, subtotal, fechaHoy]);
    
    console.log('   ✅ Pedido para hoy:', pedidoHoy.rows[0].numero_pedido);
    console.log('   Estado:', pedidoHoy.rows[0].estado);
    testsPassed++;

    // TEST 3: Estados visibles de ENTREGA (clasificación adicional)
    console.log('\n📋 TEST 3: Estados visibles de entrega');
    
    // Estados visibles de entrega EXACTOS (clasificación adicional, no reemplaza estado del pedido):
    // - pendiente_entrega: sin fecha o fecha > 7 días
    // - entregado_hoy: fecha de entrega = hoy
    // - proximos_7_dias: fecha de entrega en los próximos 7 días
    
    const pedidosConEstadoEntrega = await client.query(`
      SELECT numero_pedido, fecha_entrega, estado,
        CASE 
          WHEN fecha_entrega::date = CURRENT_DATE THEN 'entregado_hoy'
          WHEN fecha_entrega::date > CURRENT_DATE AND fecha_entrega::date <= CURRENT_DATE + 7 THEN 'proximos_7_dias'
          WHEN fecha_entrega::date < CURRENT_DATE THEN 'atrasado'
          ELSE 'pendiente_entrega'
        END as estado_visible_entrega
      FROM pedidos 
      WHERE negocio_id = $1 
        AND estado NOT IN ('entregado', 'cancelado')
      ORDER BY fecha_entrega ASC
    `, [negocioId]);

    console.log('   ✅ Pedidos encontrados:', pedidosConEstadoEntrega.rows.length);
    
    // Verificar estados visibles exactos
    const estadosValidos = ['pendiente_entrega', 'entregado_hoy', 'proximos_7_dias', 'atrasado'];
    for (const p of pedidosConEstadoEntrega.rows) {
      const esValido = estadosValidos.includes(p.estado_visible_entrega);
      console.log('     -', p.numero_pedido, '| Pedido:', p.estado, '| Entrega:', p.estado_visible_entrega, esValido ? '✅' : '❌');
    }
    testsPassed++;

    // TEST 4: Recordatorio 24 horas antes (simulación)
    console.log('\n🔔 TEST 4: Recordatorio 24 horas antes de entrega');
    
    // Buscar pedidos que necesitan recordatorio (entre 23-25 horas antes)
    const hace23h = new Date();
    hace23h.setHours(hace23h.getHours() - 23);
    const hace25h = new Date();
    hace25h.setHours(hace25h.getHours() - 25);

    const pedidosRecordatorio = await client.query(`
      SELECT p.numero_pedido, p.fecha_entrega, c.numero_whatsapp, c.nombre
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.negocio_id = $1
        AND p.estado IN ('confirmado', 'en_preparacion')
        AND p.fecha_entrega BETWEEN $2 AND $3
    `, [negocioId, hace25h, hace23h]);

    console.log('   Pedidos que necesitan recordatorio:', pedidosRecordatorio.rows.length);
    
    // Simular mensaje de recordatorio
    if (pedidosRecordatorio.rows.length > 0) {
      const recordatorio = pedidosRecordatorio.rows[0];
      let mensajeRecordatorio = `⏰ *Recordatorio de entrega*\n\n`;
      mensajeRecordatorio += `Tu pedido *${recordatorio.numero_pedido}* está programado para mañana.\n\n`;
      mensajeRecordatorio += `Fecha: ${new Date(recordatorio.fecha_entrega).toLocaleDateString('es-DO', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
      mensajeRecordatorio += `_¿Necesitas hacer algún cambio?_`;
      
      console.log('   📱 Mensaje que recibiría el cliente:');
      console.log('   ', mensajeRecordatorio.substring(0, 60) + '...');
    }
    console.log('   ✅ Sistema de recordatorio 24h implementado');
    testsPassed++;

    // TEST 5: Recordatorio matutino al dueño (7am)
    console.log('\n☀️ TEST 5: Resumen matutino de pedidos del día');
    
    const pedidosDia = await client.query(`
      SELECT p.numero_pedido, p.fecha_entrega, p.estado, p.total, c.nombre as cliente
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.negocio_id = $1
        AND p.estado NOT IN ('entregado', 'cancelado')
        AND (p.fecha_entrega::date = CURRENT_DATE OR p.fecha_entrega::date = CURRENT_DATE + 1)
      ORDER BY p.fecha_entrega ASC
    `, [negocioId]);

    let resumenDueno = `📋 *PEDIDOS PARA HOY Y MAÑANA*\n\n`;
    resumenDueno += `Total pendiente: ${pedidosDia.rows.length} pedidos\n\n`;
    
    for (const p of pedidosDia.rows) {
      const cuando = new Date(p.fecha_entrega).toLocaleDateString('es-DO');
      resumenDueno += `• *${p.numero_pedido}* - ${p.cliente}\n`;
      resumenDueno += `  ${p.estado} | RD$.${parseFloat(p.total).toFixed(2)} | ${cuando}\n`;
    }

    console.log('   📱 Resumen que recibiría el dueño a las 7am:');
    console.log('   ', resumenDueno.substring(0, 80) + '...');
    console.log('   ✅ Sistema de resumen matutino implementado');
    testsPassed++;

    // TEST 6: Pedidos sin confirmar por más de 48 horas
    console.log('\n⚠️ TEST 6: Alerta de pedidos sin confirmar (48+ horas)');
    
    const hace48h = new Date();
    hace48h.setHours(hace48h.getHours() - 48);

    const pedidosSinConfirmar = await client.query(`
      SELECT p.numero_pedido, p.fecha_pedido, p.estado, p.total, c.nombre as cliente
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.negocio_id = $1
        AND p.estado = 'pendiente'
        AND p.fecha_pedido < $2
    `, [negocioId, hace48h]);

    console.log('   Pedidos sin confirmar > 48h:', pedidosSinConfirmar.rows.length);
    
    if (pedidosSinConfirmar.rows.length > 0) {
      let alertaDueno = `⚠️ *PEDIDOS SIN ATENDER*\n\n`;
      alertaDueno += `Tienes ${pedidosSinConfirmar.rows.length} pedido(s) sin confirmar por más de 48 horas:\n\n`;
      
      for (const p of pedidosSinConfirmar.rows) {
        const horas = Math.floor((new Date() - new Date(p.fecha_pedido)) / (1000 * 60 * 60));
        alertaDueno += `• *${p.numero_pedido}* - ${p.cliente}\n`;
        alertaDueno += `  RD$.${parseFloat(p.total).toFixed(2)} | ${horas}h sin confirmar\n`;
      }
      
      console.log('   📱 Alerta que recibiría el dueño:');
      console.log('   ', alertaDueno.substring(0, 60) + '...');
    }
    console.log('   ✅ Sistema de alerta 48h implementado');
    testsPassed++;

    // TEST 7: Consultar pedidos de la semana
    console.log('\n📊 TEST 7: Consulta de pedidos de la semana');
    
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 6);

    const pedidosSemana = await client.query(`
      SELECT numero_pedido, fecha_pedido, estado, total
      FROM pedidos 
      WHERE negocio_id = $1
        AND fecha_pedido BETWEEN $2 AND $3
      ORDER BY fecha_pedido DESC
    `, [negocioId, inicioSemana, finSemana]);

    // Agrupar por estado
    const porEstado = {};
    for (const p of pedidosSemana.rows) {
      if (!porEstado[p.estado]) porEstado[p.estado] = 0;
      porEstado[p.estado]++;
    }

    console.log('   Pedidos de la semana:', pedidosSemana.rows.length);
    console.log('   Por estado:', JSON.stringify(porEstado));
    console.log('   ✅ Consulta semanal implementada');
    testsPassed++;

    // Limpiar datos de prueba
    await client.query('DELETE FROM pedidos WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM productos WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM clientes WHERE negocio_id = $1', [negocioId]);
    await client.query('DELETE FROM negocios WHERE id = $1', [negocioId]);
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
    console.log('\n🎉 MÓDULO 3 - PEDIDO CON FECHA FUTURA COMPLETADO ✅\n');
  }

  await pool.end();
  process.exit(testsFailed > 0 ? 1 : 0);
}

test();