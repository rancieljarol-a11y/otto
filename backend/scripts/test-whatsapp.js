// OttO - WhatsApp Baileys Simple
// Ejecutar: node scripts/test-whatsapp.js

const { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '../whatsapp-auth');

//确保 directorio existe
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function iniciarWhatsApp() {
  console.log('\n================================================');
  console.log('📱 CONECTANDO A WHATSAPP...');
  console.log('================================================\n');

  try {
    // Cargar auth
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    console.log('✅ Auth cargado');

    // Versión
    const { version } = await fetchLatestBaileysVersion();
    console.log('📌 Versión Baileys:', version.join('.'));

    // Crear socket
    const sock = makeWASocket({
      auth: state,
      print: (info) => console.log('   ', info),
      browser: ['OttO', 'Chrome', '120.0.0']
    });

    // Conexión
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n📱 ESCANEA ESTE CÓDIGO QR:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n');
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('⚠️  Conexión cerrada:', reason);
        if (reason !== 401) {
          console.log('🔄 Reconectando...');
          iniciarWhatsApp();
        }
      }

      if (connection === 'open') {
        console.log('\n✅ ¡WHATSAPP CONECTADO! 🎉\n');
        console.log('================================================\n');
      }
    });

    // Credenciales
    sock.ev.on('creds.update', saveCreds);

    // Mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;

        const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const numero = msg.key.remoteJid;
        const nombre = msg.pushName || 'Usuario';

        console.log('\n📩 MENSAJE DE:', nombre, numero);
        console.log('💬:', texto);

        // Responder
        await sock.sendMessage(numero, {
          text: '🌸 ¡Hola! Soy OttO, tu asistente.\n\nEscribe "menu" para ver productos.'
        });
        console.log('✅ Respuesta enviada\n');
      }
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

iniciarWhatsApp();