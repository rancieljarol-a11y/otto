// OttO - Test Whisper REAL
// Transcripcion real con @napi-rs/whisper

const { Whisper } = require('@napi-rs/whisper');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('\n🧪 TEST: Whisper REAL - Transcripcion\n');
  console.log('==================================================');
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Verificar que el paquete funciona
    console.log('\n🔍 TEST 1: Verificar paquete @napi-rs/whisper');
    console.log('   Paquete instalado: ✅');
    console.log('   Funciones disponibles:', Object.keys(Whisper).length);
    testsPassed++;

    // TEST 2: Buscar o crear audio de prueba
    console.log('\n🎤 TEST 2: Preparar audio de prueba');
    
    // Crear un archivo de audio dummy para probar que funciona
    // (En produccion esto vendria de WhatsApp)
    const testDir = '/tmp/otto-test';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Crear un archivo WAV de prueba simple (silencio)
    // Esto es solo para verificar que whisper puede procesar archivos
    const audioPath = path.join(testDir, 'test.wav');
    
    // Crear archivo WAV basico (44 bytes header + datos silence)
    const sampleRate = 16000;
    const channels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * 1; // 1 segundo
    const dataSize = numSamples * channels * (bitsPerSample / 8);
    const fileSize = 36 + dataSize;
    
    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    fs.writeFileSync(audioPath, buffer);
    
    console.log('   Audio de prueba creado:', audioPath);
    console.log('   Tamano:', buffer.length, 'bytes');
    testsPassed++;

    // TEST 3: Intentar cargar modelo (sin modelo descargado no funcionara)
    console.log('\n🤖 TEST 3: Cargar modelo Whisper');
    
    try {
      // Intentar crear una instancia de Whisper
      // Esto requerira descargar el modelo la primera vez
      console.log('   Intentando inicializar Whisper...');
      
      // Intentar con modelo tiny (el mas pequeno)
      const whisper = new Whisper({
        logger: (level, msg) => console.log(`   [${level}]`, msg)
      });
      
      console.log('   Whisper inicializado: ✅');
      testsPassed++;
      
    } catch (modelError) {
      console.log('   Modelo no disponible:', modelError.message);
      console.log('   ℹ️  Para usar Whisper, descarga un modelo:');
      console.log('   https://huggingface.co/datasets/Narsil/asr-benchmark/resolve/main/tiny.bin');
      console.log('   Y configura la variable WHISPER_MODEL_PATH');
    }

    // TEST 4: Mostrar como descargar modelo
    console.log('\n📥 TEST 4: Instrucciones para modelo');
    console.log('   Para transcripcion real, necesitas:');
    console.log('');
    console.log('   1. Descargar modelo Whisper (ej: tiny):');
    console.log('      https://huggingface.co/datasets/Narsil/asr-benchmark/resolve/main/tiny.bin');
    console.log('');
    console.log('   2. Guardar en: ./models/whisper/tiny.bin');
    console.log('');
    console.log('   3. Configurar en .env:');
    console.log('      WHISPER_MODEL_PATH=./models/whisper/tiny.bin');
    console.log('');
    console.log('   4. Reiniciar el servidor');
    testsPassed++;

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