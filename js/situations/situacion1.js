/**
 * situacion1.js — Comparación de tarifas: ¿cuál tiene menor costo?
 *
 * Lancha Brisa (función lineal):   B(x) = 30000x
 * Yate Costa Azul (función afín):  C(x) = 50000 + 20000x
 * x = horas de recorrido, resultado = costo total en pesos colombianos.
 *
 * Docentes: para adaptar tarifas, modificar SOLO las constantes de abajo.
 */
(function () {
  "use strict";

  // ---- Constantes del modelo (editar aquí para cambiar tarifas) ----
  var TARIFA_BRISA_HORA = 30000; // pendiente de B(x)
  var TARIFA_COSTA_ZARPE = 50000; // intercepto de C(x)
  var TARIFA_COSTA_HORA = 20000; // pendiente de C(x)
  var MAX_HORAS = 10; // dominio máximo mostrado en gráfica/tabla
  var HORAS_INICIALES = 3;

  var MathUtils = window.BahiaRecta.MathUtils;
  var Validation = window.BahiaRecta.Validation;
  var UI = window.BahiaRecta.UI;
  var ExportUtils = window.BahiaRecta.ExportUtils;

  var fnBrisa = MathUtils.linearFunction(TARIFA_BRISA_HORA, 0);
  var fnCosta = MathUtils.linearFunction(TARIFA_COSTA_HORA, TARIFA_COSTA_ZARPE);
  var interseccion = MathUtils.intersectionPoint(fnBrisa, fnCosta); // {x:5, y:150000}

  var refs = {}; // referencias DOM vivas de esta instancia
  var horasActuales = HORAS_INICIALES;
  var questionWidgets = {};

  function render(container) {
    container.innerHTML = "";

    container.appendChild(
      UI.el("p", {
        class: "situation-panel__intro",
        text:
          "Dos servicios te llevan a recorrer la bahía: la Lancha Brisa cobra solo por hora, y el Yate " +
          "Costa Azul cobra una tarifa fija de zarpe más un valor por hora. Ajusta las horas del paseo y " +
          "observa cuándo conviene cada uno.",
      })
    );

    var layout = UI.el("div", { class: "situation-layout" });

    // ---------- Panel de controles ----------
    var controls = UI.el("aside", { class: "controls-panel", "aria-label": "Controles del paseo" });
    controls.appendChild(UI.el("h3", { text: "Duración del paseo" }));

    var errorBox = UI.el("div", { class: "error-message", role: "alert" });
    errorBox.hidden = true;

    var hoursControl = UI.createSyncedRangeNumber({
      id: "sit1-horas",
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
    controls.appendChild(errorBox);

    layout.appendChild(controls);

    // ---------- Área de contenido ----------
    var content = UI.el("div", { class: "content-area" });

    var graphBox = UI.el("div", { class: "graph-container" }, [
      UI.el("h3", { text: "Gráfica: costo total según las horas" }),
      UI.el("div", { id: "sit1-plot", class: "plot" }),
    ]);
    content.appendChild(graphBox);

    var tableBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Tabla de valores (registro tabular)" }),
      UI.el("div", { id: "sit1-table" }),
    ]);
    content.appendChild(tableBox);

    var algebraicBox = UI.el("div", { class: "algebraic-box" }, [
      UI.el("h3", { text: "Registro algebraico" }),
      UI.el("p", { id: "sit1-alg-brisa", class: "algebraic-expression" }),
      UI.el("p", { id: "sit1-alg-costa", class: "algebraic-expression" }),
    ]);
    content.appendChild(algebraicBox);

    layout.appendChild(content);
    container.appendChild(layout);

    // ---------- Franja de reto ----------
    var strip = UI.el("section", { class: "challenge-strip", "aria-label": "Preguntas guía" });
    strip.appendChild(UI.el("h3", { text: "Reto: interpreta pendiente, intercepto e intersección" }));

    var q1 = UI.createNumericQuestion({
      id: "sit1-q1",
      prompt: "¿Después de cuántas horas los dos servicios tienen el mismo costo?",
      suffix: "horas",
      expected: interseccion.x,
      tolerance: 0.1,
      hint: "Iguala las dos funciones: 30.000x = 50.000 + 20.000x, y despeja x.",
      correctMessage: "¡Correcto! A las " + MathUtils.formatNumber(interseccion.x) + " horas ambos cuestan " + MathUtils.formatCOP(interseccion.y) + ".",
    });
    var q2 = UI.createRadioQuestion({
      id: "sit1-q2",
      prompt: "¿Cuál servicio tiene menor costo si el paseo dura MENOS tiempo que el punto de intersección?",
      options: [
        { value: "brisa", label: "Lancha Brisa" },
        { value: "costa", label: "Yate Costa Azul" },
      ],
      expected: "brisa",
      hint: "Mira la gráfica antes de la intersección: ¿qué línea está más abajo?",
      correctMessage: "Correcto: antes de la intersección, Brisa (sin tarifa fija) es más barata.",
    });
    var q3 = UI.createRadioQuestion({
      id: "sit1-q3",
      prompt: "¿Cuál servicio tiene menor costo si el paseo dura MÁS tiempo que el punto de intersección?",
      options: [
        { value: "brisa", label: "Lancha Brisa" },
        { value: "costa", label: "Yate Costa Azul" },
      ],
      expected: "costa",
      hint: "Mira la gráfica después de la intersección: ¿qué línea quedó más abajo ahora?",
      correctMessage: "Correcto: después de la intersección, la pendiente menor de Costa Azul la hace más barata.",
    });

    strip.appendChild(q1.wrapper);
    strip.appendChild(q2.wrapper);
    strip.appendChild(q3.wrapper);

    // El registro verbal no se muestra de entrada: se revela como mensaje de
    // conclusión al presionar este botón, para no darle la interpretación
    // hecha al estudiante antes de que explore gráfica/tabla/álgebra.
    var conclusionBox = UI.el("div", { id: "sit1-conclusion", class: "conclusion-box", "aria-live": "polite" });
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
      document.createTextNode("Descargar resumen de la Situación 1"),
    ]);
    exportBtn.addEventListener("click", exportarResumen);
    strip.appendChild(exportBtn);

    layout.appendChild(strip);

    questionWidgets = { q1: q1, q2: q2, q3: q3 };
    refs = { errorBox: errorBox, hoursControl: hoursControl };

    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarGrafica();
    actualizarTabla();
    actualizarAlgebraico();
    actualizarVerbal();
  }

  function actualizarGrafica() {
    var xs = MathUtils.range(0, MAX_HORAS, 0.5);
    var brisaData = MathUtils.generateTableData(fnBrisa, xs);
    var costaData = MathUtils.generateTableData(fnCosta, xs);

    var traces = [
      {
        x: xs,
        y: brisaData.map(function (p) { return p.y; }),
        mode: "lines",
        name: "Lancha Brisa",
        line: { color: "#0284c7", width: 3 },
      },
      {
        x: xs,
        y: costaData.map(function (p) { return p.y; }),
        mode: "lines",
        name: "Yate Costa Azul",
        line: { color: "#ea580c", width: 3 },
      },
      {
        x: [interseccion.x],
        y: [interseccion.y],
        mode: "markers+text",
        name: "Intersección",
        text: ["(" + MathUtils.formatNumber(interseccion.x) + ", " + MathUtils.formatCOP(interseccion.y) + ")"],
        textposition: "top center",
        marker: { color: "#15803d", size: 11, symbol: "diamond" },
      },
      {
        x: [horasActuales],
        y: [fnBrisa.evaluate(horasActuales)],
        mode: "markers",
        name: "Brisa (actual)",
        marker: { color: "#0284c7", size: 10, symbol: "circle-open", line: { width: 3 } },
        showlegend: false,
      },
      {
        x: [horasActuales],
        y: [fnCosta.evaluate(horasActuales)],
        mode: "markers",
        name: "Costa Azul (actual)",
        marker: { color: "#ea580c", size: 10, symbol: "circle-open", line: { width: 3 } },
        showlegend: false,
      },
    ];

    UI.drawPlot(document.getElementById("sit1-plot"), traces, {
      title: "Costo total vs. horas de recorrido",
      xaxis: { title: "Horas (x)" },
      yaxis: { title: "Costo total (COP)" },
    });
  }

  function actualizarTabla() {
    var xs = MathUtils.range(0, MAX_HORAS, 1);
    var rows = xs.map(function (x) {
      return {
        horas: MathUtils.formatNumber(x),
        brisa: MathUtils.formatCOP(fnBrisa.evaluate(x)),
        costa: MathUtils.formatCOP(fnCosta.evaluate(x)),
        _x: x,
      };
    });
    UI.renderTable(
      document.getElementById("sit1-table"),
      [
        { key: "horas", label: "Horas (x)" },
        { key: "brisa", label: "Lancha Brisa B(x)" },
        { key: "costa", label: "Yate Costa Azul C(x)" },
      ],
      rows,
      function (row) {
        if (Math.abs(row._x - interseccion.x) < 0.6) return "row--highlight";
        if (Math.round(row._x) === Math.round(horasActuales)) return "row--current";
        return "";
      }
    );
  }

  function actualizarAlgebraico() {
    document.getElementById("sit1-alg-brisa").textContent =
      "B(x) = " + MathUtils.formatCOP(TARIFA_BRISA_HORA) + " · x";
    document.getElementById("sit1-alg-costa").textContent =
      "C(x) = " + MathUtils.formatCOP(TARIFA_COSTA_ZARPE) + " + " + MathUtils.formatCOP(TARIFA_COSTA_HORA) + " · x";
  }

  function actualizarVerbal() {
    var costoBrisa = fnBrisa.evaluate(horasActuales);
    var costoCosta = fnCosta.evaluate(horasActuales);
    var texto;
    if (Math.abs(horasActuales - interseccion.x) < 0.05) {
      texto =
        "Con " + MathUtils.formatNumber(horasActuales) + " horas, ambos servicios cuestan exactamente " +
        MathUtils.formatCOP(costoBrisa) + ": llegaste justo al punto de intersección.";
    } else if (horasActuales < interseccion.x) {
      texto =
        "Con " + MathUtils.formatNumber(horasActuales) + " horas, Lancha Brisa cuesta " + MathUtils.formatCOP(costoBrisa) +
        " y Yate Costa Azul cuesta " + MathUtils.formatCOP(costoCosta) +
        ". Como todavía no llegas a las " + MathUtils.formatNumber(interseccion.x) +
        " horas de equilibrio, Brisa (sin tarifa fija) es la opción más económica.";
    } else {
      texto =
        "Con " + MathUtils.formatNumber(horasActuales) + " horas, Lancha Brisa cuesta " + MathUtils.formatCOP(costoBrisa) +
        " y Yate Costa Azul cuesta " + MathUtils.formatCOP(costoCosta) +
        ". Como ya superaste las " + MathUtils.formatNumber(interseccion.x) +
        " horas de equilibrio, la menor pendiente de Costa Azul la hace más económica.";
    }
    document.getElementById("sit1-conclusion").textContent = texto;
  }

  function exportarResumen() {
    var payload = {
      parametros: { horas: horasActuales },
      costos: {
        brisa: fnBrisa.evaluate(horasActuales),
        costaAzul: fnCosta.evaluate(horasActuales),
      },
      interseccion: interseccion,
      respuestas: {
        pregunta1_horasEquilibrio: questionWidgets.q1.getState(),
        pregunta2_menorCostoAntes: questionWidgets.q2.getState(),
        pregunta3_menorCostoDespues: questionWidgets.q3.getState(),
      },
    };
    ExportUtils.downloadJSON(
      "bahia-recta-situacion1.json",
      ExportUtils.buildSummary("situacion1", "Comparación de tarifas", payload)
    );
  }

  function destroy() {
    refs = {};
    questionWidgets = {};
  }

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.situacion1 = {
    meta: {
      number: 1,
      title: "Comparación de tarifas: ¿cuál tiene menor costo?",
      objective: "Interpretar pendiente, intercepto y punto de intersección de una función lineal y una afín.",
    },
    init: render,
    destroy: destroy,
  };
})();
