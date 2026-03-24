// Script para iniciar WhatsApp
// Ejecutar: node scripts/iniciar-whatsapp.js

const whatsapp = require('../src/whatsapp');

async function iniciar() {
  console.log('🚀 Iniciando OttO WhatsApp...\n');
  
  try {
    await whatsapp.conectar();
    
    console.log('📱 Esperando escaneo del código QR...');
    console.log('   (Mantén esta terminal abierta)\n');
    
  } catch (error) {
    console.error('❌ Error al iniciar:', error.message);
    process.exit(1);
  }
}

iniciar();