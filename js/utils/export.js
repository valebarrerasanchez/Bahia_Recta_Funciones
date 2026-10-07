/**
 * export.js
 * Genera y descarga un resumen (JSON) de lo que el estudiante resolvió en
 * una situación, como "cierre de evidencia". Usa Blob + <a download>
 * porque es un archivo local que baja el navegador del alumno, no un
 * artifact de claude.ai.
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  /**
   * Dispara la descarga de un objeto JS como archivo .json legible.
   */
  function downloadJSON(filename, dataObj) {
    var json = JSON.stringify(dataObj, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    triggerDownload(blob, filename);
  }

  /**
   * Dispara la descarga de texto plano (.txt).
   */
  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, filename);
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // liberar memoria del objeto URL luego de un instante
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Arma un objeto de resumen estandarizado para cualquier situación.
   * situationId: string (ej. "situacion1")
   * title: string (título humano de la situación)
   * payload: objeto libre con los datos propios de esa situación
   *          (parámetros actuales, tabla, respuestas del estudiante, etc.)
   */
  function buildSummary(situationId, title, payload) {
    return {
      app: "Bahía Recta",
      situacion: situationId,
      titulo: title,
      generadoEl: new Date().toISOString(),
      datos: payload,
    };
  }

  window.BahiaRecta.ExportUtils = {
    downloadJSON: downloadJSON,
    downloadText: downloadText,
    buildSummary: buildSummary,
  };
})();
