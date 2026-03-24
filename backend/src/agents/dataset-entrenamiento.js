// OttO - Dataset de Entrenamiento para el Chatbot
// Basado en patrones comunes de pedidos de flores

module.exports = {
  // Saludos y saludos iniciais
  saludos: [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'que tal', 'hey', 'holi',
    'buen día', 'buenas', 'Buenos días', 'Hola', 'Hola Buenos días', 'que hubo',
    'como estas', 'cómo estás', 'buen día', 'hola buenos días', 'hola que tal'
  ],

  // Consultar catálogo
  catalogo: [
    'ver menú', 'menú', 'qué tienen', 'tienes disponible', 'de venta', 'que tienes de venta',
    'catálogo', 'ver productos', 'qué modelos tienes', 'que productos tienen', 'que tienen',
    'tienen ramos', 'tienen flores', 'qué flores tienes', 'qué arreglos tienen', 'precios',
    'cuánto vale', 'cuánto cuesta', 'qué precios tienen', 'dime el precio', 'me gustaría ver lo que tienes',
    'que tienes disponibles', 'que modelos tienes', 'que tenes', 'q tienen', 'menu', 'catalogo',
    'que modelos tienen', 'ver el catalogo', 'cuales son los precios', 'de que disponen'
  ],

  // Intención de pedido
  pedido: [
    'quiero un ramo', 'necesito una caja', 'pedir un arreglo', 'quiero comprar',
    'mándame un detalle', 'envíame flores', 'ordenando un ramo', 'necesito enviar',
    'para llevar', 'quiero algo bonito', 'quiro un ramo', 'kiero una caja',
    'necesito un ramo', 'voy a ordenar', 'quisiera un ramo', 'deseo comprar',
    'me gustaría un arreglo', 'necesito enviar un detalle', 'para mi esposa',
    'para mi mamá', 'para mi hija', 'para mi amiga', 'es un regalo', 'es para regalo',
    'quiero hacer un pedido', 'necesito hacer un pedido', 'vengo a ordenar',
    'tengo un pedido', 'quiero ordenar', 'necesito ordenar', 'ordenando',
    'quiero mandarle', 'le quiero enviar', 'para enviar', 'mándame',
    'envíame', 'enviar un ramo', 'mandar flores', 'mandar un detalle'
  ],

  // Productos
  productos: [
    'ramo de rosas', 'caja de flores', 'centro de mesa', 'arreglo floral',
    'ramo', 'caja', 'arreglo', 'flores', 'flor', 'detalle', 'sorpresa',
    'ramo de flores', 'caja de rosas', 'arreglo de flores', 'centro floral',
    'ramo de 12 rosas', 'dos ramos', 'tres cajas', 'cinco arreglos',
    'un ramo', 'una caja', 'un arreglo', 'medio docena', 'una docena',
    'ramitos', 'cajitas', 'arreglitos'
  ],

  // Direcciones dominicanas
  direcciones: [
    'calle principal', 'calle primera', 'calle segunda', 'avenida utama',
    'la sabina', 'el cercado', 'las acacias', 'san isidro', 'barrio chino',
    'calle sanchez', 'calle maria', 'calle juan', 'calle rosa',
    'calle del colmado', 'frente a la iglesia', 'frente al banco',
    'al lado del supermercado', 'cerca de la escuela', 'en la escuela',
    'por la escuela', 'para la escuela', 'en el centro', 'en la ciudad',
    'mi casa', 'mi apartamento', 'mi trabajo', 'la oficina',
    'calle 1', 'calle 2', 'calle 3', 'avenida 1', 'avenida principal',
    'en la calle', 'a la calle', 'para la calle', 'por la calle',
    'calle del mercado', 'del mercado', 'frente al colmado', 'al lado del colmado',
    'en el colmado', 'de la pollera', 'por la pollera', 'la pollera'
  ],

  // Horas
  horas: [
    'a las 3pm', 'a las 4pm', 'a las 5pm', 'a las 6pm', 'a las 7pm',
    'para las 3', 'para las 4', 'para las 5', 'para las 6',
    'a las 3 de la tarde', 'a las 4 de la tarde', 'a las 5 de la tarde',
    '3pm', '4pm', '5pm', '6pm', '7pm', '8pm',
    '3 de la tarde', '4 de la tarde', '5 de la tarde',
    'ahora', 'lo más pronto posible', 'urgente', 'para hoy',
    'para mañana', 'lo antes posible', 'a la brevedad'
  ],

  // Destinatarios
  destinatarios: [
    'para mi mamá', 'para mi mama', 'para mi esposa', 'para mi hija',
    'para mi amigo', 'para mi amiga', 'para mi sobrino', 'para mi sobrina',
    'para mi hijo', 'para mi padre', 'para mi abuela', 'para mi abuelo',
    'para pedro', 'para juan', 'para maria', 'para rosa', 'para ana',
    'para carlos', 'para luis', 'para miguel', 'para teresa',
    'para la mama', 'para la esposa', 'para la hija',
    'de parte de', 'es de parte de', 'es un regalo para',
    'es para', 'regalo para', 'para alguien especial'
  ],

  // Confirmación
  confirmacion: [
    'sí', 'si', 'ok', 'de acuerdo', 'claro', 'perfecto', 'confirmo',
    'está bien', 'esta bien', 'afirmativo', 'adelante', 'si claro',
    'ok perfecto', 'sí sí', 'si si', 'confirmar', 'estoy de acuerdo',
    'perfecto si', 'sí, estoy seguro', 'si estoy seguro', 'dale',
    'va', 'va!', 'está', 'confirmado', 'si confirmado'
  ],

  // Cancelación
  cancelacion: [
    'no', 'cancelar', 'nah', 'olvídalo', 'olvidaló', 'mejor no',
    'mejor cancelo', 'cancelo', 'no quiero', 'no me interesa',
    'despues será', 'en otro momento', 'no es necesario', 'cambié de opinión',
    'cambie de opinion', 'no gracias', 'mejor lo thinking'
  ],

  // Frases completas de ejemplo
  ejemplosCompletos: [
    // Pedido simple
    'quiero un ramo de rosas',
    'necesito una caja de flores',
    'pedir un arreglo floral',
    'quiero comprar un ramo',
    
    // Pedido completo
    'quiero un ramo para la calle principal a las 4pm',
    'necesito una caja para la sabina a las 3 de la tarde',
    'mándame un arreglo al cercado a las 5pm',
    'envía flores a la escuela a las 6',
    
    // Con destinatario
    'quiero un ramo para mi mamá a la calle juan',
    'necesito un arreglo para mi esposa en la sabina',
    'para mi amiga maria en el barrio chino',
    'es un regalo para mi hija en la escuela',
    
    // Con errores ortográficos
    'quiro un ramo',
    'kiero una caja',
    'ramoo de rose',
    'caxa de flores',
    
    // Cantidades
    'quiero 2 ramos',
    'necesito 3 cajas',
    '5 arreglos por favor',
    'dos ramos de rosas',
    'tres cajas de flores'
  ]
};
