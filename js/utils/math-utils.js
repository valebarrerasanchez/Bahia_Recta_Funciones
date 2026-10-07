/**
 * math-utils.js
 * Wrappers sobre math.js para "Bahía Recta".
 * Centraliza: formateo de moneda COP, construcción de funciones lineales/afines,
 * cálculo de intersecciones y generación de datos para tablas/gráficas.
 *
 * Se expone en el namespace global window.BahiaRecta para poder usarse
 * desde <script> planos (sin módulos ES) y así funcionar también abierto
 * directamente desde el sistema de archivos (file://).
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  /**
   * Formatea un número como pesos colombianos: separador de miles con punto,
   * sin decimales, con símbolo $. Ej: 50000 -> "$50.000".
   * Usa toLocaleString('es-CO') tal como pide el spec.
   */
  function formatCOP(value) {
    if (value === null || value === undefined || isNaN(value)) return "$0";
    var rounded = Math.round(value);
    var sign = rounded < 0 ? "-" : "";
    var abs = Math.abs(rounded);
    return sign + "$" + abs.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  }

  /**
   * Formatea un número "pelado" (sin símbolo $) con separador de miles es-CO.
   * Útil para mostrar horas o cantidades que no son dinero.
   */
  function formatNumber(value, decimals) {
    if (value === null || value === undefined || isNaN(value)) return "0";
    var d = decimals === undefined ? 0 : decimals;
    return Number(value).toLocaleString("es-CO", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  /**
   * Crea una función lineal/afín y = m*x + b usando math.js para la aritmética.
   * Devuelve un objeto con m, b y un método evaluate(x).
   */
  function linearFunction(m, b) {
    return {
      m: m,
      b: b,
      evaluate: function (x) {
        // math.add / math.multiply mantienen la evaluación pasando por math.js
        // tal como exige el stack técnico del proyecto.
        return math.add(math.multiply(m, x), b);
      },
    };
  }

  /**
   * Calcula la coordenada x de intersección entre dos funciones lineales/afines.
   * f1.m*x + f1.b = f2.m*x + f2.b  =>  x = (f2.b - f1.b) / (f1.m - f2.m)
   * Devuelve null si las rectas son paralelas (o coincidentes) y no hay
   * intersección única.
   */
  function intersectionX(f1, f2) {
    var denominator = math.subtract(f1.m, f2.m);
    if (denominator === 0) return null;
    var numerator = math.subtract(f2.b, f1.b);
    return math.divide(numerator, denominator);
  }

  /**
   * Devuelve el punto {x, y} de intersección entre dos funciones, o null
   * si son paralelas.
   */
  function intersectionPoint(f1, f2) {
    var x = intersectionX(f1, f2);
    if (x === null) return null;
    return { x: x, y: f1.evaluate(x) };
  }

  /**
   * Genera un arreglo de puntos {x, y} evaluando f en cada valor de xValues.
   */
  function generateTableData(f, xValues) {
    return xValues.map(function (x) {
      return { x: x, y: f.evaluate(x) };
    });
  }

  /**
   * Genera un arreglo de números [start, start+step, ..., end] (inclusive si calza).
   */
  function range(start, end, step) {
    var s = step || 1;
    var values = [];
    for (var v = start; v <= end + 1e-9; v += s) {
      values.push(Math.round(v * 1000) / 1000);
    }
    return values;
  }

  /**
   * Piso (floor) usando math.js, con redondeo previo para evitar errores de
   * punto flotante (ej. 7.4999999999 en vez de 7.5).
   */
  function floorSafe(value) {
    return math.floor(math.round(value * 1e6) / 1e6);
  }

  window.BahiaRecta.MathUtils = {
    formatCOP: formatCOP,
    formatNumber: formatNumber,
    linearFunction: linearFunction,
    intersectionX: intersectionX,
    intersectionPoint: intersectionPoint,
    generateTableData: generateTableData,
    range: range,
    floorSafe: floorSafe,
  };
})();
