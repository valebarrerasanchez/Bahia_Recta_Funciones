/**
 * retos.js — Pestaña "Reto final" (EVALUACIÓN) de Bahía Recta.
 *
 * A diferencia de las 5 situaciones (pestañas de PRÁCTICA), aquí la
 * estudiante responde 10 preguntas de selección múltiple sin gráficas, sin
 * calculadoras y sin retroalimentación inmediata. Al final ve su puntaje,
 * el desempeño por situación y la revisión con la justificación de cada
 * pregunta.
 *
 * Flujo: pantalla de inicio → 10 preguntas (una a la vez) → resultados.
 *
 * Se registra en BahiaRecta.Situaciones igual que las demás pestañas, para
 * que app.js la monte/desmonte con el mismo ciclo de vida init/destroy.
 *
 * El estado del reto vive en este módulo durante la sesión: si la
 * estudiante cambia de pestaña y vuelve, continúa donde iba. Se pierde al
 * recargar la página (no se guarda nada en el navegador).
 *
 * Datos: window.BahiaRecta.BancoPreguntas (js/data/banco-preguntas.js).
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  // ─────────────────────────── Configuración ───────────────────────────

  /** Nombre corto de cada situación (igual al de su pestaña). */
  var NOMBRES_SITUACION = {
    1: "Comparar tarifas",
    2: "Costo entre amigos",
    3: "El presupuesto",
    4: "Tres opciones",
    5: "Tarifa oculta",
  };

  var SITUACIONES = [1, 2, 3, 4, 5];
  var PREGUNTAS_POR_SITUACION = 2;
  var TOTAL_PREGUNTAS = SITUACIONES.length * PREGUNTAS_POR_SITUACION; // 10

  /** Orden de dificultad: primero básicas, luego medias, al final altas. */
  var ORDEN_NIVEL = { basico: 0, medio: 1, alto: 2 };
  var NOMBRE_NIVEL = { basico: "Básico", medio: "Medio", alto: "Alto" };
  var LETRAS = ["A", "B", "C", "D"];

  /** Mensajes según el puntaje obtenido. */
  function mensajeDesempeno(aciertos) {
    if (aciertos >= 9) {
      return { nivel: "alto", texto: "¡Llegaste a puerto! Dominas la función lineal y afín." };
    }
    if (aciertos >= 6) {
      return { nivel: "medio", texto: "Buen rumbo. Revisa las situaciones donde fallaste." };
    }
    return {
      nivel: "bajo",
      texto: "Vuelve a navegar por las situaciones de práctica y vuelve a intentarlo.",
    };
  }

  // ───────────────────────── Estado de la sesión ─────────────────────────

  var sesion = {
    fase: "inicio", // "inicio" | "pregunta" | "resultados"
    preguntas: [], // preguntas del reto actual (opciones ya mezcladas)
    respuestas: [], // índice elegido en cada pregunta, o null si no respondió
    actual: 0, // índice de la pregunta que se está mostrando
    idsAnteriores: [], // ids del intento inmediatamente anterior (para no repetir)
    avisoPendientes: false, // true mientras se muestra el aviso de preguntas sin responder
    terminadoEl: null, // fecha en que se terminó el reto
  };

  // Referencias al DOM del montaje actual (se limpian en destroy).
  var refs = {};

  // ───────────────────────── Utilidades generales ─────────────────────────

  function el(tag, attrs, children) {
    return window.BahiaRecta.UI.el(tag, attrs, children);
  }

  /**
   * Mezcla de Fisher-Yates: devuelve una COPIA del arreglo en orden
   * aleatorio, con todas las permutaciones igual de probables.
   */
  function mezclar(arreglo) {
    var a = arreglo.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  /**
   * Formato de pesos colombianos con punto de miles: 150000 → "$150.000".
   * Se hace a mano (y no con toLocaleString) porque algunos navegadores no
   * agrupan los números de 4 cifras en español ("5000" en vez de "5.000").
   */
  function formatoPesos(valor) {
    return "$" + String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /** Une números en texto natural: [2] → "2"; [2, 5, 7] → "2, 5 y 7". */
  function unirLista(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
  }

  /** Anuncia un mensaje a lectores de pantalla (región aria-live). */
  function anunciar(mensaje) {
    if (!refs.live) return;
    // Se vacía primero para que el lector repita el anuncio aunque el
    // texto sea igual al anterior.
    refs.live.textContent = "";
    setTimeout(function () {
      if (refs.live) refs.live.textContent = mensaje;
    }, 60);
  }

  /** Lleva la vista al inicio del reto (útil en el celular al cambiar de pregunta). */
  function subirAlReto() {
    if (refs.raiz && refs.raiz.getBoundingClientRect().top < 0) {
      refs.raiz.scrollIntoView({ block: "start" });
    }
  }

  // ───────────────────── Selección aleatoria y equilibrada ─────────────────────

  /**
   * Elige 2 preguntas de una misma situación.
   * Prioridades (de mayor a menor):
   *   1) que no sean del mismo nivel;
   *   2) que no se repitan preguntas del intento anterior.
   * Entre las parejas igual de buenas, se escoge una al azar.
   */
  function elegirPareja(pool, idsEvitar) {
    if (pool.length <= PREGUNTAS_POR_SITUACION) return pool.slice();

    var parejas = [];
    for (var i = 0; i < pool.length; i++) {
      for (var j = i + 1; j < pool.length; j++) {
        var a = pool[i];
        var b = pool[j];
        var repetidas = (idsEvitar.indexOf(a.id) >= 0 ? 1 : 0) + (idsEvitar.indexOf(b.id) >= 0 ? 1 : 0);
        // Mismo nivel pesa más que cualquier cantidad de repetidas.
        var costo = (a.nivel === b.nivel ? 10 : 0) + repetidas;
        parejas.push({ preguntas: [a, b], costo: costo });
      }
    }

    var menorCosto = Math.min.apply(
      null,
      parejas.map(function (p) {
        return p.costo;
      })
    );
    var mejores = parejas.filter(function (p) {
      return p.costo === menorCosto;
    });
    return mejores[Math.floor(Math.random() * mejores.length)].preguntas;
  }

  /**
   * Copia una pregunta del banco y mezcla sus opciones (Fisher-Yates),
   * recalculando el índice de la opción correcta.
   */
  function prepararPregunta(original) {
    var orden = mezclar(
      original.opciones.map(function (_, i) {
        return i;
      })
    );
    return {
      id: original.id,
      situacion: original.situacion,
      nivel: original.nivel,
      enunciado: original.enunciado,
      tabla: original.tabla,
      pregunta: original.pregunta,
      opciones: orden.map(function (i) {
        return original.opciones[i];
      }),
      correcta: orden.indexOf(original.correcta),
      justificacion: original.justificacion,
    };
  }

  /** Arma un reto nuevo: 2 preguntas por situación, ordenadas por dificultad. */
  function generarReto() {
    var banco = window.BahiaRecta.BancoPreguntas || [];
    var seleccion = [];

    SITUACIONES.forEach(function (n) {
      var pool = banco.filter(function (q) {
        return q.situacion === n;
      });
      seleccion = seleccion.concat(elegirPareja(pool, sesion.idsAnteriores));
    });

    // Primero se mezcla todo y luego se ordena por nivel: como sort() es
    // estable, dentro de cada nivel las preguntas quedan en orden aleatorio.
    seleccion = mezclar(seleccion).sort(function (a, b) {
      return ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel];
    });

    return seleccion.map(prepararPregunta);
  }

  /** Inicia un intento nuevo y guarda los ids del anterior para no repetirlos. */
  function comenzarReto() {
    if (sesion.preguntas.length) {
      sesion.idsAnteriores = sesion.preguntas.map(function (q) {
        return q.id;
      });
    }
    sesion.preguntas = generarReto();
    sesion.respuestas = sesion.preguntas.map(function () {
      return null;
    });
    sesion.actual = 0;
    sesion.avisoPendientes = false;
    sesion.terminadoEl = null;
    sesion.fase = "pregunta";
    // irAPregunta dibuja, anuncia y mueve el foco a la primera pregunta.
    irAPregunta(0);
  }

  // ───────────────────────────── Calificación ─────────────────────────────

  function calcularResultados() {
    var porSituacion = {};
    SITUACIONES.forEach(function (n) {
      porSituacion[n] = { aciertos: 0, total: 0 };
    });

    var aciertos = 0;
    sesion.preguntas.forEach(function (q, i) {
      var acierto = sesion.respuestas[i] === q.correcta;
      porSituacion[q.situacion].total += 1;
      if (acierto) {
        aciertos += 1;
        porSituacion[q.situacion].aciertos += 1;
      }
    });

    var total = sesion.preguntas.length;
    return {
      aciertos: aciertos,
      total: total,
      porcentaje: total ? Math.round((aciertos / total) * 100) : 0,
      porSituacion: porSituacion,
      mensaje: mensajeDesempeno(aciertos),
    };
  }

  function preguntasSinResponder() {
    var pendientes = [];
    sesion.respuestas.forEach(function (r, i) {
      if (r === null) pendientes.push(i + 1);
    });
    return pendientes;
  }

  // ─────────────────────── Piezas visuales compartidas ───────────────────────

  /** Etiqueta discreta con la situación de origen y el nivel. */
  function crearEtiquetas(q) {
    return el("p", { class: "reto-etiquetas" }, [
      el("span", { class: "reto-chip", text: NOMBRES_SITUACION[q.situacion] }),
      el("span", { class: "reto-chip reto-chip--nivel", text: "Nivel " + NOMBRE_NIVEL[q.nivel].toLowerCase() }),
    ]);
  }

  /** Enunciado + tabla de valores (si la hay) + texto de la pregunta. */
  function crearEnunciado(q, idPregunta) {
    var nodos = q.enunciado.map(function (parrafo) {
      return el("p", { class: "reto-enunciado", text: parrafo });
    });

    if (q.tabla) nodos.push(crearTabla(q.tabla));

    var pregunta = el("p", { class: "reto-pregunta__texto", text: q.pregunta });
    if (idPregunta) pregunta.id = idPregunta;
    nodos.push(pregunta);
    return nodos;
  }

  /**
   * Tabla de valores como <table> real. Se muestra en horizontal (como en
   * el documento): una fila por variable, una columna por cada dato.
   */
  function crearTabla(tabla) {
    var filaHoras = el("tr", {}, [el("th", { scope: "row", text: tabla.encabezados[0] })]);
    var filaCosto = el("tr", {}, [el("th", { scope: "row", text: tabla.encabezados[1] })]);

    tabla.filas.forEach(function (fila) {
      filaHoras.appendChild(el("td", { text: String(fila[0]) }));
      filaCosto.appendChild(el("td", { text: formatoPesos(fila[1]) }));
    });

    return el("div", { class: "reto-tabla-wrap" }, [
      el("table", { class: "data-table reto-tabla" }, [
        el("caption", { class: "reto-sr-only", text: "Tabla de valores: horas y costo" }),
        el("tbody", {}, [filaHoras, filaCosto]),
      ]),
    ]);
  }

  function crearBoton(texto, clases, onClick, extra) {
    var attrs = { type: "button", class: "reto-btn " + (clases || ""), text: texto, onClick: onClick };
    Object.keys(extra || {}).forEach(function (k) {
      attrs[k] = extra[k];
    });
    return el("button", attrs);
  }

  // ─────────────────────────── Pantalla: inicio ───────────────────────────

  function pantallaInicio() {
    var instrucciones = [
      ["Vas a resolver ", "10 preguntas", " de selección múltiple: 2 de cada situación de práctica."],
      ["Las preguntas aparecen ", "una a la vez", ", de la más sencilla a la más retadora."],
      ["Aquí no tienes gráficas ni la calculadora de la app, pero ", "puedes usar papel y lápiz", "."],
      ["Puedes volver a preguntas anteriores y cambiar tu respuesta antes de terminar.", "", ""],
      ["No sabrás si acertaste durante el reto: ", "al final verás tus resultados", " y la explicación de cada pregunta."],
    ];

    var lista = el(
      "ul",
      { class: "reto-instrucciones" },
      instrucciones.map(function (partes) {
        var li = el("li");
        li.appendChild(document.createTextNode(partes[0]));
        if (partes[1]) li.appendChild(el("strong", { text: partes[1] }));
        if (partes[2]) li.appendChild(document.createTextNode(partes[2]));
        return li;
      })
    );

    var titulo = el("h2", { class: "reto-titulo", id: "reto-titulo-inicio", tabindex: "-1", text: "Reto final" });

    return el("section", { class: "reto-card reto-inicio", "aria-labelledby": "reto-titulo-inicio" }, [
      el("span", { class: "reto-inicio__icono", "aria-hidden": "true", text: "⚓" }),
      titulo,
      el("p", {
        class: "reto-inicio__lead",
        text: "Llegó el momento de demostrar lo que aprendiste navegando por la bahía.",
      }),
      lista,
      crearBoton("Comenzar reto", "reto-btn--primario reto-btn--grande", comenzarReto),
    ]);
  }

  // ─────────────────────────── Pantalla: pregunta ───────────────────────────

  function pantallaPregunta() {
    var i = sesion.actual;
    var q = sesion.preguntas[i];
    var numero = i + 1;
    var esUltima = i === sesion.preguntas.length - 1;

    // Indicador "Pregunta X de 10" + barra de progreso.
    var progresoTexto = el("p", {
      class: "reto-progreso__texto",
      id: "reto-progreso-texto",
      text: "Pregunta " + numero + " de " + sesion.preguntas.length,
    });
    var progreso = el("div", { class: "reto-progreso" }, [
      progresoTexto,
      el(
        "div",
        {
          class: "reto-progreso__barra",
          role: "progressbar",
          "aria-labelledby": "reto-progreso-texto",
          "aria-valuemin": "0",
          "aria-valuemax": String(sesion.preguntas.length),
          "aria-valuenow": String(numero),
        },
        [el("span", { class: "reto-progreso__relleno", style: "width:" + (numero / sesion.preguntas.length) * 100 + "%" })]
      ),
    ]);

    // Mapa de preguntas: permite saltar y muestra cuáles ya tienen respuesta
    // (NO muestra si son correctas).
    refs.mapa = el(
      "ol",
      { class: "reto-mapa", "aria-label": "Mapa de preguntas" },
      sesion.preguntas.map(function (_, k) {
        var btn = crearBoton(String(k + 1), "reto-mapa__btn", function () {
          irAPregunta(k);
        });
        actualizarBotonMapa(btn, k);
        return el("li", {}, [btn]);
      })
    );

    // Opciones como tarjetas dentro de un radiogroup accesible.
    var grupo = el("div", {
      class: "reto-opciones",
      role: "radiogroup",
      "aria-labelledby": "reto-pregunta-texto",
    });
    q.opciones.forEach(function (texto, k) {
      var opcion = el(
        "div",
        {
          class: "reto-opcion",
          role: "radio",
          "aria-checked": "false",
          tabindex: "-1",
          "data-indice": String(k),
          onClick: function () {
            seleccionarOpcion(k);
            opcion.focus();
          },
        },
        [
          el("span", { class: "reto-opcion__letra", text: LETRAS[k] }),
          el("span", { class: "reto-opcion__texto", text: texto }),
        ]
      );
      grupo.appendChild(opcion);
    });
    grupo.addEventListener("keydown", manejarTecladoOpciones);
    refs.opciones = Array.prototype.slice.call(grupo.children);
    pintarSeleccion();

    var tarjeta = el(
      "article",
      { class: "reto-card reto-pregunta", "aria-labelledby": "reto-progreso-texto" },
      [crearEtiquetas(q)].concat(crearEnunciado(q, "reto-pregunta-texto"), [grupo])
    );

    // Botones de navegación.
    var anterior = crearBoton("← Anterior", "reto-btn--secundario", function () {
      irAPregunta(i - 1);
    });
    if (i === 0) anterior.disabled = true;

    var siguiente = esUltima
      ? crearBoton("Terminar reto", "reto-btn--primario", intentarTerminar)
      : crearBoton("Siguiente →", "reto-btn--primario", function () {
          irAPregunta(i + 1);
        });

    var acciones = el("div", { class: "reto-acciones reto-acciones--nav" }, [anterior, siguiente]);

    // Zona del aviso de preguntas sin responder (vacía hasta que se necesite).
    refs.aviso = el("div", { class: "reto-aviso-zona" });
    if (sesion.avisoPendientes) refs.aviso.appendChild(crearAvisoPendientes());

    return el("section", { class: "reto-flujo" }, [progreso, refs.mapa, tarjeta, refs.aviso, acciones]);
  }

  function actualizarBotonMapa(btn, k) {
    var respondida = sesion.respuestas[k] !== null;
    var esActual = k === sesion.actual;
    btn.classList.toggle("is-respondida", respondida);
    btn.classList.toggle("is-actual", esActual);
    if (esActual) btn.setAttribute("aria-current", "step");
    else btn.removeAttribute("aria-current");
    btn.setAttribute("aria-label", "Pregunta " + (k + 1) + (respondida ? ", respondida" : ", sin responder"));
  }

  /** Refleja en las tarjetas la opción elegida (y el tabindex itinerante). */
  function pintarSeleccion() {
    var elegida = sesion.respuestas[sesion.actual];
    refs.opciones.forEach(function (opcion, k) {
      var marcada = k === elegida;
      opcion.setAttribute("aria-checked", marcada ? "true" : "false");
      opcion.classList.toggle("is-seleccionada", marcada);
      // Solo una opción entra en el orden de tabulación: la elegida o, si no
      // hay, la primera.
      opcion.tabIndex = marcada || (elegida === null && k === 0) ? 0 : -1;
    });
  }

  function seleccionarOpcion(k) {
    sesion.respuestas[sesion.actual] = k;
    pintarSeleccion();

    var btnMapa = refs.mapa && refs.mapa.querySelectorAll("button")[sesion.actual];
    if (btnMapa) actualizarBotonMapa(btnMapa, sesion.actual);

    // Si el aviso de pendientes está abierto, se actualiza la lista.
    if (sesion.avisoPendientes) {
      refs.aviso.innerHTML = "";
      if (preguntasSinResponder().length) {
        refs.aviso.appendChild(crearAvisoPendientes());
      } else {
        sesion.avisoPendientes = false;
      }
    }
  }

  /**
   * Teclado dentro del grupo de opciones:
   *  - Flechas (arriba/abajo/izquierda/derecha), Inicio y Fin mueven el foco.
   *  - Enter o Espacio seleccionan la opción enfocada.
   */
  function manejarTecladoOpciones(evt) {
    var actual = refs.opciones.indexOf(document.activeElement);
    if (actual < 0) return;
    var total = refs.opciones.length;
    var destino = null;

    switch (evt.key) {
      case "ArrowDown":
      case "ArrowRight":
        destino = (actual + 1) % total;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        destino = (actual - 1 + total) % total;
        break;
      case "Home":
        destino = 0;
        break;
      case "End":
        destino = total - 1;
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        evt.preventDefault();
        seleccionarOpcion(actual);
        return;
      default:
        return;
    }

    evt.preventDefault();
    refs.opciones.forEach(function (o, k) {
      o.tabIndex = k === destino ? 0 : -1;
    });
    refs.opciones[destino].focus();
  }

  function irAPregunta(k) {
    if (k < 0 || k >= sesion.preguntas.length) return;
    sesion.actual = k;
    // Al cambiar de pregunta se cierra el aviso de pendientes; vuelve a
    // aparecer si se presiona "Terminar reto" y aún faltan respuestas.
    sesion.avisoPendientes = false;
    mostrarPantalla();
    subirAlReto();

    var q = sesion.preguntas[k];
    anunciar("Pregunta " + (k + 1) + " de " + sesion.preguntas.length + ". " + NOMBRES_SITUACION[q.situacion] + ".");

    // El foco va a la opción activa del grupo para seguir con el teclado.
    var foco = refs.opciones.filter(function (o) {
      return o.tabIndex === 0;
    })[0];
    if (foco) foco.focus({ preventScroll: true });
  }

  // ─────────────────── Aviso de preguntas sin responder ───────────────────

  function intentarTerminar() {
    var pendientes = preguntasSinResponder();
    if (!pendientes.length) {
      terminarReto();
      return;
    }
    // No se usa confirm() del navegador: se muestra un aviso dentro de la
    // página, accesible y que no bloquea la app.
    sesion.avisoPendientes = true;
    refs.aviso.innerHTML = "";
    var aviso = crearAvisoPendientes();
    refs.aviso.appendChild(aviso);
    aviso.focus();
  }

  function crearAvisoPendientes() {
    var pendientes = preguntasSinResponder();
    var texto =
      pendientes.length === 1
        ? "Te falta responder la pregunta " + pendientes[0] + "."
        : "Te faltan por responder " + pendientes.length + " preguntas: la " + unirLista(pendientes) + ".";

    var irBotones = pendientes.map(function (n) {
      return crearBoton("Ir a la pregunta " + n, "reto-btn--enlace", function () {
        irAPregunta(n - 1);
      });
    });

    return el(
      "div",
      {
        class: "reto-aviso",
        role: "alert",
        tabindex: "-1",
        "aria-labelledby": "reto-aviso-titulo",
      },
      [
        el("p", { class: "reto-aviso__titulo", id: "reto-aviso-titulo", text: "⚠ Aún tienes preguntas sin responder" }),
        el("p", {
          text: texto + " Las preguntas sin responder cuentan como incorrectas. ¿Quieres terminar de todos modos?",
        }),
        el("div", { class: "reto-aviso__ir" }, irBotones),
        el("div", { class: "reto-acciones" }, [
          crearBoton("Seguir respondiendo", "reto-btn--secundario", function () {
            irAPregunta(pendientes[0] - 1);
          }),
          crearBoton("Terminar de todos modos", "reto-btn--peligro", terminarReto),
        ]),
      ]
    );
  }

  function terminarReto() {
    sesion.avisoPendientes = false;
    sesion.terminadoEl = new Date();
    sesion.fase = "resultados";
    mostrarPantalla();
    subirAlReto();

    var r = calcularResultados();
    anunciar(
      "Reto terminado. Obtuviste " + r.aciertos + " de " + r.total + ", " + r.porcentaje + " por ciento. " + r.mensaje.texto
    );
    if (refs.tituloResultados) refs.tituloResultados.focus({ preventScroll: true });
  }

  // ─────────────────────────── Pantalla: resultados ───────────────────────────

  function pantallaResultados() {
    var r = calcularResultados();

    // Puntaje general.
    refs.tituloResultados = el("h2", {
      class: "reto-titulo",
      id: "reto-titulo-resultados",
      tabindex: "-1",
      text: "Tus resultados",
    });
    var puntaje = el(
      "section",
      { class: "reto-card reto-puntaje reto-puntaje--" + r.mensaje.nivel, "aria-labelledby": "reto-titulo-resultados" },
      [
        refs.tituloResultados,
        el("p", { class: "reto-puntaje__numero" }, [
          el("span", { class: "reto-puntaje__fraccion", text: r.aciertos + "/" + r.total }),
          el("span", { class: "reto-puntaje__porcentaje", text: r.porcentaje + " %" }),
        ]),
        el("p", { class: "reto-puntaje__mensaje", text: r.mensaje.texto }),
      ]
    );

    // Desempeño por situación.
    var listaSituaciones = el(
      "ul",
      { class: "reto-situaciones" },
      SITUACIONES.map(function (n) {
        var dato = r.porSituacion[n];
        var completa = dato.aciertos === dato.total;
        var estado = completa ? "completa" : dato.aciertos === 0 ? "nula" : "parcial";
        var estadoTexto = { completa: "✔ Dominada", parcial: "◐ Por reforzar", nula: "✘ Por practicar" }[estado];

        var hijos = [
          el("span", { class: "reto-situacion__nombre", text: n + ". " + NOMBRES_SITUACION[n] }),
          el("span", { class: "reto-situacion__marcador", text: dato.aciertos + "/" + dato.total }),
          el("span", { class: "reto-situacion__estado", text: estadoTexto }),
        ];
        if (!completa) {
          hijos.push(
            crearBoton(
              "Practicar esta situación",
              "reto-btn--secundario reto-btn--pequeno",
              function () {
                irASituacion(n);
              },
              { "aria-label": "Practicar la situación " + n + ": " + NOMBRES_SITUACION[n] }
            )
          );
        }
        return el("li", { class: "reto-situacion reto-situacion--" + estado }, hijos);
      })
    );
    var situaciones = el("section", { class: "reto-card", "aria-labelledby": "reto-titulo-situaciones" }, [
      el("h3", { id: "reto-titulo-situaciones", text: "Desempeño por situación" }),
      listaSituaciones,
    ]);

    // Revisión pregunta por pregunta.
    var revision = el("section", { class: "reto-card", "aria-labelledby": "reto-titulo-revision" }, [
      el("h3", { id: "reto-titulo-revision", text: "Revisión pregunta por pregunta" }),
      el("ol", { class: "reto-revision" }, sesion.preguntas.map(crearItemRevision)),
    ]);

    var acciones = el("div", { class: "reto-acciones" }, [
      crearBoton("Nuevo reto", "reto-btn--primario", comenzarReto),
      crearBoton("Exportar resultados", "reto-btn--secundario", exportarResultados),
    ]);

    return el("section", { class: "reto-flujo" }, [puntaje, situaciones, revision, acciones]);
  }

  /** Una pregunta en la revisión final: enunciado, opciones marcadas y justificación. */
  function crearItemRevision(q, i) {
    var elegida = sesion.respuestas[i];
    var acerto = elegida === q.correcta;
    var estado = elegida === null ? "sin" : acerto ? "ok" : "mal";
    var estadoTexto = { ok: "✔ Correcta", mal: "✘ Incorrecta", sin: "✘ Sin responder" }[estado];

    var opciones = el(
      "ul",
      { class: "reto-revision__opciones" },
      q.opciones.map(function (texto, k) {
        var esCorrecta = k === q.correcta;
        var esElegida = k === elegida;
        var clase = "reto-revision__opcion";
        var nota = "";

        // Nunca solo color: cada marca lleva símbolo y texto.
        if (esCorrecta && esElegida) {
          clase += " is-correcta";
          nota = "✔ Tu respuesta · correcta";
        } else if (esCorrecta) {
          clase += " is-correcta";
          nota = "✔ Respuesta correcta";
        } else if (esElegida) {
          clase += " is-incorrecta";
          nota = "✘ Tu respuesta · incorrecta";
        }

        return el("li", { class: clase }, [
          el("span", { class: "reto-opcion__letra", text: LETRAS[k] }),
          el("span", { class: "reto-revision__texto", text: texto }),
          nota ? el("span", { class: "reto-revision__nota", text: nota }) : null,
        ]);
      })
    );

    var hijos = [
      el("div", { class: "reto-revision__cabecera" }, [
        el("h4", { text: "Pregunta " + (i + 1) }),
        el("span", { class: "reto-revision__estado reto-revision__estado--" + estado, text: estadoTexto }),
      ]),
      crearEtiquetas(q),
    ]
      .concat(crearEnunciado(q, null))
      .concat([opciones]);

    if (elegida === null) {
      hijos.push(el("p", { class: "reto-revision__sin", text: "No respondiste esta pregunta." }));
    }

    hijos.push(
      el("div", { class: "reto-justificacion" }, [
        el("strong", { text: "Justificación: " }),
        document.createTextNode(q.justificacion),
      ])
    );

    return el("li", { class: "reto-revision__item reto-revision__item--" + estado }, hijos);
  }

  /** Cambia a la pestaña de práctica de una situación (usa el mismo click de la portada). */
  function irASituacion(n) {
    var tab = document.getElementById("tab-situacion" + n);
    if (!tab) return;
    tab.click();
    tab.focus();
    window.scrollTo(0, 0);
  }

  // ─────────────────────────────── Exportar ───────────────────────────────

  /**
   * Descarga un .txt legible con el puntaje, el desempeño por situación y
   * la revisión completa (sirve como evidencia para la docente).
   * Reutiliza ExportUtils.downloadText de js/utils/export.js.
   */
  function exportarResultados() {
    var ExportUtils = window.BahiaRecta.ExportUtils;
    var r = calcularResultados();
    var fecha = sesion.terminadoEl || new Date();
    var lineas = [];

    lineas.push("BAHÍA RECTA — Reto final: función lineal y afín (grado 9°)");
    lineas.push("Fecha: " + fecha.toLocaleString("es-CO"));
    lineas.push("");
    lineas.push("PUNTAJE: " + r.aciertos + "/" + r.total + " (" + r.porcentaje + " %)");
    lineas.push(r.mensaje.texto);
    lineas.push("");
    lineas.push("DESEMPEÑO POR SITUACIÓN");
    SITUACIONES.forEach(function (n) {
      var d = r.porSituacion[n];
      lineas.push("  " + n + ". " + NOMBRES_SITUACION[n] + ": " + d.aciertos + "/" + d.total);
    });
    lineas.push("");
    lineas.push("REVISIÓN PREGUNTA POR PREGUNTA");

    sesion.preguntas.forEach(function (q, i) {
      var elegida = sesion.respuestas[i];
      var estado = elegida === null ? "✘ Sin responder" : elegida === q.correcta ? "✔ Correcta" : "✘ Incorrecta";
      lineas.push("");
      lineas.push(
        (i + 1) + ". [" + NOMBRES_SITUACION[q.situacion] + " · Nivel " + NOMBRE_NIVEL[q.nivel].toLowerCase() +
          " · banco " + q.id + "] " + estado
      );
      q.enunciado.forEach(function (p) {
        lineas.push("   " + p);
      });
      if (q.tabla) {
        lineas.push("   " + q.tabla.encabezados[0] + ": " + q.tabla.filas.map(function (f) { return f[0]; }).join(" | "));
        lineas.push("   " + q.tabla.encabezados[1] + ": " + q.tabla.filas.map(function (f) { return formatoPesos(f[1]); }).join(" | "));
      }
      lineas.push("   " + q.pregunta);
      lineas.push("   Tu respuesta: " + (elegida === null ? "(sin responder)" : LETRAS[elegida] + ") " + q.opciones[elegida]));
      lineas.push("   Respuesta correcta: " + LETRAS[q.correcta] + ") " + q.opciones[q.correcta]);
      lineas.push("   Justificación: " + q.justificacion);
    });

    var dia = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0") + "-" + String(fecha.getDate()).padStart(2, "0");
    ExportUtils.downloadText("bahia-recta-reto-final-" + dia + ".txt", lineas.join("\r\n"));
    anunciar("Resultados exportados.");
  }

  // ─────────────────────────── Montaje / ciclo de vida ───────────────────────────

  /** Dibuja la pantalla que corresponde a la fase actual. */
  function mostrarPantalla() {
    if (!refs.pantalla) return;
    refs.pantalla.innerHTML = "";
    refs.opciones = [];
    refs.mapa = null;
    refs.tituloResultados = null;

    var pantalla;
    if (sesion.fase === "pregunta") pantalla = pantallaPregunta();
    else if (sesion.fase === "resultados") pantalla = pantallaResultados();
    else pantalla = pantallaInicio();

    refs.pantalla.appendChild(pantalla);
  }

  function render(container) {
    // Región aria-live (invisible) para anunciar cambios de pregunta y resultados.
    refs.live = el("p", { class: "reto-sr-only", role: "status", "aria-live": "polite" });
    refs.pantalla = el("div", { class: "reto-pantalla" });
    refs.raiz = el("div", { class: "reto" }, [refs.live, refs.pantalla]);
    container.appendChild(refs.raiz);
    mostrarPantalla();
  }

  function destroy() {
    // Los listeners viven en nodos del contenedor, que app.js vacía al
    // cambiar de pestaña. El estado de "sesion" se conserva a propósito.
    refs = {};
  }

  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.retos = {
    meta: {
      label: "Evaluación",
      number: "",
      title: "Reto final: pon a prueba tu conocimiento",
      objective: "Resuelve 10 situaciones sobre función lineal y afín y descubre qué tanto dominas el tema.",
    },
    init: render,
    destroy: destroy,
  };

  // Ganchos solo para pruebas automáticas (no se usan en la interfaz).
  window.BahiaRecta.RetoFinal = {
    _generarReto: generarReto,
    _mezclar: mezclar,
    _formatoPesos: formatoPesos,
    TOTAL_PREGUNTAS: TOTAL_PREGUNTAS,
  };
})();
