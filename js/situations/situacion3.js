/**
 * situacion3.js — El presupuesto del paseo
 *
 * Yate Costa Azul:      C(x) = 50000 + 20000x
 * Presupuesto máximo:   $200.000
 * La ecuación 50000 + 20000x = 200000 da x = 7.5, pero en un contexto real
 * solo se pueden contratar HORAS COMPLETAS: hay que usar el PISO (floor),
 * nunca un redondeo, porque redondear a 8 horas se pasaría del presupuesto.
 *
 * Docentes: para adaptar tarifas o presupuesto, modificar SOLO las
 * constantes de abajo.
 */
(function () {
  "use strict";

  // ---- Constantes del modelo ----
  var TARIFA_ZARPE = 50000;
  var TARIFA_HORA = 20000;
  var PRESUPUESTO_MAX = 200000;
  var MAX_HORAS_DOMINIO = 12; // hasta dónde se explora la gráfica/tabla
  var HORAS_INICIALES = 5;

  var MathUtils = window.BahiaRecta.MathUtils;
  var Validation = window.BahiaRecta.Validation;
  var UI = window.BahiaRecta.UI;
  var ExportUtils = window.BahiaRecta.ExportUtils;

  var fnCosta = MathUtils.linearFunction(TARIFA_HORA, TARIFA_ZARPE);
  // Solución algebraica exacta de 50000 + 20000x = 200000
  var solucionAlgebraica = MathUtils.intersectionX(
    fnCosta,
    MathUtils.linearFunction(0, PRESUPUESTO_MAX)
  );
  var maxHorasCompletas = MathUtils.floorSafe(solucionAlgebraica); // 7
  var costoConMaxHoras = fnCosta.evaluate(maxHorasCompletas); // 190000
  var sobranteConMaxHoras = PRESUPUESTO_MAX - costoConMaxHoras; // 10000

  var horasActuales = HORAS_INICIALES;
  var questionWidgets = {};

  function render(container) {
    container.innerHTML = "";

    container.appendChild(
      UI.el("p", {
        class: "situation-panel__intro",
        text:
          "El grupo tiene un presupuesto máximo de " + MathUtils.formatCOP(PRESUPUESTO_MAX) +
          " para el paseo en el Yate Costa Azul. Prueba distintas cantidades de horas COMPLETAS " +
          "contratadas y descubre hasta dónde alcanza el presupuesto.",
      })
    );

    var layout = UI.el("div", { class: "situation-layout" });

    var controls = UI.el("aside", { class: "controls-panel", "aria-label": "Controles del paseo" });
    controls.appendChild(UI.el("h3", { text: "Horas a contratar" }));
    controls.appendChild(
      UI.el("p", { text: "Solo se pueden contratar horas completas (números enteros).", style: "font-size:0.85rem;color:#334155;" })
    );

    var errorBox = UI.el("div", { class: "error-message", role: "alert" });
    errorBox.hidden = true;

    var hoursControl = UI.createSyncedRangeNumber({
      id: "sit3-horas",
      label: "Horas contratadas (enteras)",
      min: 0,
      max: MAX_HORAS_DOMINIO,
      step: 1,
      value: horasActuales,
      onChange: function (value) {
        var result = Validation.validateHours(value, { max: MAX_HORAS_DOMINIO, integerOnly: true });
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

    var content = UI.el("div", { class: "content-area" });

    var graphBox = UI.el("div", { class: "graph-container" }, [
      UI.el("h3", { text: "Gráfica: costo vs. presupuesto máximo" }),
      UI.el("div", { id: "sit3-plot", class: "plot" }),
    ]);
    content.appendChild(graphBox);

    var tableBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Tabla de valores" }),
      UI.el("div", { id: "sit3-table" }),
    ]);
    content.appendChild(tableBox);

    var algebraicBox = UI.el("div", { class: "algebraic-box" }, [
      UI.el("h3", { text: "Registro algebraico" }),
      UI.el("p", { id: "sit3-alg-1", class: "algebraic-expression" }),
      UI.el("p", { id: "sit3-alg-2", class: "algebraic-expression" }),
    ]);
    content.appendChild(algebraicBox);

    layout.appendChild(content);
    container.appendChild(layout);

    var strip = UI.el("section", { class: "challenge-strip", "aria-label": "Preguntas guía" });
    strip.appendChild(UI.el("h3", { text: "Reto: resuelve la ecuación del presupuesto" }));

    var q1 = UI.createNumericQuestion({
      id: "sit3-q1",
      prompt: "¿Cuál es la solución de la ecuación 50.000 + 20.000x = 200.000?",
      suffix: "horas",
      expected: solucionAlgebraica,
      tolerance: 0.05,
      hint: "Resta 50.000 en ambos lados y luego divide entre 20.000.",
      correctMessage: "Correcto: x = " + MathUtils.formatNumber(solucionAlgebraica) + " horas.",
    });
    var q2 = UI.createRadioQuestion({
      id: "sit3-q2",
      prompt: "¿Qué significa esa solución en el contexto del problema?",
      options: [
        { value: "literal", label: "Que se pueden contratar exactamente 7 horas y media, sin ningún problema" },
        {
          value: "contexto",
          label: "Que matemáticamente el presupuesto alcanza para 7.5 horas, pero en la práctica solo se contratan horas completas",
        },
        { value: "nada", label: "Que el presupuesto no alcanza para ninguna hora de paseo" },
      ],
      expected: "contexto",
      hint: "Piensa si un servicio turístico suele vender medias horas sueltas.",
      correctMessage: "Correcto: la solución algebraica es 7.5, pero el contexto exige horas completas.",
    });
    var q3 = UI.createNumericQuestion({
      id: "sit3-q3",
      prompt: "¿Cuál es el número MÁXIMO de horas completas que puede contratar el grupo?",
      suffix: "horas",
      expected: maxHorasCompletas,
      tolerance: 0.01,
      hint: "Toma el piso (floor) de la solución algebraica, no la redondees hacia arriba.",
      correctMessage: "Correcto: " + maxHorasCompletas + " horas completas.",
    });
    var q4 = UI.createNumericQuestion({
      id: "sit3-q4",
      prompt: "¿Cuánto gastaría el grupo contratando ese número máximo de horas completas?",
      suffix: "pesos",
      expected: costoConMaxHoras,
      tolerance: 1,
      hint: "Evalúa C(x) con x = " + maxHorasCompletas + ".",
      correctMessage: "Correcto: gastarían " + MathUtils.formatCOP(costoConMaxHoras) + ".",
    });
    var q5 = UI.createNumericQuestion({
      id: "sit3-q5",
      prompt: "¿Cuánto le sobraría del presupuesto?",
      suffix: "pesos",
      expected: sobranteConMaxHoras,
      tolerance: 1,
      hint: "Resta el costo gastado al presupuesto máximo de " + MathUtils.formatCOP(PRESUPUESTO_MAX) + ".",
      correctMessage: "Correcto: sobrarían " + MathUtils.formatCOP(sobranteConMaxHoras) + ".",
    });

    [q1, q2, q3, q4, q5].forEach(function (q) {
      strip.appendChild(q.wrapper);
    });

    // El registro verbal no se muestra de entrada: se revela como mensaje de
    // conclusión al presionar este botón, para no darle la interpretación
    // hecha al estudiante antes de que explore gráfica/tabla/álgebra.
    var conclusionBox = UI.el("div", { id: "sit3-conclusion", class: "conclusion-box", "aria-live": "polite" });
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
      document.createTextNode("Descargar resumen de la Situación 3"),
    ]);
    exportBtn.addEventListener("click", exportarResumen);
    strip.appendChild(exportBtn);

    layout.appendChild(strip);

    questionWidgets = { q1: q1, q2: q2, q3: q3, q4: q4, q5: q5 };

    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarGrafica();
    actualizarTabla();
    actualizarAlgebraico();
    actualizarVerbal();
  }

  function actualizarGrafica() {
    var xs = MathUtils.range(0, MAX_HORAS_DOMINIO, 1);
    var costoY = xs.map(function (x) { return fnCosta.evaluate(x); });
    var presupuestoY = xs.map(function () { return PRESUPUESTO_MAX; });
    var costoActual = fnCosta.evaluate(horasActuales);
    var dentroPresupuesto = costoActual <= PRESUPUESTO_MAX;

    var traces = [
      {
        x: xs,
        y: costoY,
        mode: "lines+markers",
        name: "Costo C(x)",
        line: { color: "#0284c7", width: 3 },
      },
      {
        x: xs,
        y: presupuestoY,
        mode: "lines",
        name: "Presupuesto máximo",
        line: { color: "#b91c1c", width: 2, dash: "dash" },
      },
      {
        x: [solucionAlgebraica],
        y: [PRESUPUESTO_MAX],
        mode: "markers+text",
        name: "Solución algebraica (7.5)",
        text: ["x = " + MathUtils.formatNumber(solucionAlgebraica) + " (no entera)"],
        textposition: "bottom center",
        marker: { color: "#15803d", size: 11, symbol: "diamond" },
      },
      {
        x: [horasActuales],
        y: [costoActual],
        mode: "markers",
        name: "Horas elegidas",
        marker: {
          color: dentroPresupuesto ? "#15803d" : "#b91c1c",
          size: 13,
          symbol: "circle",
        },
      },
    ];

    UI.drawPlot(document.getElementById("sit3-plot"), traces, {
      title: "Costo del paseo vs. presupuesto disponible",
      xaxis: { title: "Horas completas (x)" },
      yaxis: { title: "Costo (COP)" },
    });
  }

  function actualizarTabla() {
    var xs = MathUtils.range(0, MAX_HORAS_DOMINIO, 1);
    var rows = xs.map(function (x) {
      var costo = fnCosta.evaluate(x);
      var dentro = costo <= PRESUPUESTO_MAX;
      return {
        horas: x,
        costo: MathUtils.formatCOP(costo),
        dentro: dentro ? "Sí" : "No",
        sobrante: dentro ? MathUtils.formatCOP(PRESUPUESTO_MAX - costo) : "Excede en " + MathUtils.formatCOP(costo - PRESUPUESTO_MAX),
        _x: x,
        _dentro: dentro,
      };
    });
    UI.renderTable(
      document.getElementById("sit3-table"),
      [
        { key: "horas", label: "Horas (x)" },
        { key: "costo", label: "Costo C(x)" },
        { key: "dentro", label: "¿Dentro del presupuesto?" },
        { key: "sobrante", label: "Sobrante / Excedente" },
      ],
      rows,
      function (row) {
        if (row._x === horasActuales) return "row--current";
        if (row._x === maxHorasCompletas) return "row--highlight";
        return row._dentro ? "" : "row--over";
      }
    );
  }

  function actualizarAlgebraico() {
    document.getElementById("sit3-alg-1").textContent =
      TARIFA_ZARPE.toLocaleString("es-CO") + " + " + TARIFA_HORA.toLocaleString("es-CO") + "x = " + PRESUPUESTO_MAX.toLocaleString("es-CO");
    document.getElementById("sit3-alg-2").textContent =
      "x = (" + PRESUPUESTO_MAX.toLocaleString("es-CO") + " - " + TARIFA_ZARPE.toLocaleString("es-CO") + ") / " +
      TARIFA_HORA.toLocaleString("es-CO") + " = " + MathUtils.formatNumber(solucionAlgebraica) +
      "  →  piso = " + maxHorasCompletas + " horas completas";
  }

  function actualizarVerbal() {
    var costoActual = fnCosta.evaluate(horasActuales);
    var dentro = costoActual <= PRESUPUESTO_MAX;
    var texto;
    if (dentro) {
      texto =
        "Contratando " + horasActuales + " horas completas, el costo es " + MathUtils.formatCOP(costoActual) +
        ", que SÍ entra dentro del presupuesto de " + MathUtils.formatCOP(PRESUPUESTO_MAX) +
        ". Sobrarían " + MathUtils.formatCOP(PRESUPUESTO_MAX - costoActual) + ".";
    } else {
      texto =
        "Contratando " + horasActuales + " horas completas, el costo sería " + MathUtils.formatCOP(costoActual) +
        ", que EXCEDE el presupuesto de " + MathUtils.formatCOP(PRESUPUESTO_MAX) + " en " +
        MathUtils.formatCOP(costoActual - PRESUPUESTO_MAX) + ". El máximo posible sin pasarse es " +
        maxHorasCompletas + " horas.";
    }
    document.getElementById("sit3-conclusion").textContent = texto;
  }

  function exportarResumen() {
    var payload = {
      parametros: { horasElegidas: horasActuales },
      solucionAlgebraica: solucionAlgebraica,
      maxHorasCompletas: maxHorasCompletas,
      costoConMaxHoras: costoConMaxHoras,
      sobranteConMaxHoras: sobranteConMaxHoras,
      costoConHorasElegidas: fnCosta.evaluate(horasActuales),
      respuestas: {
        pregunta1_solucionEcuacion: questionWidgets.q1.getState(),
        pregunta2_interpretacion: questionWidgets.q2.getState(),
        pregunta3_maxHorasCompletas: questionWidgets.q3.getState(),
        pregunta4_costoConMaxHoras: questionWidgets.q4.getState(),
        pregunta5_sobrante: questionWidgets.q5.getState(),
      },
    };
    ExportUtils.downloadJSON(
      "bahia-recta-situacion3.json",
      ExportUtils.buildSummary("situacion3", "El presupuesto del paseo", payload)
    );
  }

  function destroy() {
    questionWidgets = {};
  }

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.situacion3 = {
    meta: {
      number: 3,
      title: "El presupuesto del paseo",
      objective: "Resolver una ecuación lineal en contexto y aplicar el piso (floor) para horas completas.",
    },
    init: render,
    destroy: destroy,
  };
})();
