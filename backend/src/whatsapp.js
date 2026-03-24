// OttO - WhatsApp Service con Baileys
// Conexión real a WhatsApp usando @whiskeysockets/baileys

const {
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  makeWASocket
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const config = {
  // Directorio de autenticación
  authDir: path.join(__dirname, '../../whatsapp-auth'),
  
  // Prefijo para identificar mensajes de OttO
  prefix: 'OttO'
};

class WhatsAppBaileys {
  constructor() {
    this.socket = null;
    this.sock = null;
    this.isConnected = false;
    this.ev = null;
  }

  /**
   * Inicializar conexión a WhatsApp
   */
  async conectar() {
    console.log('\n================================================');
    console.log('📱 INICIANDO CONEXIÓN A WHATSAPP (Baileys)');
    console.log('================================================\n');

    // Crear directorio de auth si no existe
    if (!fs.existsSync(config.authDir)) {
      fs.mkdirSync(config.authDir, { recursive: true });
    }

    // Cargar estado de autenticación
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);

    // Obtener versión más reciente de Baileys
    const { version } = await fetchLatestBaileysVersion();
    console.log('📌 Versión de Baileys:', version.join('.'));

    // Crear socket de WhatsApp
    this.sock = makeWASocket({
      auth: state,
      print: (info) => console.log('   ', info),
      logger: { level: 'debug' },
      browser: ['OttO', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    // Eventos
    this.ev = this.sock.ev;

    // Manejar conexión
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Generar QR si existe
      if (qr) {
        console.log('\n📱 ESCANEA ESTE CÓDIGO CON TU WHATSAPP:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n   O visita: https://qr.WhatsApp.net\n');
      }

      // Verificar conexión
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        console.log('⚠️  Conexión cerrada:', reason);

        if (shouldReconnect) {
          console.log('🔄 Reconectando...');
          this.conectar();
        } else {
          console.log('❌ Sesión cerrada. Elimina la carpeta whatsapp-auth y reconnecta.');
        }
        this.isConnected = false;
      }

      if (connection === 'open') {
        console.log('\n✅ ¡WHATSAPP CONECTADO CORRECTAMENTE! 🎉');
        console.log('================================================\n');
        this.isConnected = true;
      }
    });

    // Guardar credenciales cuando cambien
    this.ev.on('creds.update', saveCreds);

    // Escuchar mensajes entrantes
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        // Ignorar mensajes propios
        if (msg.key.fromMe) continue;

        // Verificar que sea texto
        if (!msg.message?.conversation && !msg.message?.extendedTextMessage?.text) {
          console.log('📩 Mensaje no textual ignorado');
          continue;
        }

        // Extraer texto
        const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const numero = msg.key.remoteJid;
        const nombre = msg.pushName || 'Usuario';

        console.log('\n================================================');
        console.log('📩 MENSAJE ENTRANTE');
        console.log('================================================');
        console.log('👤 De:', numero);
        console.log('📝 Nombre:', nombre);
        console.log('💬 Mensaje:', texto);
        console.log('================================================\n');

        // Procesar mensaje
        await this.procesarMensaje(msg, texto, numero);
      }
    });

    return this.sock;
  }

  /**
   * Procesar mensaje entrante
   */
  async procesarMensaje(msg, texto, numero) {
    try {
      // Responder automáticamente
      await this.sock.sendMessage(numero, {
        text: '🌸 ¡Hola! Soy OttO, tu asistente virtual.\n\n' +
              'Estoy listo para ayudarte con tu negocio.\n\n' +
              'Escribe "menu" para ver tus productos o "ayuda" para ver comandos disponibles.'
      }, { quoted: msg });

      console.log('✅ Respuesta enviada a', numero);
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error.message);
    }
  }

  /**
   * Enviar mensaje a un número
   */
  async enviarMensaje(numero, texto) {
    if (!this.isConnected) {
      console.log('❌ WhatsApp no conectado');
      return null;
    }

    try {
      const result = await this.sock.sendMessage(numero, { text: texto });
      console.log('✅ Mensaje enviado a', numero);
      return result;
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error.message);
      return null;
    }
  }

  /**
   * Enviar imagen con texto
   */
  async enviarImagen(numero, imagenPath, texto) {
    if (!this.isConnected) {
      console.log('❌ WhatsApp no conectado');
      return null;
    }

    try {
      const result = await this.sock.sendMessage(numero, {
        image: fs.readFileSync(imagenPath),
        caption: texto
      });
      console.log('✅ Imagen enviada a', numero);
      return result;
    } catch (error) {
      console.error('❌ Error al enviar imagen:', error.message);
      return null;
    }
  }

  /**
   * Enviar documento (PDF)
   */
  async enviarDocumento(numero, documentoPath, texto) {
    if (!this.isConnected) {
      console.log('❌ WhatsApp no conectado');
      return null;
    }

    try {
      const result = await this.sock.sendMessage(numero, {
        document: fs.readFileSync(documentoPath),
        caption: texto,
        fileName: path.basename(documentoPath)
      });
      console.log('✅ Documento enviado a', numero);
      return result;
    } catch (error) {
      console.error('❌ Error al enviar documento:', error.message);
      return null;
    }
  }

  /**
   * Obtener estado de conexión
   */
  getEstado() {
    return {
      conectado: this.isConnected,
      authDir: config.authDir
    };
  }

  /**
   * Cerrar conexión
   */
  async desconectar() {
    if (this.sock) {
      this.sock.end(undefined);
      this.isConnected = false;
      console.log('📴 WhatsApp desconectado');
    }
  }
}

// Instancia singleton
const whatsapp = new WhatsAppBaileys();

// Exportar
module.exports = whatsapp;
module.exports.WhatsAppBaileys = WhatsAppBaileys;