/**
 * situacion2.js — El costo del paseo entre amigos
 *
 * Yate Costa Azul (costo total):  C(x) = 50000 + 20000x
 * Costo por persona:              P(x) = C(x) / n = (20000/n)x + (50000/n)
 * x = horas, n = número de personas del grupo.
 *
 * Docentes: para adaptar tarifas, modificar SOLO las constantes de abajo.
 */
(function () {
  "use strict";

  // ---- Constantes del modelo ----
  var TARIFA_ZARPE = 50000; // intercepto de C(x)
  var TARIFA_HORA = 20000; // pendiente de C(x)
  var MAX_HORAS = 10;
  var HORAS_INICIALES = 4;
  var PERSONAS_INICIALES = 4;
  var PERSONAS_PRESET = [2, 4, 5, 10]; // valores mínimos a explorar según el spec pedagógico

  var MathUtils = window.BahiaRecta.MathUtils;
  var Validation = window.BahiaRecta.Validation;
  var UI = window.BahiaRecta.UI;
  var ExportUtils = window.BahiaRecta.ExportUtils;

  var fnTotal = MathUtils.linearFunction(TARIFA_HORA, TARIFA_ZARPE);

  var horasActuales = HORAS_INICIALES;
  var personasActuales = PERSONAS_INICIALES;
  var questionWidgets = {};
  var presetWidget = null;

  function personaFn(n) {
    return MathUtils.linearFunction(TARIFA_HORA / n, TARIFA_ZARPE / n);
  }

  function render(container) {
    container.innerHTML = "";

    container.appendChild(
      UI.el("p", {
        class: "situation-panel__intro",
        text:
          "Un grupo de amigos contrata el Yate Costa Azul y quiere repartir el costo total en partes " +
          "iguales. Cambia las horas del paseo y el número de personas del grupo, y observa cómo cambia " +
          "el costo por persona.",
      })
    );

    var layout = UI.el("div", { class: "situation-layout" });

    // ---------- Controles ----------
    var controls = UI.el("aside", { class: "controls-panel", "aria-label": "Controles del paseo" });
    controls.appendChild(UI.el("h3", { text: "Parámetros del paseo" }));

    var errorBox = UI.el("div", { class: "error-message", role: "alert" });
    errorBox.hidden = true;

    var hoursControl = UI.createSyncedRangeNumber({
      id: "sit2-horas",
      label: "Horas de recorrido",
      min: 0,
      max: MAX_HORAS,
      step: 0.5,
      value: horasActuales,
      onChange: function (value) {
        var result = Validation.validateHours(value, { max: MAX_HORAS });
        if (!result.valid) {
          UI.setError(errorBox, result.message);
          return;
        }
        UI.setError(errorBox, "");
        horasActuales = result.value;
        actualizarTodo();
      },
    });
    controls.appendChild(hoursControl.wrapper);

    var peopleControl = UI.createSyncedRangeNumber({
      id: "sit2-personas",
      label: "Número de personas del grupo",
      min: 1,
      max: 15,
      step: 1,
      value: personasActuales,
      onChange: function (value) {
        var result = Validation.validatePeople(value, { max: 15 });
        if (!result.valid) {
          UI.setError(errorBox, result.message);
          return;
        }
        UI.setError(errorBox, "");
        personasActuales = result.value;
        if (presetWidget) presetWidget.syncActive(personasActuales);
        actualizarTodo();
      },
    });
    controls.appendChild(peopleControl.wrapper);

    presetWidget = UI.createPresetButtons({
      label: "Grupos sugeridos para explorar",
      values: PERSONAS_PRESET,
      formatLabel: function (v) {
        return "n = " + v;
      },
      onSelect: function (v) {
        personasActuales = v;
        peopleControl.setValue(v);
        UI.setError(errorBox, "");
        actualizarTodo();
      },
    });
    controls.appendChild(UI.el("p", { text: "Atajos:", style: "margin:0.5rem 0 0.2rem;font-weight:700;font-size:0.85rem;" }));
    controls.appendChild(presetWidget.wrapper);
    controls.appendChild(errorBox);

    layout.appendChild(controls);

    // ---------- Contenido ----------
    var content = UI.el("div", { class: "content-area" });

    var graphBox = UI.el("div", { class: "graph-container" }, [
      UI.el("h3", { text: "Gráfica: costo total y costo por persona" }),
      UI.el("div", { id: "sit2-plot", class: "plot" }),
    ]);
    content.appendChild(graphBox);

    var tableBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Tabla: costo por persona según las horas (n actual)" }),
      UI.el("div", { id: "sit2-table" }),
    ]);
    content.appendChild(tableBox);

    var tableCompareBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Comparación: pendiente e intercepto según el número de personas" }),
      UI.el("div", { id: "sit2-table-compare" }),
    ]);
    content.appendChild(tableCompareBox);

    var algebraicBox = UI.el("div", { class: "algebraic-box" }, [
      UI.el("h3", { text: "Registro algebraico" }),
      UI.el("p", { id: "sit2-alg-total", class: "algebraic-expression" }),
      UI.el("p", { id: "sit2-alg-persona", class: "algebraic-expression" }),
    ]);
    content.appendChild(algebraicBox);

    layout.appendChild(content);
    container.appendChild(layout);

    // ---------- Franja de reto ----------
    var strip = UI.el("section", { class: "challenge-strip", "aria-label": "Preguntas guía" });
    strip.appendChild(UI.el("h3", { text: "Reto: pendiente e intercepto del costo por persona" }));

    var q1 = UI.createReflectionQuestion({
      id: "sit2-q1",
      prompt: "¿Qué representa la pendiente de la función del costo TOTAL, C(x)?",
      keywords: ["hora", "aumenta", "incremento", "sube"],
      hintMessage: "Piensa: ¿qué le pasa al costo total cada vez que se suma UNA hora más de paseo?",
      goodMessage: "¡Bien! La pendiente ($20.000) es cuánto aumenta el costo total por cada hora adicional.",
    });
    var q2 = UI.createReflectionQuestion({
      id: "sit2-q2",
      prompt: "¿Qué representa el intercepto de la función del costo TOTAL, C(x)?",
      keywords: ["zarpe", "fija", "fijo", "base", "salida", "inicial"],
      hintMessage: "Piensa: ¿cuánto se paga aunque el paseo dure 0 horas?",
      goodMessage: "¡Exacto! El intercepto ($50.000) es la tarifa fija de zarpe, se pague o no una sola hora.",
    });
    var q3 = UI.createRadioQuestion({
      id: "sit2-q3",
      prompt: "Al AUMENTAR el número de personas n, ¿qué sucede con la pendiente y el intercepto del costo POR PERSONA?",
      options: [
        { value: "aumentan", label: "Ambas aumentan" },
        { value: "disminuyen", label: "Ambas disminuyen" },
        { value: "igual", label: "Se mantienen igual" },
        { value: "mixto", label: "La pendiente aumenta y el intercepto disminuye" },
      ],
      expected: "disminuyen",
      hint: "Compara las filas de la tabla de comparación: a mayor n, ¿los valores de la columna pendiente e intercepto crecen o se achican?",
      correctMessage: "Correcto: al repartir entre más personas, tanto la pendiente (20.000/n) como el intercepto (50.000/n) disminuyen.",
    });
    var q4 = UI.createRadioQuestion({
      id: "sit2-q4",
      prompt: "¿La función del costo por persona P(x) sigue siendo una función afín?",
      options: [
        { value: "si", label: "Sí, sigue siendo afín" },
        { value: "no", label: "No, deja de ser afín" },
      ],
      expected: "si",
      hint: "Fíjate en la forma de P(x): ¿sigue teniendo la forma m·x + b, aunque m y b cambien de valor?",
      correctMessage: "Correcto: P(x) = (20.000/n)x + (50.000/n) sigue teniendo la forma mx + b, solo cambian los valores de m y b.",
    });

    [q1, q2, q3, q4].forEach(function (q) {
      strip.appendChild(q.wrapper);
    });

    // El registro verbal no se muestra de entrada: se revela como mensaje de
    // conclusión al presionar este botón, para no darle la interpretación
    // hecha al estudiante antes de que explore gráfica/tabla/álgebra.
    var conclusionBox = UI.el("div", { id: "sit2-conclusion", class: "conclusion-box", "aria-live": "polite" });
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
      document.createTextNode("Descargar resumen de la Situación 2"),
    ]);
    exportBtn.addEventListener("click", exportarResumen);
    strip.appendChild(exportBtn);

    layout.appendChild(strip);

    questionWidgets = { q1: q1, q2: q2, q3: q3, q4: q4 };
    presetWidget.syncActive(personasActuales);

    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarGrafica();
    actualizarTabla();
    actualizarTablaComparacion();
    actualizarAlgebraico();
    actualizarVerbal();
  }

  function actualizarGrafica() {
    var xs = MathUtils.range(0, MAX_HORAS, 0.5);
    var fnPersona = personaFn(personasActuales);
    var totalY = xs.map(function (x) { return fnTotal.evaluate(x); });
    var personaY = xs.map(function (x) { return fnPersona.evaluate(x); });

    var traces = [
      {
        x: xs,
        y: totalY,
        mode: "lines",
        name: "Costo total C(x)",
        line: { color: "#0369a1", width: 2, dash: "dot" },
      },
      {
        x: xs,
        y: personaY,
        mode: "lines",
        name: "Costo por persona P(x), n = " + personasActuales,
        line: { color: "#ea580c", width: 3 },
      },
      {
        x: [horasActuales],
        y: [fnPersona.evaluate(horasActuales)],
        mode: "markers+text",
        name: "Valor actual",
        text: [MathUtils.formatCOP(fnPersona.evaluate(horasActuales))],
        textposition: "top center",
        marker: { color: "#15803d", size: 11 },
      },
    ];

    UI.drawPlot(document.getElementById("sit2-plot"), traces, {
      title: "Costo total vs. costo por persona",
      xaxis: { title: "Horas (x)" },
      yaxis: { title: "Costo (COP)" },
    });
  }

  function actualizarTabla() {
    var fnPersona = personaFn(personasActuales);
    var xs = MathUtils.range(0, MAX_HORAS, 1);
    var rows = xs.map(function (x) {
      return {
        horas: MathUtils.formatNumber(x),
        total: MathUtils.formatCOP(fnTotal.evaluate(x)),
        persona: MathUtils.formatCOP(fnPersona.evaluate(x)),
        _x: x,
      };
    });
    UI.renderTable(
      document.getElementById("sit2-table"),
      [
        { key: "horas", label: "Horas (x)" },
        { key: "total", label: "Costo total C(x)" },
        { key: "persona", label: "Costo por persona P(x)" },
      ],
      rows,
      function (row) {
        return Math.round(row._x) === Math.round(horasActuales) ? "row--current" : "";
      }
    );
  }

  function actualizarTablaComparacion() {
    var valores = PERSONAS_PRESET.slice();
    if (valores.indexOf(personasActuales) === -1) valores.push(personasActuales);
    valores.sort(function (a, b) { return a - b; });

    var rows = valores.map(function (n) {
      var fnP = personaFn(n);
      return {
        n: n,
        pendiente: MathUtils.formatCOP(fnP.m),
        intercepto: MathUtils.formatCOP(fnP.b),
        costoActual: MathUtils.formatCOP(fnP.evaluate(horasActuales)),
        _n: n,
      };
    });

    UI.renderTable(
      document.getElementById("sit2-table-compare"),
      [
        { key: "n", label: "n (personas)" },
        { key: "pendiente", label: "Pendiente 20.000/n" },
        { key: "intercepto", label: "Intercepto 50.000/n" },
        { key: "costoActual", label: "Costo/persona a las " + MathUtils.formatNumber(horasActuales) + " h" },
      ],
      rows,
      function (row) {
        return row._n === personasActuales ? "row--highlight" : "";
      }
    );
  }

  function actualizarAlgebraico() {
    var fnPersona = personaFn(personasActuales);
    document.getElementById("sit2-alg-total").textContent =
      "C(x) = " + MathUtils.formatCOP(TARIFA_ZARPE) + " + " + MathUtils.formatCOP(TARIFA_HORA) + " · x";
    document.getElementById("sit2-alg-persona").textContent =
      "P(x) = C(x) / " + personasActuales + " = " + MathUtils.formatCOP(fnPersona.m) + " · x + " + MathUtils.formatCOP(fnPersona.b) +
      "  (n = " + personasActuales + ")";
  }

  function actualizarVerbal() {
    var fnPersona = personaFn(personasActuales);
    var texto =
      "Con " + MathUtils.formatNumber(horasActuales) + " horas y un grupo de " + personasActuales +
      " persona(s), el costo total es " + MathUtils.formatCOP(fnTotal.evaluate(horasActuales)) +
      " y cada persona paga " + MathUtils.formatCOP(fnPersona.evaluate(horasActuales)) +
      ". La pendiente de P(x) es " + MathUtils.formatCOP(fnPersona.m) + " por hora, y el intercepto es " +
      MathUtils.formatCOP(fnPersona.b) + ": ambos valores se achican a medida que el grupo crece, porque la " +
      "misma tarifa se reparte entre más personas.";
    document.getElementById("sit2-conclusion").textContent = texto;
  }

  function exportarResumen() {
    var fnPersona = personaFn(personasActuales);
    var payload = {
      parametros: { horas: horasActuales, personas: personasActuales },
      costoTotal: fnTotal.evaluate(horasActuales),
      costoPorPersona: fnPersona.evaluate(horasActuales),
      pendientePersona: fnPersona.m,
      interceptoPersona: fnPersona.b,
      respuestas: {
        pregunta1_pendienteTotal: questionWidgets.q1.getState(),
        pregunta2_interceptoTotal: questionWidgets.q2.getState(),
        pregunta3_efectoDeN: questionWidgets.q3.getState(),
        pregunta4_sigueSiendoAfin: questionWidgets.q4.getState(),
      },
    };
    ExportUtils.downloadJSON(
      "bahia-recta-situacion2.json",
      ExportUtils.buildSummary("situacion2", "El costo del paseo entre amigos", payload)
    );
  }

  function destroy() {
    questionWidgets = {};
    presetWidget = null;
  }

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.situacion2 = {
    meta: {
      number: 2,
      title: "El costo del paseo entre amigos",
      objective: "Explorar cómo cambian la pendiente y el intercepto de una función afín al dividirla entre n personas.",
    },
    init: render,
    destroy: destroy,
  };
})();
