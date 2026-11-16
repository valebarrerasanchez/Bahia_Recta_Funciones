/**
 * banco-preguntas.js — Banco de preguntas del "Reto final" de Bahía Recta.
 *
 * Transcripción textual del documento "Banco_preguntas_Bahia_Recta.docx":
 * 25 preguntas de selección múltiple, 5 por cada situación de la app
 * (2 de nivel básico, 2 de nivel medio y 1 de nivel alto).
 *
 * Estructura de cada pregunta:
 *   id            → identificador del documento ("1.1" … "5.5")
 *   situacion     → número de la situación de origen (1 a 5)
 *   nivel         → "basico" | "medio" | "alto"
 *   enunciado     → arreglo de párrafos de contexto
 *   tabla         → null, o { encabezados: [...], filas: [[x, costo], ...] }
 *                   (solo en la Situación 5; se muestra como tabla HTML real
 *                   y los costos se formatean en pesos al mostrarlos)
 *   pregunta      → la pregunta concreta
 *   opciones      → las 4 opciones en el orden del documento (A, B, C, D)
 *   correcta      → índice (0 a 3) de la opción correcta en "opciones"
 *   justificacion → explicación que se muestra en la revisión final
 *
 * Docentes: para corregir o agregar preguntas, editar SOLO este arreglo.
 * El reto mezcla el orden de las opciones al mostrarlas, así que aquí se
 * pueden dejar en el orden original del documento.
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  window.BahiaRecta.BancoPreguntas = [

    // ───────── Situación 1 · Comparar tarifas ─────────
    {
      id: "1.1",
      situacion: 1,
      nivel: "basico",
      enunciado: [
        "En la Tienda Coral alquilan equipo de snorkel por $15.000 la hora. En la Tienda Arrecife cobran $20.000 fijos más $10.000 por hora.",
      ],
      tabla: null,
      pregunta: "Si se alquila el equipo por 3 horas, ¿cuál tienda es más económica y por cuánto?",
      opciones: [
        "Tienda Arrecife, $5.000 menos",
        "Tienda Coral, $5.000 menos",
        "Las dos cuestan lo mismo",
        "Tienda Coral, $15.000 menos",
      ],
      correcta: 1, // B en el documento original
      justificacion: "Coral: 15.000 · 3 = $45.000. Arrecife: 20.000 + 10.000 · 3 = $50.000. Coral es $5.000 más barata.",
    },
    {
      id: "1.2",
      situacion: 1,
      nivel: "basico",
      enunciado: [
        "En la Bahía se ofrecen dos servicios: Paddle Sol, con tarifa P(x) = 18.000x, y Moto Marina, con tarifa M(x) = 35.000 + 12.000x.",
      ],
      tabla: null,
      pregunta: "¿Cuál afirmación es correcta?",
      opciones: [
        "P es una función lineal porque su gráfica pasa por el origen; M es afín porque tiene un cargo fijo de $35.000",
        "Ambas son funciones lineales porque sus gráficas son rectas",
        "M es lineal porque su pendiente es menor que la de P",
        "P es afín porque su pendiente es 18.000",
      ],
      correcta: 0, // A en el documento original
      justificacion: "Una función lineal tiene la forma y = mx (b = 0, pasa por el origen). M tiene b = 35.000 ≠ 0, por eso es afín.",
    },
    {
      id: "1.3",
      situacion: 1,
      nivel: "medio",
      enunciado: [
        "La Lancha Brisa cobra B(x) = 30.000x y el Yate Costa Azul cobra C(x) = 50.000 + 20.000x. Al graficarlas, las rectas se cortan en el punto (5, 150.000).",
      ],
      tabla: null,
      pregunta: "¿Qué significa ese punto en la situación?",
      opciones: [
        "Que el yate cuesta $150.000 por cada hora",
        "Que después de 5 horas ambos servicios dejan de cobrar",
        "Que por 5 horas de paseo ambos servicios cuestan $150.000",
        "Que la lancha tiene un cargo fijo de $150.000",
      ],
      correcta: 2, // C en el documento original
      justificacion: "En el punto de corte las dos funciones tienen el mismo valor: B(5) = C(5) = 150.000.",
    },
    {
      id: "1.4",
      situacion: 1,
      nivel: "medio",
      enunciado: [
        "La Lancha Gaviota cobra $40.000 por hora. El Catamarán Taganga cobra $60.000 fijos más $25.000 por hora.",
      ],
      tabla: null,
      pregunta: "¿Para qué cantidad de horas resulta más económico el catamarán?",
      opciones: [
        "Para menos de 4 horas",
        "Para más de 2,4 horas",
        "Nunca; la lancha siempre es más barata",
        "Para más de 4 horas",
      ],
      correcta: 3, // D en el documento original
      justificacion: "40.000x = 60.000 + 25.000x → 15.000x = 60.000 → x = 4. Como el catamarán tiene menor pendiente, después de 4 horas su costo crece más lento y queda por debajo.",
    },
    {
      id: "1.5",
      situacion: 1,
      nivel: "alto",
      enunciado: [
        "Una lancha cobra $45.000 por hora. Un yate cobra un cargo fijo F más $30.000 por hora. Se sabe que por 6 horas de paseo ambos cuestan exactamente lo mismo.",
      ],
      tabla: null,
      pregunta: "¿Cuál es el valor del cargo fijo F del yate?",
      opciones: [
        "$270.000",
        "$15.000",
        "$90.000",
        "$180.000",
      ],
      correcta: 2, // C en el documento original
      justificacion: "Lancha: 45.000 · 6 = 270.000. Yate: F + 30.000 · 6 = F + 180.000. Igualando: F = 270.000 − 180.000 = 90.000.",
    },

    // ───────── Situación 2 · Costo entre amigos ─────────
    {
      id: "2.1",
      situacion: 2,
      nivel: "basico",
      enunciado: [
        "Un grupo de amigos va a Playa Cristal. El costo total del plan es T(n) = 60.000 + 20.000n, donde n es el número de amigos.",
      ],
      tabla: null,
      pregunta: "¿Qué representa el número 20.000 en esta función?",
      opciones: [
        "El costo total del plan para un amigo",
        "El costo adicional por cada amigo que se suma al plan",
        "El costo fijo del plan, sin importar cuántos vayan",
        "El número de amigos que van al paseo",
      ],
      correcta: 1, // B en el documento original
      justificacion: "20.000 es la pendiente: por cada persona adicional, el costo total aumenta $20.000. El 60.000 es el término fijo.",
    },
    {
      id: "2.2",
      situacion: 2,
      nivel: "basico",
      enunciado: [
        "Para ir a Playa Blanca, un grupo alquila una lancha por $120.000 (precio fijo) y paga $15.000 por persona para el almuerzo.",
      ],
      tabla: null,
      pregunta: "Si van 8 amigos y dividen el total en partes iguales, ¿cuánto paga cada uno?",
      opciones: [
        "$16.875",
        "$15.000",
        "$240.000",
        "$30.000",
      ],
      correcta: 3, // D en el documento original
      justificacion: "Total: 120.000 + 15.000 · 8 = 240.000. Por persona: 240.000 ÷ 8 = $30.000. (El distractor $16.875 suma el almuerzo una sola vez.)",
    },
    {
      id: "2.3",
      situacion: 2,
      nivel: "medio",
      enunciado: [
        "El costo total de un paseo en grupo es T(n) = 60.000 + 20.000n. Al final del paseo, el grupo pagó en total $260.000.",
      ],
      tabla: null,
      pregunta: "¿Cuántos amigos fueron al paseo?",
      opciones: [
        "10",
        "13",
        "16",
        "8",
      ],
      correcta: 0, // A en el documento original
      justificacion: "60.000 + 20.000n = 260.000 → 20.000n = 200.000 → n = 10.",
    },
    {
      id: "2.4",
      situacion: 2,
      nivel: "medio",
      enunciado: [
        "El costo total de una excursión a Taganga es T(n) = 90.000 + 18.000n.",
      ],
      tabla: null,
      pregunta: "Si el grupo pasa de 5 a 9 amigos, ¿en cuánto aumenta el costo total?",
      opciones: [
        "$72.000",
        "$162.000",
        "$252.000",
        "$90.000",
      ],
      correcta: 0, // A en el documento original
      justificacion: "Aumentan 4 personas y cada una suma 18.000: 4 · 18.000 = 72.000. También: T(9) − T(5) = 252.000 − 180.000.",
    },
    {
      id: "2.5",
      situacion: 2,
      nivel: "alto",
      enunciado: [
        "Un plan en grupo cuesta T(n) = 100.000 + 20.000n en total, y el costo se divide en partes iguales entre los n amigos.",
      ],
      tabla: null,
      pregunta: "¿Qué sucede con lo que paga cada amigo a medida que se suman más personas?",
      opciones: [
        "Aumenta $20.000 por cada amigo que se suma",
        "Se mantiene siempre en $20.000",
        "Disminuye, pero nunca llega a ser menor que $20.000",
        "Disminuye hasta llegar a $0",
      ],
      correcta: 2, // C en el documento original
      justificacion: "Cada uno paga T(n)/n = 100.000/n + 20.000. El cargo fijo se reparte entre más personas, pero los $20.000 individuales siempre se pagan. Ojo: el costo total es afín, pero el costo por persona no es una función lineal.",
    },

    // ───────── Situación 3 · El presupuesto ─────────
    {
      id: "3.1",
      situacion: 3,
      nivel: "basico",
      enunciado: [
        "Un kayak doble se alquila con un depósito de $25.000 más $15.000 por hora. Tienes un presupuesto de $130.000 y el kayak solo se alquila por horas completas.",
      ],
      tabla: null,
      pregunta: "¿Cuál es el máximo de horas que puedes alquilarlo?",
      opciones: [
        "8 horas",
        "6 horas",
        "5 horas",
        "7 horas",
      ],
      correcta: 3, // D en el documento original
      justificacion: "25.000 + 15.000x ≤ 130.000 → 15.000x ≤ 105.000 → x ≤ 7.",
    },
    {
      id: "3.2",
      situacion: 3,
      nivel: "basico",
      enunciado: [
        "Una familia tiene $300.000 para su paseo. Alquila una lancha que cobra $120.000 fijos más $45.000 por hora y la usa durante 3 horas.",
      ],
      tabla: null,
      pregunta: "¿Cuánto dinero le queda del presupuesto?",
      opciones: [
        "$255.000",
        "$45.000",
        "$165.000",
        "$135.000",
      ],
      correcta: 1, // B en el documento original
      justificacion: "Gasto: 120.000 + 45.000 · 3 = 255.000. Le queda 300.000 − 255.000 = $45.000.",
    },
    {
      id: "3.3",
      situacion: 3,
      nivel: "medio",
      enunciado: [
        "Un grupo tiene como máximo $350.000 para un paseo que cuesta $80.000 de transporte más $30.000 por persona.",
      ],
      tabla: null,
      pregunta: "¿Qué desigualdad modela la situación y cuántas personas pueden ir como máximo?",
      opciones: [
        "80.000 + 30.000n ≥ 350.000; mínimo 9 personas",
        "30.000 + 80.000n ≤ 350.000; máximo 4 personas",
        "80.000 + 30.000n ≤ 350.000; máximo 11 personas",
        "80.000 + 30.000n ≤ 350.000; máximo 9 personas",
      ],
      correcta: 3, // D en el documento original
      justificacion: "El costo no puede superar el presupuesto (≤). 30.000n ≤ 270.000 → n ≤ 9. El distractor de 11 personas olvida el transporte.",
    },
    {
      id: "3.4",
      situacion: 3,
      nivel: "medio",
      enunciado: [
        "Con un presupuesto de $200.000 se comparan la Lancha Brisa, B(x) = 30.000x, y el Yate Costa Azul, C(x) = 50.000 + 20.000x. Ambos se alquilan solo por horas completas.",
      ],
      tabla: null,
      pregunta: "¿Qué servicio permite más horas de paseo y cuántas?",
      opciones: [
        "El yate, 7 horas",
        "La lancha, 6 horas",
        "La lancha, 6,67 horas",
        "Ambos permiten la misma cantidad de horas",
      ],
      correcta: 0, // A en el documento original
      justificacion: "Lancha: 30.000x ≤ 200.000 → x ≤ 6,67 → 6 horas. Yate: 20.000x ≤ 150.000 → x ≤ 7,5 → 7 horas.",
    },
    {
      id: "3.5",
      situacion: 3,
      nivel: "alto",
      enunciado: [
        "Con un presupuesto de $250.000 se comparan una lancha, L(x) = 35.000x, y un yate, Y(x) = 60.000 + 25.000x. Ambos se alquilan solo por horas completas.",
      ],
      tabla: null,
      pregunta: "¿Cuál afirmación es correcta?",
      opciones: [
        "La lancha permite 7 horas y el yate solo 6",
        "Con ambos se pueden alquilar 7 horas, pero con el yate sobran $15.000",
        "El yate permite 10 horas porque 250.000 ÷ 25.000 = 10",
        "Con ambos se pueden alquilar 7 horas, pero con la lancha sobra más dinero",
      ],
      correcta: 1, // B en el documento original
      justificacion: "Lancha: x ≤ 7,14 → 7 h, cuesta 245.000 (sobran 5.000). Yate: x ≤ 7,6 → 7 h, cuesta 235.000 (sobran 15.000).",
    },

    // ───────── Situación 4 · Tres opciones ─────────
    {
      id: "4.1",
      situacion: 4,
      nivel: "basico",
      enunciado: [
        "Se comparan tres servicios: Lancha Brisa B(x) = 30.000x, Yate Costa Azul C(x) = 50.000 + 20.000x y Mar Azul M(x) = 100.000 + 10.000x.",
      ],
      tabla: null,
      pregunta: "¿Cuál afirmación sobre las pendientes es correcta?",
      opciones: [
        "Mar Azul tiene la mayor pendiente porque su cargo fijo es el más alto",
        "La pendiente del Yate Costa Azul es 50.000",
        "La Lancha Brisa tiene la mayor pendiente: su costo aumenta $30.000 por cada hora",
        "Las tres tienen la misma pendiente porque sus rectas se cortan en un mismo punto",
      ],
      correcta: 2, // C en el documento original
      justificacion: "La pendiente es el coeficiente de x: 30.000, 20.000 y 10.000. El cargo fijo (b) no es la pendiente.",
    },
    {
      id: "4.2",
      situacion: 4,
      nivel: "basico",
      enunciado: [
        "Con los servicios B(x) = 30.000x, C(x) = 50.000 + 20.000x y M(x) = 100.000 + 10.000x:",
      ],
      tabla: null,
      pregunta: "¿Cuál es el servicio más económico para un paseo de 8 horas?",
      opciones: [
        "Yate Costa Azul, $210.000",
        "Lancha Brisa, $240.000",
        "Mar Azul, $180.000",
        "Los tres cuestan lo mismo",
      ],
      correcta: 2, // C en el documento original
      justificacion: "B(8) = 240.000; C(8) = 210.000; M(8) = 180.000.",
    },
    {
      id: "4.3",
      situacion: 4,
      nivel: "medio",
      enunciado: [
        "Con los servicios B(x) = 30.000x, C(x) = 50.000 + 20.000x y M(x) = 100.000 + 10.000x:",
      ],
      tabla: null,
      pregunta: "¿Qué ocurre cuando el paseo dura exactamente 5 horas?",
      opciones: [
        "Solo la lancha y el yate cuestan lo mismo",
        "Mar Azul es el más económico",
        "La lancha es la más costosa",
        "Los tres servicios cuestan $150.000",
      ],
      correcta: 3, // D en el documento original
      justificacion: "B(5) = 150.000; C(5) = 150.000; M(5) = 150.000. Las tres rectas pasan por el mismo punto (5, 150.000).",
    },
    {
      id: "4.4",
      situacion: 4,
      nivel: "medio",
      enunciado: [
        "En la playa se ofrecen: Kayak K(x) = 20.000x, Paddle P(x) = 32.000 + 12.000x y Velero V(x) = 102.000 + 5.000x.",
      ],
      tabla: null,
      pregunta: "¿Cuál es la opción más económica para un paseo de 5 horas?",
      opciones: [
        "Paddle, $92.000",
        "Kayak, $100.000",
        "Velero, $127.000",
        "Kayak, $92.000",
      ],
      correcta: 0, // A en el documento original
      justificacion: "K(5) = 100.000; P(5) = 92.000; V(5) = 127.000.",
    },
    {
      id: "4.5",
      situacion: 4,
      nivel: "alto",
      enunciado: [
        "En la playa se ofrecen: Kayak K(x) = 20.000x, Paddle P(x) = 32.000 + 12.000x y Velero V(x) = 102.000 + 5.000x.",
      ],
      tabla: null,
      pregunta: "¿En qué intervalo de horas el paddle es la opción más económica de las tres?",
      opciones: [
        "Menos de 4 horas",
        "Entre 4 y 10 horas",
        "Más de 6,8 horas",
        "Entre 4 y 6,8 horas",
      ],
      correcta: 1, // B en el documento original
      justificacion: "K = P en x = 4 (8.000x = 32.000). P = V en x = 10 (7.000x = 70.000). Entre 4 y 10 horas, P está por debajo de K y de V. El 6,8 corresponde a K = V, que no limita al paddle.",
    },

    // ───────── Situación 5 · Tarifa oculta ─────────
    {
      id: "5.1",
      situacion: 5,
      nivel: "basico",
      enunciado: [
        "Un operador no publica su tarifa, pero muestra esta tabla:",
      ],
      tabla: {
        encabezados: ["Horas (x)", "Costo"],
        filas: [[1, 70000], [2, 90000], [3, 110000], [4, 130000]],
      },
      pregunta: "¿Cuál es la función de su tarifa?",
      opciones: [
        "C(x) = 70.000x",
        "C(x) = 20.000x + 50.000",
        "C(x) = 50.000x + 20.000",
        "C(x) = 20.000x + 70.000",
      ],
      correcta: 1, // B en el documento original
      justificacion: "Por cada hora el costo aumenta 20.000 (pendiente). Para x = 1: 20.000 + b = 70.000 → b = 50.000.",
    },
    {
      id: "5.2",
      situacion: 5,
      nivel: "basico",
      enunciado: [
        "La tabla de un servicio de paddle indica:",
      ],
      tabla: {
        encabezados: ["Horas (x)", "Costo"],
        filas: [[2, 64000], [5, 160000]],
      },
      pregunta: "¿Qué función describe la tarifa y de qué tipo es?",
      opciones: [
        "C(x) = 32.000x + 64.000; es afín",
        "C(x) = 32.000x + 32.000; es afín",
        "C(x) = 96.000x; es lineal",
        "C(x) = 32.000x; es lineal",
      ],
      correcta: 3, // D en el documento original
      justificacion: "m = (160.000 − 64.000)/(5 − 2) = 32.000. b = 64.000 − 32.000 · 2 = 0. Como b = 0, es lineal (proporcional).",
    },
    {
      id: "5.3",
      situacion: 5,
      nivel: "medio",
      enunciado: [
        "Un velero cobró $105.000 por un paseo de 3 horas y $185.000 por uno de 7 horas. Su tarifa es una función afín.",
      ],
      tabla: null,
      pregunta: "¿Cuál es la función de la tarifa?",
      opciones: [
        "C(x) = 20.000x + 45.000",
        "C(x) = 35.000x",
        "C(x) = 20.000x + 105.000",
        "C(x) = 80.000x + 45.000",
      ],
      correcta: 0, // A en el documento original
      justificacion: "m = (185.000 − 105.000)/(7 − 3) = 80.000/4 = 20.000. b = 105.000 − 20.000 · 3 = 45.000.",
    },
    {
      id: "5.4",
      situacion: 5,
      nivel: "medio",
      enunciado: [
        "La tarifa oculta de un yate tiene esta tabla:",
      ],
      tabla: {
        encabezados: ["Horas (x)", "Costo"],
        filas: [[2, 86000], [4, 122000], [6, 158000]],
      },
      pregunta: "¿Cuál es el cargo fijo del yate?",
      opciones: [
        "$18.000",
        "$86.000",
        "$50.000",
        "$36.000",
      ],
      correcta: 2, // C en el documento original
      justificacion: "Cada 2 horas aumenta 36.000, así que m = 18.000 por hora. b = 86.000 − 18.000 · 2 = 50.000. El distractor $36.000 confunde el aumento cada 2 horas con el cargo fijo.",
    },
    {
      id: "5.5",
      situacion: 5,
      nivel: "alto",
      enunciado: [
        "Un operador dice que su tarifa es afín, pero en su tabla hay un error:",
      ],
      tabla: {
        encabezados: ["Horas (x)", "Costo"],
        filas: [[1, 55000], [2, 80000], [3, 105000], [4, 135000], [5, 155000]],
      },
      pregunta: "¿Cuál valor está equivocado y cuál debería ser?",
      opciones: [
        "El de 5 horas; debería ser $160.000",
        "El de 1 hora; debería ser $25.000",
        "Ningún valor está mal; la tabla corresponde a una función afín",
        "El de 4 horas; debería ser $130.000",
      ],
      correcta: 3, // D en el documento original
      justificacion: "Los primeros datos aumentan 25.000 por hora: C(x) = 25.000x + 30.000. Entonces C(4) = 130.000 y C(5) = 155.000 sí cumple. El valor de 4 horas rompe el patrón.",
    },
  ];
})();
