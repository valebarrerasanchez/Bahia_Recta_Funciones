/**
 * situacion5.js — Descifra la tarifa oculta
 *
 * Se le da al estudiante una tabla de datos SIN la fórmula. La fórmula real
 * es C(x) = 20000x + 50000, pero NUNCA se muestra explícitamente en la UI de
 * entrada: solo se usa internamente (REAL_M / REAL_B) para calificar las
 * respuestas del estudiante y para dibujar puntos de referencia en la
 * gráfica una vez que el estudiante ya respondió.
 *
 * Docentes: si cambian la tabla de datos, deben recalcular manualmente
 * REAL_M y REAL_B (y los 4 puntos de TABLA_DATOS) de forma consistente.
 */
(function () {
  "use strict";

  // ---- Datos dados al estudiante (tabla fija) ----
  var TABLA_DATOS = [
    { x: 1, y: 70000 },
    { x: 2, y: 90000 },
    { x: 4, y: 130000 },
    { x: 6, y: 170000 },
  ];
  // ---- Fórmula real (uso interno SOLAMENTE, no se muestra de entrada) ----
  var REAL_M = 20000;
  var REAL_B = 50000;
  var MAX_HORAS_DOMINIO = 10;
  var X_INTERPOLACION = 3;
  var X_EXTRAPOLACION = 8;

  var MathUtils = window.BahiaRecta.MathUtils;
  var Validation = window.BahiaRecta.Validation;
  var UI = window.BahiaRecta.UI;
  var ExportUtils = window.BahiaRecta.ExportUtils;

  var fnReal = MathUtils.linearFunction(REAL_M, REAL_B);

  var hipotesis = { m: null, b: null }; // lo que el estudiante va construyendo
  var prediccion3 = null; // respuesta del estudiante para x=3
  var prediccion8 = null; // respuesta del estudiante para x=8
  var questionWidgets = {};

  function render(container) {
    container.innerHTML = "";

    container.appendChild(
      UI.el("p", {
        class: "situation-panel__intro",
        text:
          "Un operador turístico nuevo no publicó su fórmula de tarifas, pero sí algunos datos de lo que " +
          "cobró. Analiza la tabla, descubre el patrón y construye la fórmula tú mismo/a.",
      })
    );

    var layout = UI.el("div", { class: "situation-layout" });

    // ---------- Controles: construir la hipótesis m, b ----------
    var controls = UI.el("aside", { class: "controls-panel", "aria-label": "Construye tu hipótesis" });
    controls.appendChild(UI.el("h3", { text: "Tu fórmula hipotética" }));
    controls.appendChild(
      UI.el("p", {
        text: "Escribe aquí los valores de m y b que crees que tiene C(x) = m·x + b. La gráfica se actualiza sola.",
        style: "font-size:0.85rem;color:#334155;",
      })
    );

    var errorBox = UI.el("div", { class: "error-message", role: "alert" });
    errorBox.hidden = true;

    var mGroup = UI.el("div", { class: "control-group" }, [
      UI.el("label", { for: "sit5-m", text: "m (pendiente, $ por hora)" }),
      UI.el("input", { type: "number", id: "sit5-m", step: "any", min: "0" }),
    ]);
    var bGroup = UI.el("div", { class: "control-group" }, [
      UI.el("label", { for: "sit5-b", text: "b (intercepto, $ fijo)" }),
      UI.el("input", { type: "number", id: "sit5-b", step: "any", min: "0" }),
    ]);
    controls.appendChild(mGroup);
    controls.appendChild(bGroup);
    controls.appendChild(errorBox);

    layout.appendChild(controls);

    // ---------- Contenido ----------
    var content = UI.el("div", { class: "content-area" });

    var graphBox = UI.el("div", { class: "graph-container" }, [
      UI.el("h3", { text: "Gráfica: datos conocidos + tu hipótesis" }),
      UI.el("div", { id: "sit5-plot", class: "plot" }),
    ]);
    content.appendChild(graphBox);

    var tableBox = UI.el("div", { class: "table-container" }, [
      UI.el("h3", { text: "Tabla de datos conocidos" }),
      UI.el("div", { id: "sit5-table" }),
    ]);
    content.appendChild(tableBox);

    var algebraicBox = UI.el("div", { class: "algebraic-box" }, [
      UI.el("h3", { text: "Registro algebraico (tu hipótesis)" }),
      UI.el("p", { id: "sit5-alg", class: "algebraic-expression" }),
    ]);
    content.appendChild(algebraicBox);

    layout.appendChild(content);
    container.appendChild(layout);

    // ---------- Franja de reto (pasos guiados) ----------
    var strip = UI.el("section", { class: "challenge-strip", "aria-label": "Reto de descubrimiento" });
    strip.appendChild(UI.el("h3", { text: "Reto: descifra la tarifa paso a paso" }));

    var q1 = UI.createNumericQuestion({
      id: "sit5-q1",
      prompt: "Paso 1: ¿cuánto aumenta el costo por cada hora adicional?",
      suffix: "pesos por hora",
      expected: REAL_M,
      tolerance: 500,
      hint: "Compara dos filas consecutivas de la tabla, por ejemplo x=1 y x=2: ¿cuánto subió el costo?",
      correctMessage: "Correcto: el costo sube de forma constante por cada hora.",
    });
    var q2 = UI.createNumericQuestion({
      id: "sit5-q2",
      prompt: "Paso 2: entonces, ¿cuál es la pendiente (m) de la función?",
      suffix: "",
      expected: REAL_M,
      tolerance: 500,
      hint: "En una función afín, el incremento por unidad de x ES la pendiente.",
      correctMessage: "Correcto: m = " + MathUtils.formatCOP(REAL_M) + ".",
    });
    var q3 = UI.createNumericQuestion({
      id: "sit5-q3",
      prompt: "Paso 3: ¿cuál es el intercepto (b) de la función?",
      suffix: "",
      expected: REAL_B,
      tolerance: 500,
      hint: "Usa un punto conocido, por ejemplo (1, 70.000): 70.000 = m·1 + b. Ya conoces m.",
      correctMessage: "Correcto: b = " + MathUtils.formatCOP(REAL_B) + ".",
    });

    var q5 = UI.createNumericQuestion({
      id: "sit5-q5",
      prompt: "Paso 5 (interpolación): según tu fórmula, ¿cuánto costaría un paseo de " + X_INTERPOLACION + " horas?",
      suffix: "pesos",
      expected: fnReal.evaluate(X_INTERPOLACION),
      tolerance: 1000,
      hint: "Reemplaza x = " + X_INTERPOLACION + " en tu fórmula C(x) = m·x + b.",
      correctMessage: "¡Correcto! Ese valor está DENTRO del rango de la tabla (interpolación).",
      onChange: function (state) {
        prediccion3 = state.answered && !isNaN(state.value) ? Number(state.value) : null;
        if (state.answered) mostrarPaso6();
        actualizarGrafica();
        actualizarTabla();
      },
    });

    var q6Wrapper = UI.el("div", { hidden: "hidden" });
    var q6 = UI.createNumericQuestion({
      id: "sit5-q6",
      prompt: "Paso 6 (extrapolación): según tu fórmula, ¿cuánto costaría un paseo de " + X_EXTRAPOLACION + " horas?",
      suffix: "pesos",
      expected: fnReal.evaluate(X_EXTRAPOLACION),
      tolerance: 1000,
      hint: "Reemplaza x = " + X_EXTRAPOLACION + " en tu fórmula. Fíjate que este valor queda FUERA del rango de la tabla (extrapolación).",
      correctMessage: "¡Correcto! Extrapolaste bien más allá de los datos conocidos.",
      onChange: function (state) {
        prediccion8 = state.answered && !isNaN(state.value) ? Number(state.value) : null;
        actualizarGrafica();
        actualizarTabla();
      },
    });
    q6Wrapper.appendChild(q6.wrapper);

    [q1, q2, q3].forEach(function (q) {
      strip.appendChild(q.wrapper);
    });
    strip.appendChild(q5.wrapper);
    strip.appendChild(q6Wrapper);

    // El registro verbal no se muestra de entrada: se revela como mensaje de
    // conclusión al presionar este botón, para no darle la interpretación
    // hecha al estudiante antes de que explore gráfica/tabla/álgebra. Esto es
    // independiente del revelado escalonado de pasos 1-6 (mostrarPaso6, etc.),
    // que sigue exactamente igual.
    var conclusionBox = UI.el("div", { id: "sit5-conclusion", class: "conclusion-box", "aria-live": "polite" });
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
      document.createTextNode("Descargar resumen de la Situación 5"),
    ]);
    exportBtn.addEventListener("click", exportarResumen);
    strip.appendChild(exportBtn);

    layout.appendChild(strip);

    questionWidgets = { q1: q1, q2: q2, q3: q3, q5: q5, q6: q6 };

    function mostrarPaso6() {
      q6Wrapper.hidden = false;
    }

    // ---------- Listeners de m, b (hipótesis reactiva) ----------
    var mInput = document.getElementById("sit5-m");
    var bInput = document.getElementById("sit5-b");

    function leerHipotesis() {
      var mResult = mInput.value === "" ? null : Validation.validateAmount(mInput.value, { label: "La pendiente m" });
      var bResult = bInput.value === "" ? null : Validation.validateAmount(bInput.value, { label: "El intercepto b" });

      if (mResult && !mResult.valid) {
        UI.setError(errorBox, mResult.message);
        return;
      }
      if (bResult && !bResult.valid) {
        UI.setError(errorBox, bResult.message);
        return;
      }
      UI.setError(errorBox, "");
      hipotesis.m = mResult ? mResult.value : null;
      hipotesis.b = bResult ? bResult.value : null;
      actualizarTodo();
    }

    mInput.addEventListener("input", leerHipotesis);
    bInput.addEventListener("input", leerHipotesis);

    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarGrafica();
    actualizarTabla();
    actualizarAlgebraico();
    actualizarVerbal();
  }

  function actualizarGrafica() {
    var traces = [
      {
        x: TABLA_DATOS.map(function (p) { return p.x; }),
        y: TABLA_DATOS.map(function (p) { return p.y; }),
        mode: "markers",
        name: "Datos conocidos",
        marker: { color: "#0369a1", size: 12, symbol: "square" },
      },
    ];

    if (hipotesis.m !== null && hipotesis.b !== null) {
      var fnHipotesis = MathUtils.linearFunction(hipotesis.m, hipotesis.b);
      var xs = MathUtils.range(0, MAX_HORAS_DOMINIO, 1);
      traces.push({
        x: xs,
        y: xs.map(function (x) { return fnHipotesis.evaluate(x); }),
        mode: "lines",
        name: "Tu hipótesis",
        line: { color: "#ea580c", width: 3 },
      });
    }

    if (prediccion3 !== null) {
      traces.push({
        x: [X_INTERPOLACION],
        y: [prediccion3],
        mode: "markers",
        name: "Tu predicción (3 h)",
        marker: {
          color: Math.abs(prediccion3 - fnReal.evaluate(X_INTERPOLACION)) <= 1000 ? "#15803d" : "#b91c1c",
          size: 12,
          symbol: "triangle-up",
        },
      });
    }
    if (prediccion8 !== null) {
      traces.push({
        x: [X_EXTRAPOLACION],
        y: [prediccion8],
        mode: "markers",
        name: "Tu predicción (8 h)",
        marker: {
          color: Math.abs(prediccion8 - fnReal.evaluate(X_EXTRAPOLACION)) <= 1000 ? "#15803d" : "#b91c1c",
          size: 12,
          symbol: "triangle-up",
        },
      });
    }

    UI.drawPlot(document.getElementById("sit5-plot"), traces, {
      title: "Puntos conocidos y tu hipótesis",
      xaxis: { title: "Horas (x)", range: [0, MAX_HORAS_DOMINIO] },
      yaxis: { title: "Costo (COP)" },
    });
  }

  function actualizarTabla() {
    var rows = TABLA_DATOS.map(function (p) {
      return { horas: p.x, costo: MathUtils.formatCOP(p.y), origen: "Dato conocido" };
    });
    if (prediccion3 !== null) {
      rows.push({ horas: X_INTERPOLACION, costo: MathUtils.formatCOP(prediccion3), origen: "Tu predicción (interpolación)" });
    }
    if (prediccion8 !== null) {
      rows.push({ horas: X_EXTRAPOLACION, costo: MathUtils.formatCOP(prediccion8), origen: "Tu predicción (extrapolación)" });
    }
    rows.sort(function (a, b) { return a.horas - b.horas; });

    UI.renderTable(
      document.getElementById("sit5-table"),
      [
        { key: "horas", label: "Horas (x)" },
        { key: "costo", label: "Costo C(x)" },
        { key: "origen", label: "Origen del dato" },
      ],
      rows,
      function (row) {
        return row.origen === "Dato conocido" ? "" : "row--highlight";
      }
    );
  }

  function actualizarAlgebraico() {
    var texto;
    if (hipotesis.m !== null && hipotesis.b !== null) {
      texto = "C(x) = " + MathUtils.formatCOP(hipotesis.m) + " · x + " + MathUtils.formatCOP(hipotesis.b);
    } else {
      texto = "C(x) = ? · x + ?  (completa m y b en el panel de controles)";
    }
    document.getElementById("sit5-alg").textContent = texto;
  }

  function actualizarVerbal() {
    var texto;
    if (hipotesis.m === null || hipotesis.b === null) {
      texto =
        "Todavía no escribiste tu hipótesis completa. Observa cómo cambia el costo entre filas consecutivas de " +
        "la tabla para encontrar la pendiente, y usa un punto conocido para encontrar el intercepto.";
    } else {
      var fnHipotesis = MathUtils.linearFunction(hipotesis.m, hipotesis.b);
      var errores = TABLA_DATOS.map(function (p) {
        return Math.abs(fnHipotesis.evaluate(p.x) - p.y);
      });
      var maxError = Math.max.apply(null, errores);
      if (maxError <= 500) {
        texto =
          "¡Tu fórmula C(x) = " + MathUtils.formatCOP(hipotesis.m) + "x + " + MathUtils.formatCOP(hipotesis.b) +
          " pasa por todos los puntos conocidos de la tabla! Encontraste el patrón correcto.";
      } else {
        texto =
          "Tu hipótesis actual no pasa exactamente por todos los puntos de la tabla (diferencia máxima: " +
          MathUtils.formatCOP(maxError) + "). Revisa el cálculo de la pendiente y el intercepto con dos filas de la tabla.";
      }
    }
    document.getElementById("sit5-conclusion").textContent = texto;
  }

  function exportarResumen() {
    var payload = {
      tablaDatos: TABLA_DATOS,
      hipotesisFinal: hipotesis,
      prediccion3Horas: prediccion3,
      prediccion8Horas: prediccion8,
      respuestas: {
        paso1_incremento: questionWidgets.q1.getState(),
        paso2_pendiente: questionWidgets.q2.getState(),
        paso3_intercepto: questionWidgets.q3.getState(),
        paso5_interpolacion3h: questionWidgets.q5.getState(),
        paso6_extrapolacion8h: questionWidgets.q6.getState(),
      },
    };
    ExportUtils.downloadJSON(
      "bahia-recta-situacion5.json",
      ExportUtils.buildSummary("situacion5", "Descifra la tarifa oculta", payload)
    );
  }

  function destroy() {
    hipotesis = { m: null, b: null };
    prediccion3 = null;
    prediccion8 = null;
    questionWidgets = {};
  }

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.situacion5 = {
    meta: {
      number: 5,
      title: "Descifra la tarifa oculta",
      objective: "Inferir una función afín a partir de una tabla de datos, e interpolar/extrapolar con ella.",
    },
    init: render,
    destroy: destroy,
  };
})();
