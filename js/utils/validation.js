/**
 * validation.js
 * Validación centralizada de inputs numéricos para todas las situaciones.
 * Nunca se permiten horas negativas, tarifas negativas ni número de
 * personas menor a 1. Los mensajes de error son para mostrarse inline
 * (nunca usar alert()).
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  /**
   * Valida un valor numérico genérico no-negativo.
   * options: { integerOnly: bool, min: number, max: number, label: string }
   */
  function validateNonNegative(rawValue, options) {
    var opts = options || {};
    var label = opts.label || "El valor";
    var min = opts.min !== undefined ? opts.min : 0;
    var max = opts.max !== undefined ? opts.max : Infinity;

    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return { valid: false, message: label + " no puede estar vacío." };
    }

    var value = Number(rawValue);

    if (isNaN(value)) {
      return { valid: false, message: label + " debe ser un número válido." };
    }
    if (value < min) {
      return {
        valid: false,
        message: label + " no puede ser negativo" + (min > 0 ? " ni menor a " + min : "") + ".",
      };
    }
    if (value > max) {
      return { valid: false, message: label + " no puede ser mayor a " + max + "." };
    }
    if (opts.integerOnly && !Number.isInteger(value)) {
      return { valid: false, message: label + " debe ser un número entero (sin decimales)." };
    }

    return { valid: true, message: "", value: value };
  }

  /**
   * Valida horas de recorrido. Por defecto permite decimales (ej. 1.5 h);
   * pasar { integerOnly: true } para situaciones que solo permiten horas
   * completas (ej. Situación 3 - presupuesto).
   */
  function validateHours(rawValue, options) {
    var opts = Object.assign({ label: "Las horas", max: 100 }, options || {});
    return validateNonNegative(rawValue, opts);
  }

  /**
   * Valida número de personas del grupo: entero, mínimo 1.
   */
  function validatePeople(rawValue, options) {
    var opts = Object.assign(
      { label: "El número de personas", min: 1, integerOnly: true, max: 500 },
      options || {}
    );
    return validateNonNegative(rawValue, opts);
  }

  /**
   * Valida un monto de dinero (tarifa, presupuesto, respuesta en pesos).
   */
  function validateAmount(rawValue, options) {
    var opts = Object.assign({ label: "El valor en pesos" }, options || {});
    return validateNonNegative(rawValue, opts);
  }

  window.BahiaRecta.Validation = {
    validateNonNegative: validateNonNegative,
    validateHours: validateHours,
    validatePeople: validatePeople,
    validateAmount: validateAmount,
  };
})();
