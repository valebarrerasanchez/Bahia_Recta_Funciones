/**
 * ui-helpers.js
 * NOTA: archivo agregado además de la estructura sugerida en el spec, para
 * evitar duplicar en las 5 situaciones el mismo código de construcción de
 * DOM (tablas, cajas de retroalimentación, control slider+número, gráficas
 * Plotly). Mantiene cada situacionN.js enfocado en SU lógica matemática.
 *
 * Todo vive en window.BahiaRecta.UI.
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  /** Helper corto para crear un elemento con atributos/props/hijos. */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else if (key.indexOf("on") === 0 && typeof attrs[key] === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else {
        node.setAttribute(key, attrs[key]);
      }
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  /**
   * Construye (o reconstruye) una tabla dentro de containerEl.
   * columns: [{key, label}], rows: [{key: value, ...}]
   * rowHighlightFn(row) -> string de clase extra opcional para la fila.
   */
  function renderTable(containerEl, columns, rows, rowHighlightFn) {
    containerEl.innerHTML = "";
    var table = el("table", { class: "data-table" });
    var thead = el("thead");
    var headRow = el("tr");
    columns.forEach(function (col) {
      headRow.appendChild(el("th", { scope: "col", text: col.label }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el("tbody");
    rows.forEach(function (row) {
      var extraClass = (rowHighlightFn && rowHighlightFn(row)) || "";
      var tr = el("tr", { class: extraClass });
      columns.forEach(function (col) {
        tr.appendChild(el("td", { text: row[col.key] }));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    containerEl.appendChild(table);
    return table;
  }

  /**
   * Actualiza una caja de retroalimentación inline (nunca usar alert()).
   * state: "correct" | "incorrect" | "hint" | "neutral"
   */
  function setFeedback(el_, state, message) {
    el_.textContent = message;
    el_.className = "feedback feedback--" + state;
    el_.setAttribute("aria-live", "polite");
  }

  /**
   * Actualiza un mensaje de error inline de validación (role=alert).
   */
  function setError(el_, message) {
    el_.textContent = message || "";
    el_.hidden = !message;
  }

  /**
   * Construye un par de controles sincronizados: <input type="range"> +
   * <input type="number">, ambos reales y navegables por teclado, que se
   * mantienen en sincronía entre sí. onChange(value) se llama con el valor
   * numérico válido cada vez que cambia cualquiera de los dos.
   */
  function createSyncedRangeNumber(opts) {
    var wrap = el("div", { class: "control-group" });
    var labelId = opts.id + "-label";
    wrap.appendChild(el("label", { for: opts.id + "-number", id: labelId, text: opts.label }));

    var row = el("div", { class: "range-number-row" });
    var range = el("input", {
      type: "range",
      id: opts.id + "-range",
      min: opts.min,
      max: opts.max,
      step: opts.step,
      value: opts.value,
      "aria-labelledby": labelId,
    });
    var number = el("input", {
      type: "number",
      id: opts.id + "-number",
      min: opts.min,
      max: opts.max,
      step: opts.step,
      value: opts.value,
      "aria-labelledby": labelId,
      inputmode: "decimal",
    });

    function emit(value) {
      if (opts.onChange) opts.onChange(value);
    }

    range.addEventListener("input", function () {
      number.value = range.value;
      emit(Number(range.value));
    });
    number.addEventListener("input", function () {
      if (number.value === "") return; // esperar a que el usuario termine de escribir
      var v = Number(number.value);
      if (!isNaN(v)) {
        var clamped = Math.min(Math.max(v, Number(opts.min)), Number(opts.max));
        range.value = clamped;
      }
      emit(v);
    });

    row.appendChild(range);
    row.appendChild(number);
    wrap.appendChild(row);

    return {
      wrapper: wrap,
      rangeInput: range,
      numberInput: number,
      setValue: function (v) {
        range.value = v;
        number.value = v;
      },
    };
  }

  /** Config común para todas las gráficas Plotly de la app. */
  function plotlyBaseLayout(overrides) {
    var base = {
      autosize: true,
      margin: { l: 60, r: 20, t: 30, b: 50 },
      font: { family: "Nunito, system-ui, sans-serif", size: 13, color: "#0f172a" },
      legend: { orientation: "h", y: -0.25 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#f8fbff",
      xaxis: { gridcolor: "#dbeafe", zerolinecolor: "#94a3b8" },
      yaxis: { gridcolor: "#dbeafe", zerolinecolor: "#94a3b8" },
    };
    return Object.assign(base, overrides || {});
  }

  var plotlyConfig = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    locale: "es",
  };

  function drawPlot(divEl, traces, layout) {
    Plotly.react(divEl, traces, plotlyBaseLayout(layout), plotlyConfig);
  }

  /**
   * Íconos SVG inline simples (lancha, yate, olas, sol) con role="img" +
   * aria-label, para ambientación costera accesible sin depender de
   * librerías externas ni imágenes rasterizadas. Devuelve un string HTML.
   */
  var ICONS = {
    lancha:
      '<svg viewBox="0 0 64 40" width="32" height="20" role="img" aria-label="Icono de lancha">' +
      '<title>Lancha</title>' +
      '<path d="M6 26 L58 26 L50 36 L14 36 Z" fill="#0ea5e9"/>' +
      '<rect x="28" y="6" width="3" height="20" fill="#0f172a"/>' +
      '<path d="M31 8 L46 22 L31 22 Z" fill="#ea580c"/>' +
      "</svg>",
    yate:
      '<svg viewBox="0 0 64 44" width="32" height="22" role="img" aria-label="Icono de yate">' +
      '<title>Yate</title>' +
      '<path d="M4 28 L60 28 L52 40 L14 40 Z" fill="#ffffff" stroke="#0369a1" stroke-width="2"/>' +
      '<rect x="30" y="6" width="3" height="22" fill="#0f172a"/>' +
      '<path d="M33 8 L50 24 L33 24 Z" fill="#15803d"/>' +
      '<path d="M28 24 L28 10 L14 24 Z" fill="#0ea5e9"/>' +
      "</svg>",
    olas:
      '<svg viewBox="0 0 64 20" width="32" height="10" role="img" aria-label="Icono de olas">' +
      '<title>Olas</title>' +
      '<path d="M0 10 Q8 2 16 10 T32 10 T48 10 T64 10 V20 H0 Z" fill="#0ea5e9"/>' +
      "</svg>",
    sol:
      '<svg viewBox="0 0 40 40" width="24" height="24" role="img" aria-label="Icono de sol">' +
      '<title>Sol</title>' +
      '<circle cx="20" cy="20" r="9" fill="#f59e0b"/>' +
      '<g stroke="#f59e0b" stroke-width="2" stroke-linecap="round">' +
      '<line x1="20" y1="2" x2="20" y2="8"/><line x1="20" y1="32" x2="20" y2="38"/>' +
      '<line x1="2" y1="20" x2="8" y2="20"/><line x1="32" y1="20" x2="38" y2="20"/>' +
      '<line x1="7" y1="7" x2="11" y2="11"/><line x1="29" y1="29" x2="33" y2="33"/>' +
      '<line x1="33" y1="7" x2="29" y2="11"/><line x1="11" y1="29" x2="7" y2="33"/>' +
      "</g></svg>",
  };

  function icon(name) {
    return ICONS[name] || "";
  }

  /**
   * Pregunta guía de respuesta numérica con tolerancia, retroalimentación
   * inmediata (debounce corto) al escribir y también al perder el foco.
   * opts: { id, prompt, expected, tolerance, hint, correctMessage, suffix,
   *         step, onChange(state) }
   */
  function createNumericQuestion(opts) {
    var wrap = el("div", { class: "challenge-question" });
    wrap.appendChild(el("label", { for: opts.id, class: "question-text", text: opts.prompt }));

    var row = el("div", { class: "answer-row" });
    var input = el("input", {
      type: "number",
      id: opts.id,
      step: opts.step || "any",
      "aria-describedby": opts.id + "-feedback",
    });
    row.appendChild(input);
    if (opts.suffix) row.appendChild(el("span", { text: opts.suffix }));
    wrap.appendChild(row);

    var feedback = el("div", { id: opts.id + "-feedback", class: "feedback" });
    wrap.appendChild(feedback);

    var lastState = { answered: false, correct: false, value: null };

    function check() {
      if (input.value === "") {
        setFeedback(feedback, "neutral", "");
        lastState = { answered: false, correct: false, value: null };
      } else {
        var v = Number(input.value);
        if (isNaN(v)) {
          setFeedback(feedback, "incorrect", "Ingresa un número válido.");
          lastState = { answered: true, correct: false, value: input.value };
        } else {
          var tol = opts.tolerance !== undefined ? opts.tolerance : 0.01;
          var correct = Math.abs(v - opts.expected) <= tol;
          lastState = { answered: true, correct: correct, value: v };
          if (correct) {
            setFeedback(feedback, "correct", opts.correctMessage || "¡Correcto!");
          } else {
            setFeedback(feedback, "incorrect", opts.hint || "Todavía no. Revisa el cálculo e intenta de nuevo.");
          }
        }
      }
      if (opts.onChange) opts.onChange(lastState);
    }

    var debounceTimer;
    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(check, 450);
    });
    input.addEventListener("blur", check);

    return {
      wrapper: wrap,
      input: input,
      getState: function () {
        return lastState;
      },
    };
  }

  /**
   * Pregunta guía de opción múltiple (radio buttons reales, accesibles).
   * opts: { id, prompt, options: [{value, label}], expected, hint,
   *         correctMessage, onChange(state) }
   */
  function createRadioQuestion(opts) {
    var wrap = el("fieldset", { class: "challenge-question" });
    wrap.appendChild(el("legend", { class: "question-text", text: opts.prompt }));

    var group = el("div", { class: "radio-group" });
    opts.options.forEach(function (opt, idx) {
      var inputId = opts.id + "-opt" + idx;
      var radio = el("input", { type: "radio", name: opts.id, id: inputId, value: opt.value });
      var optWrap = el("label", { for: inputId, class: "radio-option" }, [radio, document.createTextNode(opt.label)]);
      group.appendChild(optWrap);
    });
    wrap.appendChild(group);

    var feedback = el("div", { id: opts.id + "-feedback", class: "feedback" });
    wrap.appendChild(feedback);

    var lastState = { answered: false, correct: false, value: null };

    group.addEventListener("change", function (evt) {
      var value = evt.target.value;
      var correct = value === opts.expected;
      lastState = { answered: true, correct: correct, value: value };
      if (correct) {
        setFeedback(feedback, "correct", opts.correctMessage || "¡Correcto!");
      } else {
        setFeedback(feedback, "incorrect", opts.hint || "No es la opción correcta. Piénsalo de nuevo con la gráfica.");
      }
      if (opts.onChange) opts.onChange(lastState);
    });

    return {
      wrapper: wrap,
      getState: function () {
        return lastState;
      },
    };
  }

  /**
   * Pregunta de reflexión abierta (texto libre) con retroalimentación
   * heurística por palabras clave -- no es una corrección estricta
   * correcto/incorrecto (una pregunta conceptual abierta admite varias
   * redacciones válidas), sino una guía: "sigue desarrollando la idea" vs
   * "esa idea clave aparece en tu respuesta".
   * opts: { id, prompt, placeholder, keywords: [string], minLength }
   */
  function createReflectionQuestion(opts) {
    var wrap = el("div", { class: "challenge-question" });
    wrap.appendChild(el("label", { for: opts.id, class: "question-text", text: opts.prompt }));

    var textarea = el("textarea", {
      id: opts.id,
      placeholder: opts.placeholder || "Escribe tu respuesta con tus palabras…",
      "aria-describedby": opts.id + "-feedback",
    });
    wrap.appendChild(textarea);

    var feedback = el("div", { id: opts.id + "-feedback", class: "feedback" });
    wrap.appendChild(feedback);

    var lastState = { answered: false, hasKeyword: false, value: "" };
    var minLength = opts.minLength || 12;

    function check() {
      var text = textarea.value.trim();
      if (text.length === 0) {
        setFeedback(feedback, "neutral", "");
        lastState = { answered: false, hasKeyword: false, value: "" };
      } else if (text.length < minLength) {
        setFeedback(feedback, "hint", "Cuenta un poco más tu idea (al menos una oración completa).");
        lastState = { answered: true, hasKeyword: false, value: text };
      } else {
        var lower = text.toLowerCase();
        var hasKeyword = (opts.keywords || []).some(function (kw) {
          return lower.indexOf(kw) !== -1;
        });
        lastState = { answered: true, hasKeyword: hasKeyword, value: text };
        if (hasKeyword) {
          setFeedback(feedback, "correct", opts.goodMessage || "¡Muy bien! Tu respuesta incluye la idea clave.");
        } else {
          setFeedback(feedback, "hint", opts.hintMessage || "Vas por buen camino. Piensa en qué cambia con cada hora y qué queda fijo.");
        }
      }
      if (opts.onChange) opts.onChange(lastState);
    }

    var debounceTimer;
    textarea.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(check, 500);
    });
    textarea.addEventListener("blur", check);

    return {
      wrapper: wrap,
      getState: function () {
        return lastState;
      },
    };
  }

  /**
   * Fila de botones "preset" (ej. n = 2, 4, 5, 10) además del control
   * numérico libre. Usa aria-pressed para indicar cuál está activo.
   */
  function createPresetButtons(opts) {
    var wrap = el("div", { class: "preset-buttons", role: "group", "aria-label": opts.label || "Valores rápidos" });
    var buttons = opts.values.map(function (val) {
      var btn = el("button", {
        type: "button",
        class: "preset-btn",
        text: opts.formatLabel ? opts.formatLabel(val) : String(val),
        "aria-pressed": "false",
      });
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        btn.setAttribute("aria-pressed", "true");
        opts.onSelect(val);
      });
      wrap.appendChild(btn);
      return btn;
    });
    return {
      wrapper: wrap,
      syncActive: function (val) {
        buttons.forEach(function (b, i) {
          b.setAttribute("aria-pressed", opts.values[i] === val ? "true" : "false");
        });
      },
    };
  }

  window.BahiaRecta.UI = {
    el: el,
    renderTable: renderTable,
    setFeedback: setFeedback,
    setError: setError,
    createSyncedRangeNumber: createSyncedRangeNumber,
    createNumericQuestion: createNumericQuestion,
    createRadioQuestion: createRadioQuestion,
    createReflectionQuestion: createReflectionQuestion,
    createPresetButtons: createPresetButtons,
    drawPlot: drawPlot,
    plotlyConfig: plotlyConfig,
    icon: icon,
  };
})();
