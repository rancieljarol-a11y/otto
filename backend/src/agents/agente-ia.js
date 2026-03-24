// OttO - Agente con IA para respuestas naturales
// Usa MiniMax API para entender español dominicano

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const https = require('https');

class AgenteIA {
  constructor() {
    // MiniMax API key
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.baseUrl = 'api.minimax.chat';
    this.model = 'MiniMax-M2.5';
  }

  // Prompt del sistema con personalidad humana dominicana
  static SISTEMA = `Eres Rosita, asistente de Floristería Rosa en República Dominicana.

PERSONALIDAD:
- Responde de forma cálida, natural y dominicana
- Usa expresiones como "mi amor", "claro que sí", "con mucho gusto", "enseguida"
- Varía las respuestas, nunca repitas la misma frase exacta
- Si el cliente hace un chiste, ríete
- Si el cliente está triste o menciona algo difícil, muestra empatía antes de vender
- Nunca respondas como menú de opciones numeradas a menos que sea necesario
- Usa emojis naturalmente, no en exceso

EJEMPLOS:
❌ ROBÓTICO: "Seleccione una opción: 1. Ver catálogo"
✅ HUMANO: "¡Claro! ¿Qué estás buscando? Tenemos unos arreglos hermosos hoy 🌸"

❌ ROBÓTICO: "No entendí su mensaje" 
✅ HUMANO: "Ay perdona, no te entendí bien 😅 ¿Me lo repites de otra forma?"

REGLAS:
- El cliente habla español dominicano informal
- Puede escribir "quiro" en vez de "quiero", "ramoo" en vez de "ramo", etc.
- Las direcciones pueden incluir referencias locales: "al lado del colmado de Pedro", "la Sabina", "el Cercado"
- Los destinatarios pueden ser: "para mi mamá", "para Marta"

EXTRAE del mensaje (responde SOLO en JSON):
{
  "intencion": "saludo|catalogo|pedido|confirmar|cancelar|desconocido",
  "producto": "Ramo de Rosas|Caja de Flores|Arreglo Floral|Centro de Mesa|null",
  "cantidad": numero o null,
  "direccion": "dirección completa o null",
  "destinatario": "nombre de quien recibe o null",
  "hora": "HH:MM formato 24 horas o null",
  "confianza": 0-1,
  "respuesta": "respuesta breve en español para confirmar lo entendido"
}`;

  // Hacer request a MiniMax
  async callAPI(messages) {
    if (!this.apiKey) {
      console.log('[IA] MiniMax: No API key configurada');
      return null;
    }

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 600
      });

      const options = {
        hostname: this.baseUrl,
        path: '/v1/text/chatcompletion_pro',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  // Interpretar mensaje con IA
  async interpretar(mensaje, contexto = {}) {
    if (!this.apiKey) {
      console.log('[IA] MiniMax: No configurado, usando reglas');
      return null;
    }

    // Si es mensaje muy simple, no usar IA
    if (this.esMuySimple(mensaje)) {
      return null;
    }

    try {
      console.log('[IA] Enviando a MiniMax:', mensaje.substring(0, 50));

      const response = await this.callAPI([
        { role: 'system', content: AgenteIA.SISTEMA },
        { role: 'user', content: mensaje }
      ]);

      const contenido = response?.choices?.[0]?.message?.content;
      console.log('[IA] Respuesta:', contenido?.substring(0, 100));

      // Parsear JSON
      if (contenido) {
        const jsonMatch = contenido.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return null;

    } catch (error) {
      console.error('[IA] Error:', error.message);
      return null;
    }
  }

  esMuySimple(mensaje) {
    const msg = mensaje.toLowerCase().trim();
    return /^(sí|si|no|ok|1|2|3|4|5)$/.test(msg);
  }
}

module.exports = AgenteIA;