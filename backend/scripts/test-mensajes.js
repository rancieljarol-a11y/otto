// OttO - Chat de Pruebas Local
// Servidor en puerto 3002 para probar agentes sin WhatsApp
// Ejecutar: node scripts/test-mensajes.js

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================
// CARGAR AGENTES REALES DE OTTO
// ============================================

// Simular contexto de negocio y cliente
const contextoPrueba = {
  negocio: {
    id: 'test-negocio-1',
    nombre: 'Floristería Rosa',
    whatsapp_negocio: '+18098000001',
    whatsapp_dueno: '+18098000001',
    personalidad_bot: 'Soy Rosita, una asistente cálida y amigable de una floristería.',
    horario_atencion: {
      lunes: { inicio: '08:00', fin: '19:00', activo: true },
      martes: { inicio: '08:00', fin: '19:00', activo: true },
      miercoles: { inicio: '08:00', fin: '19:00', activo: true },
      jueves: { inicio: '08:00', fin: '19:00', activo: true },
      viernes: { inicio: '08:00', fin: '19:00', activo: true },
      sabado: { inicio: '09:00', fin: '17:00', activo: true },
      domingo: { inicio: '09:00', fin: '14:00', activo: true }
    },
    mensaje_fuera_horario: 'Gracias por contactarnos. Estamos fuera de horario. Nuestro horario es de 8am a 7pm.',
    acepta_pedidos_fuera_horario: false
  },
  cliente: {
    id: 'test-cliente-1',
    numero_whatsapp: '+18091234567',
    nombre: 'Cliente Prueba'
  }
};

// ============================================
// LÓGICA DE AGENTES (simplificada para pruebas)
// ============================================

const analizarMensaje = (texto) => {
  const msg = texto.toLowerCase().trim();
  
  // Saludo
  if (['hola', 'buenos', 'buenas', 'hey', 'hi'].some(s => msg.startsWith(s))) {
    return {
      tipo: 'saludo',
      respuesta: '¡Hola! 👋\n\nBienvenido a *Floristería Rosa*\n\n¿En qué puedo ayudarte hoy?\n- Ver el menú\n- Hacer un pedido\n- Consultar un pedido'
    };
  }
  
  // Menú
  if (msg.includes('menú') || msg.includes('menu') || msg.includes('productos') || msg.includes('ver')) {
    return {
      tipo: 'menu',
      respuesta: `🍽️ *MENÚ - Floristería Rosa*\n\n*Arreglos:*\n• Ramo de Rosas (12) ..... RD$ 35.00\n• Arreglo Floral Premium ..... RD$ 55.00\n• Caja de Flores ..... RD$ 40.00\n\n*Ramos:*\n• Ramo Mixto ..... RD$ 45.00\n• Rosas Rojas (24) ..... RD$ 65.00\n\n_¿Qué te gustaría pedir?_`
    };
  }
  
  // Hacer pedido
  if (msg.includes('pedir') || msg.includes('ordenar') || msg.includes('quiero')) {
    return {
      tipo: 'pedido',
      respuesta: '¡Con gusto! Para hacer un pedido, dime:\n1. ¿Qué productos quieres?\n2. ¿Para cuándo lo necesitas?\n3. ¿A dónde lo entregamos?'
    };
  }
  
  // Estado de pedido
  if (msg.includes('pedido') || msg.includes('mi orden') || msg.includes('estado')) {
    return {
      tipo: 'consulta_pedido',
      respuesta: 'Para consultar tu pedido, por favor dime el número de pedido (ej: FLO000001)'
    };
  }
  
  // Precios
  if (msg.includes('precio') || msg.includes('cuánto') || msg.includes('cuesta')) {
    return {
      tipo: 'precios',
      respuesta: 'Nuestros precios:\n\n• Ramo de Rosas: RD$ 35.00\n• Arreglo Premium: RD$ 55.00\n• Caja de Flores: RD$ 40.00\n• Ramo Mixto: RD$ 45.00'
    };
  }
  
  // Contacto
  if (msg.includes('contacto') || msg.includes('ubicación') || msg.includes('dirección')) {
    return {
      tipo: 'contacto',
      respuesta: '📍 *Floristería Rosa*\n\n📱 WhatsApp: +1 809-800-0001\n\n¡Visítanos!'
    };
  }
  
  // Ayuda
  if (msg.includes('ayuda') || msg.includes('comandos')) {
    return {
      tipo: 'ayuda',
      respuesta: `📋 *Comandos disponibles:*\n\n• "menú" - Ver productos\n• "pedir" - Hacer un pedido\n• "precio" - Ver precios\n• "contacto" - Ver información\n• "ayuda" - Ver comandos\n\n¡Con gusto te ayudo! 🌸`
    };
  }
  
  // Despedida
  if (msg.includes('gracias') || msg.includes('chao') || msg.includes('adiós')) {
    return {
      tipo: 'despedida',
      respuesta: '¡Gracias por contactarnos! Que tengas un día hermoso 🌸👋'
    };
  }
  
  // Por defecto
  return {
    tipo: 'default',
    respuesta: 'No entendí tu mensaje. ¿Podrías ser más específico? Escribe "ayuda" para ver comandos disponibles.'
  };
};

// ============================================
// INTERFAZ WEB
// ============================================

// HTML del chat
const htmlChat = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OttO - Chat de Pruebas</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container {
      width: 100%;
      max-width: 500px;
      height: 90vh;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    .header p { font-size: 12px; opacity: 0.8; }
    .status { 
      display: inline-block;
      background: #10b981; 
      color: white; 
      padding: 3px 10px; 
      border-radius: 10px; 
      font-size: 11px;
    }
    .status.offline { background: #ef4444; }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .message {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
    }
    .message.user {
      align-self: flex-end;
      background: #667eea;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .message.bot {
      align-self: flex-start;
      background: #f0f0f0;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    .message .time {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 5px;
      text-align: right;
    }
    .input-area {
      padding: 15px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }
    .input-area input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 25px;
      font-size: 14px;
      outline: none;
    }
    .input-area input:focus {
      border-color: #667eea;
    }
    .input-area button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .input-area button:hover {
      background: #5568d3;
    }
    .input-area button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .typing {
      text-align: center;
      padding: 10px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌸 OttO - Chat de Pruebas</h1>
      <p>Floristería Rosa</p>
      <span class="status">En línea</span>
    </div>
    <div class="messages" id="messages">
      <div class="message bot">
        ¡Hola! 👋
        <br><br>
        Soy <strong>Rosita</strong>, la asistente de <strong>Floristería Rosa</strong>.
        <br><br>
        Estoy lista para ayudarte. Escribe un mensaje para comenzar.
        <div class="time">Ahora</div>
      </div>
    </div>
    <div class="typing" id="typing" style="display: none;">🤔 Rosita está escribiendo...</div>
    <div class="input-area">
      <input type="text" id="inputMessage" placeholder="Escribe un mensaje..." autocomplete="off">
      <button id="sendBtn">Enviar</button>
    </div>
  </div>

  <script>
    const messagesDiv = document.getElementById('messages');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');
    const typingDiv = document.getElementById('typing');

    function addMessage(text, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'bot');
      div.innerHTML = text.replace(/\\n/g, '<br>') + '<div class="time">' + new Date().toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit'}) + '</div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function sendMessage() {
      const text = inputMessage.value.trim();
      if (!text) return;

      addMessage(text, true);
      inputMessage.value = '';
      sendBtn.disabled = true;

      typingDiv.style.display = 'block';

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({mensaje: text})
        });
        
        const data = await response.json();
        
        typingDiv.style.display = 'none';
        addMessage(data.respuesta, false);
      } catch (error) {
        typingDiv.style.display = 'none';
        addMessage('Error: ' + error.message, false);
      }

      sendBtn.disabled = false;
      inputMessage.focus();
    }

    sendBtn.addEventListener('click', sendMessage);
    inputMessage.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
`;

// ============================================
// RUTAS API
// ============================================

// Servir HTML
app.get('/', (req, res) => {
  res.send(htmlChat);
});

// API de chat
app.post('/api/chat', (req, res) => {
  const { mensaje } = req.body;
  
  console.log('📩 Mensaje recibido:', mensaje);
  
  // Procesar con lógica de agentes
  const resultado = analizarMensaje(mensaje);
  
  console.log('📤 Respuesta:', resultado.respuesta.substring(0, 50) + '...');
  
  res.json({
    tipo: resultado.tipo,
    respuesta: resultado.respuesta
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = 3002;

app.listen(PORT, () => {
  console.log('\\n' + '='.repeat(50));
  console.log('🌸 OTTO - CHAT DE PRUEBAS');
  console.log('='.repeat(50));
  console.log('');
  console.log('📱 Abre en tu navegador:');
  console.log('   http://localhost:' + PORT);
  console.log('');
  console.log('📝 Escribe mensajes para probar los agentes');
  console.log('');
  console.log('   Ejemplos de prueba:');
  console.log('   - "hola" (saludo)');
  console.log('   - "menú" (ver productos)');
  console.log('   - "precios" (consultar precios)');
  console.log('   - "pedir" (hacer pedido)');
  console.log('   - "ayuda" (ver comandos)');
  console.log('');
  console.log('='.repeat(50) + '\\n');
});