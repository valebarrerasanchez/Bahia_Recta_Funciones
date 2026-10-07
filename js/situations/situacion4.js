/**
 * situacion4.js — Tres opciones para el paseo
 *
 * Lancha Brisa:      B(x) = 30000x
 * Yate Costa Azul:   C(x) = 50000 + 20000x
 * Servicio Mar Azul: M(x) = 100000 + 10000x
 *
 * Con estas tarifas, las tres rectas se cruzan en el MISMO punto (5, 150000):
 * Costa Azul nunca es la opción más barata en ningún intervalo (siempre queda
 * "en el medio"), lo que refuerza la conclusión pedagógica de que ninguna
 * alternativa es la más económica para todo el dominio.
 *
 * El código NO asume ese resultado a fuego: calcula las intersecciones y el
 * costo mínimo dinámicamente con math.js, para que si un docente cambia las
 * constantes de abajo, la gráfica/tabla/verbal se sigan actualizando bien
 * (aunque las preguntas guía fueron redactadas pensando en el caso curricular
 * exacto pedido en el enunciado).
 */
(function () {
  "use strict";

  // ---- Constantes del modelo (docentes: editar solo aquí) ----
  var TARIFA_BRISA_HORA = 30000;
  var TARIFA_COSTA_ZARPE = 50000;
  var TARIFA_COSTA_HORA = 20000;
  var TARIFA_MAR_ZARPE = 100000;
  var TARIFA_MAR_HORA = 10000;
  var MAX_HORAS_DOMINIO = 12;
  var X_EXPLORA_INICIAL = 3;

  var MathUtils = window.BahiaRecta.MathUtils;
  var Validation = window.BahiaRecta.Validation;
  var UI = window.BahiaRecta.UI;
  var ExportUtils = window.BahiaRecta.ExportUtils;

  var fnBrisa = MathUtils.linearFunction(TARIFA_BRISA_HORA, 0);
  var fnCosta = MathUtils.linearFunction(TARIFA_COSTA_HORA, TARIFA_COSTA_ZARPE);
  var fnMar = MathUtils.linearFunction(TARIFA_MAR_HORA, TARIFA_MAR_ZARPE);

  var SERVICIOS = [
    { key: "brisa", label: "Lancha Brisa", fn: fnBrisa, color: "#0284c7" },
    { key: "costa", label: "Yate Costa Azul", fn: fnCosta, color: "#ea580c" },
    { key: "mar", label: "Servicio Mar Azul", fn: fnMar, color: "#15803d" },
  ];

  var intersecciones = [
    { par: "Brisa / Costa Azul", punto: MathUtils.intersectionPoint(fnBrisa, fnCosta) },
    { par: "Brisa / Mar Azul", punto: MathUtils.intersectionPoint(fnBrisa, fnMar) },
    { par: "Costa Azul / Mar Azul", punto: MathUtils.intersectionPoint(fnCosta, fnMar) },
  ];

  // ¿Las tres intersecciones caen en el mismo punto? (caso curricular exacto)
  var puntoComun = detectarPuntoComun(intersecciones);

  function detectarPuntoComun(inters) {
    var tol = 0.5;
    var p0 = inters[0].punto;
    var todasIguales = inters.every(function (item) {
      return item.punto && Math.abs(item.punto.x - p0.x) < tol && Math.abs(item.punto.y - p0.y) < tol;
    });
    return todasIguales ? p0 : null;
  }

  function cheapestAt(x) {
    var best = null;
    SERVICIOS.forEach(function (s) {
      var y = s.fn.evaluate(x);
      if (!best || y < best.y) best = { key: s.key, label: s.label, y: y };
    });
    return best;
  }

  // Servicio más económico "para paseos cortos" (cerca de x=0.1) y "para
  // paseos largos" (cerca del final del dominio) -- calculado dinámicamente.
  var cheapestShort = cheapestAt(0.1);
  var cheapestLong = cheapestAt(MAX_HORAS_DOMINIO);

  var xExplora = X_EXPLORA_INICIAL;
  var questionWidgets = {};

  function render(container) {
    container.innerHTML = "";

    container.appendChild(
      UI.el("p", {
        class: "situation-panel__intro",
        text:
          "Ahora hay tres alternativas para el paseo. Muévete a lo largo del eje de horas y observa cuál " +
          "servicio conviene en cada tramo: ninguno es el más barato para TODO el rango de horas.",
      })
    );

    var layout = UI.el("div", { class: "situation-layout" });

    var controls = UI.el("aside", { class: "controls-panel", "aria-label": "Explorar el dominio" });
    controls.appendChild(UI.el("h3", { text: "Explorar horas" }));

    var errorBox = UI.el("div", { class: "error-message", role: "alert" });
    errorBox.hidden = true;

    var xControl = UI.createSyncedRangeNumber({
      id: "sit4-x",
      label: "Horas a explorar (x)",
      min: 0,
      max: MAX_HORAS_DOMINIO,
      step: 0.5,
      value: xExplora,
      onChange: function (value) {
        var result = Validation.validateHours(value, { max: MAX_HORAS_DOMINIO });
        if (!result.valid) {
          UI.setError(errorBox, result.message);
          return;
        }
        UI.setError(errorBox, "");
        xExplora = result.value;
        actualizarTodo();
      },
    });
    controls.appendChild(xControl.wrapper);
    controls.appendChild(errorBox);

    controls.appendChild(
      UI.el("div", { class: "algebraic-box", style: "margin-top:1rem;padding:0.75rem;" }, [
        UI.el("h3", { text: "Opción más económica ahora", style: "font-size:0.9rem;" }),
        UI.el("p", { id: "sit4-cheapest-now", style: "font-weight:800;color:#15803d;" }),
      ])
    );

    layout.appendChild(controls);

    var content = UI.el("div", { class: "content-area" });

    var graphBox = UI.el("div", { class: "graph-container" }, [
      UI.el("h3", { text: "Gráfica: las tres tarifas" }),
      UI.el("div", { id: "sit4-plot", class: "plot" }),
    ]);
    content.appendChild(graphBox);

    var tableBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Tabla de valores" }),
      UI.el("div", { id: "sit4-table" }),
    ]);
    content.appendChild(tableBox);

    var algebraicBox = UI.el("div", { class: "algebraic-box" }, [
      UI.el("h3", { text: "Registro algebraico" }),
      UI.el("p", { id: "sit4-alg-b", class: "algebraic-expression" }),
      UI.el("p", { id: "sit4-alg-c", class: "algebraic-expression" }),
      UI.el("p", { id: "sit4-alg-m", class: "algebraic-expression" }),
      UI.el("p", { id: "sit4-alg-inter", style: "font-size:0.88rem;color:#334155;" }),
    ]);
    content.appendChild(algebraicBox);

    layout.appendChild(content);
    container.appendChild(layout);

    var strip = UI.el("section", { class: "challenge-strip", "aria-label": "Preguntas guía" });
    strip.appendChild(UI.el("h3", { text: "Reto: comparación de tres funciones" }));

    var q1x = UI.createNumericQuestion({
      id: "sit4-q1x",
      prompt: "¿En qué valor de x se cruzan las tres funciones (coordenada x)?",
      suffix: "horas",
      expected: puntoComun ? puntoComun.x : intersecciones[0].punto.x,
      tolerance: 0.1,
      hint: "Iguala dos de las funciones a la vez y resuelve, luego comprueba con la tercera.",
      correctMessage: "Correcto.",
    });
    var q1y = UI.createNumericQuestion({
      id: "sit4-q1y",
      prompt: "¿Y en qué costo (coordenada y) se cruzan?",
      suffix: "pesos",
      expected: puntoComun ? puntoComun.y : intersecciones[0].punto.y,
      tolerance: 1000,
      hint: "Reemplaza el valor de x que encontraste en cualquiera de las tres funciones.",
      correctMessage: "Correcto: las tres cuestan lo mismo en ese punto.",
    });
    var q2corto = UI.createRadioQuestion({
      id: "sit4-q2corto",
      prompt: "Para paseos CORTOS (pocas horas), ¿qué servicio presenta el menor costo?",
      options: SERVICIOS.map(function (s) { return { value: s.key, label: s.label }; }),
      expected: cheapestShort.key,
      hint: "Mira la gráfica cerca de x = 0: ¿cuál línea arranca más abajo?",
      correctMessage: "Correcto: " + cheapestShort.label + " es la más barata para paseos cortos.",
    });
    var q2largo = UI.createRadioQuestion({
      id: "sit4-q2largo",
      prompt: "Para paseos LARGOS (muchas horas), ¿qué servicio presenta el menor costo?",
      options: SERVICIOS.map(function (s) { return { value: s.key, label: s.label }; }),
      expected: cheapestLong.key,
      hint: "Mira la gráfica hacia la derecha: ¿cuál línea queda más abajo al final?",
      correctMessage: "Correcto: " + cheapestLong.label + " es la más barata para paseos largos.",
    });
    var q3 = UI.createRadioQuestion({
      id: "sit4-q3",
      prompt: "¿Qué sucede exactamente en el punto donde se cruzan las funciones?",
      options: [
        { value: "iguales", label: "Las tres opciones cuestan exactamente lo mismo en ese instante" },
        { value: "gratis", label: "El paseo pasa a ser gratuito" },
        { value: "nada", label: "No sucede nada relevante para la comparación" },
      ],
      expected: "iguales",
      hint: "En un punto de intersección, las funciones que se cruzan tienen el mismo valor de x Y el mismo valor de y.",
      correctMessage: "Correcto: en ese punto, todas las funciones que se cruzan allí valen lo mismo.",
    });
    var q4 = UI.createReflectionQuestion({
      id: "sit4-q4",
      prompt: "¿Cómo se justifica esta comparación usando la gráfica y el álgebra AL MISMO TIEMPO?",
      keywords: ["igualar", "grafica", "gráfica", "corte", "intersec", "pendiente", "algebra", "álgebra"],
      hintMessage: "Piensa: la gráfica te muestra visualmente quién va más abajo, y el álgebra (igualar las funciones) te da el valor exacto de x donde eso cambia.",
      goodMessage: "¡Muy bien! Combinaste la lectura visual de la gráfica con el cálculo algebraico de la intersección.",
      minLength: 20,
    });

    [q1x, q1y, q2corto, q2largo, q3, q4].forEach(function (q) {
      strip.appendChild(q.wrapper);
    });

    // El registro verbal no se muestra de entrada: se revela como mensaje de
    // conclusión al presionar este botón, para no darle la interpretación
    // hecha al estudiante antes de que explore gráfica/tabla/álgebra.
    var conclusionBox = UI.el("div", { id: "sit4-conclusion", class: "conclusion-box", "aria-live": "polite" });
    conclusionBox.hidden = true;
    var conclusionBtn = UI.el("button", { type: "button", class: "conclusion-btn" }, [
      document.createTextNode("Ver conclusiones"),
    ]);
    conclusionBtn.addEventListener("click", function () {
      conclusionBox.hidden = !conclusionBox.hidden;
      conclusionBtn.textContent = conclusionBox.hidden ? "Ver conclusiones" : "Ocultar conclusiones";
    });
    strip.appendChild(conclusionBtn);
    strip.appendChild(conclusionBox);

    var exportBtn = UI.el("button", { type: "button", class: "export-btn" }, [
      document.createTextNode("Descargar resumen de la Situación 4"),
    ]);
    exportBtn.addEventListener("click", exportarResumen);
    strip.appendChild(exportBtn);

    layout.appendChild(strip);

    questionWidgets = { q1x: q1x, q1y: q1y, q2corto: q2corto, q2largo: q2largo, q3: q3, q4: q4 };

    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarGrafica();
    actualizarTabla();
    actualizarAlgebraico();
    actualizarVerbal();
  }

  function actualizarGrafica() {
    var xs = MathUtils.range(0, MAX_HORAS_DOMINIO, 0.5);
    var traces = SERVICIOS.map(function (s) {
      return {
        x: xs,
        y: xs.map(function (x) { return s.fn.evaluate(x); }),
        mode: "lines",
        name: s.label,
        line: { color: s.color, width: 3 },
      };
    });

    if (puntoComun) {
      traces.push({
        x: [puntoComun.x],
        y: [puntoComun.y],
        mode: "markers+text",
        name: "Punto de encuentro",
        text: ["(" + MathUtils.formatNumber(puntoComun.x) + ", " + MathUtils.formatCOP(puntoComun.y) + ")"],
        textposition: "top center",
        marker: { color: "#0f172a", size: 12, symbol: "diamond" },
      });
    } else {
      intersecciones.forEach(function (item) {
        if (!item.punto) return;
        traces.push({
          x: [item.punto.x],
          y: [item.punto.y],
          mode: "markers",
          name: item.par,
          marker: { color: "#0f172a", size: 9, symbol: "diamond" },
        });
      });
    }

    var cheapestNow = cheapestAt(xExplora);
    SERVICIOS.forEach(function (s) {
      traces.push({
        x: [xExplora],
        y: [s.fn.evaluate(xExplora)],
        mode: "markers",
        showlegend: false,
        marker: {
          color: s.color,
          size: s.key === cheapestNow.key ? 15 : 9,
          symbol: s.key === cheapestNow.key ? "star" : "circle",
          line: { width: s.key === cheapestNow.key ? 2 : 0, color: "#0f172a" },
        },
      });
    });

    UI.drawPlot(document.getElementById("sit4-plot"), traces, {
      title: "Comparación de las tres tarifas",
      xaxis: { title: "Horas (x)" },
      yaxis: { title: "Costo total (COP)" },
    });
  }

  function actualizarTabla() {
    var xs = MathUtils.range(0, MAX_HORAS_DOMINIO, 1);
    var rows = xs.map(function (x) {
      var cheapest = cheapestAt(x);
      return {
        horas: x,
        brisa: MathUtils.formatCOP(fnBrisa.evaluate(x)),
        costa: MathUtils.formatCOP(fnCosta.evaluate(x)),
        mar: MathUtils.formatCOP(fnMar.evaluate(x)),
        masEconomico: cheapest.label,
        _x: x,
      };
    });
    UI.renderTable(
      document.getElementById("sit4-table"),
      [
        { key: "horas", label: "Horas (x)" },
        { key: "brisa", label: "Brisa B(x)" },
        { key: "costa", label: "Costa Azul C(x)" },
        { key: "mar", label: "Mar Azul M(x)" },
        { key: "masEconomico", label: "Más económico" },
      ],
      rows,
      function (row) {
        return row._x === Math.round(xExplora) ? "row--current" : "";
      }
    );
  }

  function actualizarAlgebraico() {
    document.getElementById("sit4-alg-b").textContent = "B(x) = " + MathUtils.formatCOP(TARIFA_BRISA_HORA) + " · x";
    document.getElementById("sit4-alg-c").textContent =
      "C(x) = " + MathUtils.formatCOP(TARIFA_COSTA_ZARPE) + " + " + MathUtils.formatCOP(TARIFA_COSTA_HORA) + " · x";
    document.getElementById("sit4-alg-m").textContent =
      "M(x) = " + MathUtils.formatCOP(TARIFA_MAR_ZARPE) + " + " + MathUtils.formatCOP(TARIFA_MAR_HORA) + " · x";

    var interText;
    if (puntoComun) {
      interText =
        "Las tres parejas de funciones se cruzan en el MISMO punto: x = " + MathUtils.formatNumber(puntoComun.x) +
        ", costo = " + MathUtils.formatCOP(puntoComun.y) + ".";
    } else {
      interText = intersecciones
        .map(function (item) {
          return item.punto
            ? item.par + ": x = " + MathUtils.formatNumber(item.punto.x) + ", costo = " + MathUtils.formatCOP(item.punto.y)
            : item.par + ": rectas paralelas, no se cruzan.";
        })
        .join(" | ");
    }
    document.getElementById("sit4-alg-inter").textContent = interText;
  }

  function actualizarVerbal() {
    var cheapest = cheapestAt(xExplora);
    document.getElementById("sit4-cheapest-now").textContent =
      cheapest.label + " (" + MathUtils.formatCOP(cheapest.y) + ")";

    var texto =
      "Con x = " + MathUtils.formatNumber(xExplora) + " horas, el servicio más económico es " + cheapest.label +
      ", con un costo de " + MathUtils.formatCOP(cheapest.y) + ". " +
      (puntoComun
        ? "Recuerda que las tres alternativas cuestan lo mismo justo en x = " + MathUtils.formatNumber(puntoComun.x) + "."
        : "") +
      " Para paseos cortos conviene " + cheapestShort.label + ", y para paseos largos conviene " + cheapestLong.label +
      ": ninguna opción es la más barata para todo el rango de horas.";
    document.getElementById("sit4-conclusion").textContent = texto;
  }

  function exportarResumen() {
    var payload = {
      parametros: { xExplorado: xExplora },
      servicioMasEconomicoAhora: cheapestAt(xExplora),
      intersecciones: intersecciones,
      puntoComun: puntoComun,
      respuestas: {
        pregunta1_interseccionX: questionWidgets.q1x.getState(),
        pregunta1_interseccionY: questionWidgets.q1y.getState(),
        pregunta2_masBarataCorto: questionWidgets.q2corto.getState(),
        pregunta2_masBarataLargo: questionWidgets.q2largo.getState(),
        pregunta3_queSucedeEnInterseccion: questionWidgets.q3.getState(),
        pregunta4_justificacion: questionWidgets.q4.getState(),
      },
    };
    ExportUtils.downloadJSON(
      "bahia-recta-situacion4.json",
      ExportUtils.buildSummary("situacion4", "Tres opciones para el paseo", payload)
    );
  }

  function destroy() {
    questionWidgets = {};
  }

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.situacion4 = {
    meta: {
      number: 4,
      title: "Tres opciones para el paseo",
      objective: "Comparar tres funciones lineales/afines simultáneamente e identificar intervalos de conveniencia.",
    },
    init: render,
    destroy: destroy,
  };
})();
