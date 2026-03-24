// OttO - Test Whisper REAL con faster-whisper
// Ejecutar: node scripts/test-whisper.js

const WhisperService = require('../src/services/whisper');
const fs = require('fs');

async function test() {
  console.log('\n🧪 TEST: Whisper REAL - Transcripcion\n');
  console.log('==================================================');
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Verificar disponibilidad
    console.log('\n🔍 TEST 1: Verificar disponibilidad');
    
    const estado = await WhisperService.verificar();
    console.log('   Servicio disponible:', estado.disponible ? '✅' : '❌');
    console.log('   Metodo:', estado.metodo);
    testsPassed++;

    if (!estado.disponible) {
      console.log('\n   ❌ ERROR: Whisper no disponible');
      testsFailed++;
    } else {
      // TEST 2: Transcribir audio REAL
      console.log('\n🎤 TEST 2: Transcribir audio real');
      
      // Usar el audio de prueba que descargamos
      const audioPath = '/tmp/test-voice.mp3';
      
      if (fs.existsSync(audioPath)) {
        console.log('   Audio:', audioPath);
        console.log('   Tamano:', fs.statSync(audioPath).size, 'bytes');
        
        try {
          const resultado = await WhisperService.transcribir(audioPath);
          
          console.log('');
          console.log('==================================================');
          console.log('📋 RESULTADO REAL DE TRANSCRIPCION');
          console.log('==================================================');
          console.log('   Modelo:', 'tiny');
          console.log('   Metodo:', resultado.method);
          console.log('   Idioma:', resultado.language, `(${resultado.confidence * 100}% confianza)`);
          console.log('   Duracion:', resultado.duration.toFixed(2), 'segundos');
          console.log('   Tiempo de procesamiento:', resultado.processingTime, 'ms');
          console.log('');
          console.log('   Texto transcrito:');
          console.log('   "', resultado.text || '(sin texto detectado)', '"');
          console.log('==================================================');
          
          testsPassed++;
        } catch (transcribeError) {
          console.log('   ❌ Error en transcripcion:', transcribeError.message);
          testsFailed++;
        }
      } else {
        console.log('   Audio no encontrado');
        testsFailed++;
      }
    }

  } catch (error) {
    console.log('\n   ❌ Error:', error.message);
    testsFailed++;
  }

  console.log('\n==================================================');
  console.log('📊 RESUMEN');
  console.log('==================================================');
  console.log('   ✅ Pasados:', testsPassed);
  console.log('   ❌ Fallidos:', testsFailed);
  console.log('==================================================');

  process.exit(testsFailed > 0 ? 1 : 0);
}

test();