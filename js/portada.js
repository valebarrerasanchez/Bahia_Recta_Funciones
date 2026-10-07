/**
 * portada.js — Pantalla de inicio de Bahía Recta.
 *
 * Se registra en el mismo registro que las situaciones para que app.js la
 * monte/desmonte con el mismo ciclo de vida. Contiene: imagen de portada,
 * propósito de la aplicación, teoría de función lineal y afín, y la
 * presentación de la docente autora.
 *
 * Docentes: para editar textos, modificar SOLO las constantes de abajo.
 */
(function () {
  "use strict";

  var PROPOSITO =
    "Bahía Recta es una herramienta digital interactiva diseñada para que estudiantes de grado 9° " +
    "exploren, manipulen y comprendan la función lineal y afín (y = mx + b) a través de situaciones " +
    "reales de la vida turística de Santa Marta: tarifas de lanchas y yates, presupuestos de paseo y " +
    "comparación de servicios. A través de cinco situaciones problema, el estudiante representa cada " +
    "caso en registros tabular, gráfico, algebraico y verbal, fortaleciendo su capacidad de interpretar " +
    "la pendiente y el intercepto como elementos con significado real, y de argumentar sus decisiones " +
    "con base en el modelo matemático.";

  // Cada tema se muestra como tarjeta desplegable. "formula" es opcional.
  var TEORIA = [
    {
      titulo: "¿Qué es una función lineal?",
      formula: "y = mx",
      texto:
        "Es una relación de la forma y = mx, donde por cada unidad que aumenta x, y cambia siempre en la " +
        "misma cantidad. Su gráfica es una línea recta que pasa por el origen (0, 0).",
    },
    {
      titulo: "¿Qué es una función afín?",
      formula: "y = mx + b",
      texto:
        "Es una relación de la forma y = mx + b, muy similar a la lineal, pero con un valor inicial b que " +
        "no depende de x (por eso la recta no pasa por el origen, sino por el punto (0, b)).",
    },
    {
      titulo: "La pendiente (m)",
      texto:
        "Indica la razón de cambio: cuánto aumenta y por cada unidad que aumenta x. En nuestro contexto, " +
        "es el costo por cada hora adicional de paseo.",
    },
    {
      titulo: "El intercepto (b)",
      texto:
        "Es el valor de y cuando x = 0. En nuestro contexto, es la tarifa fija que se cobra aunque el " +
        "paseo dure 0 horas (por ejemplo, el \"zarpe\").",
    },
    {
      titulo: "Punto de intersección de dos funciones",
      formula: "y₁ = y₂",
      texto:
        "Es el valor de x donde ambas funciones dan el mismo resultado (y₁ = y₂). Para hallarlo " +
        "algebraicamente, se igualan las dos expresiones y se despeja x. En el contexto, es el momento " +
        "exacto en que dos tarifas cuestan lo mismo.",
    },
    {
      titulo: "Despejar x en una ecuación",
      formula: "x = (y − b) / m",
      texto:
        "Cuando se conoce un presupuesto fijo (y) y se quiere saber cuántas horas (x) se pueden pagar, " +
        "se despeja x de la ecuación y = mx + b.",
    },
    {
      titulo: "De una tabla a la ecuación",
      formula: "m = (y₂ − y₁) / (x₂ − x₁)",
      texto:
        "Si se conocen dos pares de valores (x, y), la pendiente se calcula como m = (y₂ − y₁)/(x₂ − x₁); " +
        "luego se reemplaza en y = mx + b para hallar b. Esto permite interpolar (calcular un valor " +
        "dentro del rango conocido) o extrapolar (calcular uno fuera del rango).",
    },
  ];

  var AUTORA = {
    nombre: "Valentina Barrera Sánchez",
    foto: "img/valentina.jpeg",
    bio:
      "Soy Valentina Barrera Sánchez, docente de matemáticas y física en el Colegio Cristiano Integral de " +
      "Santa Marta, donde trabajo con estudiantes de 6° a 9°. Actualmente curso octavo semestre de la " +
      "Licenciatura en Matemáticas en la Universidad del Magdalena, y desarrollo mi práctica pedagógica " +
      "investigativa en mi propio colegio. Bahía Recta nace como parte de mi formación en herramientas de " +
      "inteligencia artificial para la enseñanza de las matemáticas, buscando acercar la función lineal a " +
      "mis estudiantes desde su propio entorno costero.",
  };

  var UI = window.BahiaRecta.UI;

  function startButton(text) {
    var btn = UI.el("button", { type: "button", class: "portada__cta", text: text });
    btn.addEventListener("click", function () {
      var tab = document.getElementById("tab-situacion1");
      if (tab) {
        tab.click();
        tab.focus();
        window.scrollTo(0, 0);
      }
    });
    return btn;
  }

  function render(container) {
    container.innerHTML = "";
    var portada = UI.el("div", { class: "portada" });

    // ---------- Imagen principal ----------
    var hero = UI.el("section", { class: "portada__hero", "aria-label": "Bahía Recta" });
    hero.appendChild(
      UI.el("img", {
        src: "img/portada-bahia-recta.jpeg",
        alt:
          "Bahía Recta: función lineal y afín con tarifas de paseos en la Bahía de Santa Marta. " +
          "Ilustración de la bahía al atardecer con lanchas y veleros.",
        class: "portada__hero-img",
      })
    );
    portada.appendChild(hero);

    // ---------- Propósito ----------
    var proposito = UI.el("section", { class: "portada__card portada__proposito" });
    proposito.appendChild(UI.el("h2", { text: "Propósito de la aplicación" }));
    proposito.appendChild(UI.el("p", { text: PROPOSITO }));
    proposito.appendChild(startButton("Comenzar con la Situación 1 →"));
    portada.appendChild(proposito);

    // ---------- Teoría ----------
    var teoria = UI.el("section", { class: "portada__card" });
    teoria.appendChild(UI.el("h2", { text: "Antes de empezar: lo que necesitas saber" }));
    teoria.appendChild(
      UI.el("p", {
        class: "portada__lead",
        text: "Abre cada tema para repasarlo. Puedes volver a esta página cuando quieras desde la pestaña Inicio.",
      })
    );
    var lista = UI.el("div", { class: "portada__teoria" });
    TEORIA.forEach(function (tema) {
      var details = UI.el("details", { class: "teoria-item" });
      details.appendChild(UI.el("summary", { text: tema.titulo }));
      var body = UI.el("div", { class: "teoria-item__body" });
      if (tema.formula) {
        body.appendChild(UI.el("p", { class: "algebraic-expression", text: tema.formula }));
      }
      body.appendChild(UI.el("p", { text: tema.texto }));
      details.appendChild(body);
      lista.appendChild(details);
    });
    teoria.appendChild(lista);
    portada.appendChild(teoria);

    // ---------- Quién soy ----------
    var autora = UI.el("section", { class: "portada__card portada__autora" });
    autora.appendChild(
      UI.el("img", { src: AUTORA.foto, alt: "Foto de " + AUTORA.nombre, class: "portada__autora-foto" })
    );
    var autoraTexto = UI.el("div", { class: "portada__autora-texto" });
    autoraTexto.appendChild(UI.el("h2", { text: "Quién soy" }));
    autoraTexto.appendChild(UI.el("p", { class: "portada__autora-nombre", text: AUTORA.nombre }));
    autoraTexto.appendChild(UI.el("p", { text: AUTORA.bio }));
    autora.appendChild(autoraTexto);
    portada.appendChild(autora);

    container.appendChild(portada);
  }

  function destroy() {}

  window.BahiaRecta = window.BahiaRecta || {};
  window.BahiaRecta.Situaciones = window.BahiaRecta.Situaciones || {};
  window.BahiaRecta.Situaciones.portada = {
    meta: {
      number: "",
      title: "Inicio",
      objective: "",
    },
    isCover: true,
    init: render,
    destroy: destroy,
  };
})();
