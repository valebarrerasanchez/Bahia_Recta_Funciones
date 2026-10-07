/**
 * app.js
 * Orquestador principal de "Bahía Recta": maneja la navegación entre las
 * portada y las 5 situaciones (pestañas ARIA tabs), el estado de cuál está activa, y el
 * ciclo de vida init/destroy de cada módulo de situación para no acumular
 * listeners duplicados al navegar entre pestañas.
 */
(function () {
  "use strict";

  var TAB_ORDER = ["portada", "situacion1", "situacion2", "situacion3", "situacion4", "situacion5"];

  var state = {
    currentId: null,
  };

  var container = document.getElementById("situation-container");
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var titleEl = document.getElementById("situation-title");
  var objectiveEl = document.getElementById("situation-objective");
  var numberEl = document.getElementById("situation-number");
  var situationBox = document.querySelector(".app-header__situation");

  function getSituationModule(id) {
    var registry = (window.BahiaRecta && window.BahiaRecta.Situaciones) || {};
    return registry[id];
  }

  /**
   * Activa una situación por id: destruye la anterior (limpia listeners),
   * limpia el contenedor, monta la nueva y actualiza encabezado + pestañas.
   */
  function activateSituation(id, focusPanel) {
    var mod = getSituationModule(id);
    if (!mod) {
      console.error('Módulo de situación no encontrado: "' + id + '"');
      return;
    }

    var previousMod = state.currentId ? getSituationModule(state.currentId) : null;
    if (previousMod && typeof previousMod.destroy === "function") {
      try {
        previousMod.destroy();
      } catch (err) {
        console.error("Error al destruir la situación anterior:", err);
      }
    }

    container.innerHTML = "";
    state.currentId = id;

    // Encabezado dinámico según metadata de la situación.
    var meta = mod.meta || {};
    numberEl.textContent = meta.number || "";
    titleEl.textContent = meta.title || "";
    objectiveEl.textContent = meta.objective || "";
    document.title = "Bahía Recta — " + (meta.title || "Situación");

    // La portada tiene su propia imagen y textos: ocultamos la caja de situación.
    situationBox.hidden = !!mod.isCover;
    document.body.classList.toggle("is-portada", !!mod.isCover);

    // Estado visual + ARIA de las pestañas.
    tabs.forEach(function (tab) {
      var isActive = tab.dataset.situation === id;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
      tab.setAttribute("aria-controls", "situation-container");
      if (isActive) {
        container.setAttribute("aria-labelledby", tab.id);
      }
    });

    try {
      mod.init(container);
    } catch (err) {
      console.error('Error al inicializar la situación "' + id + '":', err);
      container.innerHTML =
        '<p class="loading-placeholder">Ocurrió un error al cargar esta situación. Revisa la consola.</p>';
    }

    if (focusPanel) {
      container.focus();
    }
  }

  /** Click en cualquier pestaña. */
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateSituation(tab.dataset.situation, false);
    });
  });

  /**
   * Navegación por teclado estándar del patrón ARIA "tabs": flechas
   * izquierda/derecha (y Home/End) mueven el foco Y activan la pestaña.
   */
  document.querySelector('[role="tablist"]').addEventListener("keydown", function (evt) {
    var currentIndex = TAB_ORDER.indexOf(state.currentId);
    var nextIndex = null;

    if (evt.key === "ArrowRight" || evt.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (evt.key === "Home") {
      nextIndex = 0;
    } else if (evt.key === "End") {
      nextIndex = TAB_ORDER.length - 1;
    } else {
      return;
    }

    evt.preventDefault();
    var nextId = TAB_ORDER[nextIndex];
    activateSituation(nextId, false);
    var nextTab = tabs.filter(function (t) {
      return t.dataset.situation === nextId;
    })[0];
    if (nextTab) nextTab.focus();
  });

  document.addEventListener("DOMContentLoaded", function () {
    activateSituation(TAB_ORDER[0], false);
  });

  // Si el script se carga después de DOMContentLoaded (por ejemplo con
  // scripts al final del <body>, como en este proyecto), el evento ya pudo
  // haberse disparado: inicializamos también de forma directa.
  if (document.readyState === "interactive" || document.readyState === "complete") {
    activateSituation(TAB_ORDER[0], false);
  }
})();
