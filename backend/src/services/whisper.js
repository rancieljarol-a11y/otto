// OttO - Whisper Service (Faster-Whisper)
// Transcripción de audio usando faster-whisper (Python)

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  wrapperScript: path.join(__dirname, '../../scripts/whisper_wrapper.py'),
  pythonPath: 'python3'
};

class WhisperService {
  
  /**
   * Transcribir audio a texto usando faster-whisper
   * @param {string} audioPath - Ruta del archivo de audio
   * @returns {Promise<{text: string, confidence: number, method: string}>}
   */
  static async transcribir(audioPath) {
    // Verificar que el archivo existe
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Archivo de audio no encontrado: ${audioPath}`);
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const process = spawn(config.pythonPath, [config.wrapperScript, audioPath]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          console.error('Whisper stderr:', stderr);
          reject(new Error(`Whisper falló con código ${code}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          const duration = Date.now() - startTime;
          
          resolve({
            text: result.text || '',
            confidence: result.language_probability || 0.9,
            language: result.language || 'es',
            duration: result.duration || 0,
            method: 'faster-whisper',
            processingTime: duration
          });
        } catch (e) {
          reject(new Error(`Error parseando resultado: ${e.message}`));
        }
      });
      
      process.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Verificar si el servicio está disponible
   */
  static async verificar() {
    const disponible = fs.existsSync(config.wrapperScript);
    return {
      disponible,
      metodo: disponible ? 'faster-whisper' : 'no configurado',
      wrapper: config.wrapperScript
    };
  }
}

module.exports = WhisperService;