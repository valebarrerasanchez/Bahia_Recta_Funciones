/**
 * muelle-3d.js — Componente "Muelle 3D" con realidad virtual y aumentada.
 *
 * Muestra cada tarifa como una TORRE DE MONEDAS junto a su embarcación, en un
 * muelle de la Bahía de Santa Marta. Lo usa la Situación 4 (Tres opciones),
 * que le pasa sus servicios, su punto común y las horas de su propio control.
 *
 *   var muelle = BahiaRecta.Muelle3D.crear({
 *     servicios: [{ clave, nombre, letra, m, b, color }, ...],
 *     horas: 3, horasMax: 12,
 *     puntoComun: { x: 5, y: 150000 } | null,
 *     alCambiarHoras: function (x) { ... }   // botones −/+ de VR y de la cámara
 *   });
 *   contenedor.appendChild(muelle.elemento);
 *   muelle.setHoras(4);     // cuando cambia el control de la situación
 *   muelle.destruir();      // al salir de la pestaña
 *
 * Idea didáctica: las monedas PLATEADAS son el cargo fijo (b) y ya están en la
 * torre con 0 horas; las DORADAS son lo que se paga por las horas (m·x).
 * Escala: 1 unidad de altura = $50.000 y cada moneda = $10.000.
 *
 * Modos de visualización:
 *  1. Escena 3D (por defecto): arrastrar para mirar, girar el celular, o
 *     botón VR de A-Frame para gafas/cardboard.
 *  2. Realidad aumentada REAL (WebXR immersive-ar, Android con ARCore): las
 *     torres se plantan sobre el piso o la mesa tocando la pantalla.
 *  3. Cámara de fondo (iPhone y demás): la cámara se ve detrás y las torres
 *     flotan delante; el giroscopio las mantiene en su lugar.
 *  Se elige automáticamente 2 si el dispositivo lo soporta; si no, 3.
 *  La cámara solo funciona en un contexto seguro (HTTPS o localhost).
 *
 * Tecnología:
 *  - A-Frame 1.8.0 se descarga SOLO cuando se monta el componente (carga
 *    diferida). Al destruirlo se desmonta la escena, se apaga la cámara y se
 *    libera el contexto WebGL.
 *  - Los costos se calculan con math.js (MathUtils.linearFunction).
 *  - Los textos dentro de la escena se dibujan en un <canvas> con Poppins y
 *    Nunito, por eso muestran bien tildes y ñ (el a-text de A-Frame no).
 *  - Sin WebGL o sin internet se muestra un mensaje amable.
 */
(function () {
  "use strict";

  window.BahiaRecta = window.BahiaRecta || {};

  // ─────────────────────────── Configuración ───────────────────────────

  /** Versión estable de A-Frame (CDN oficial). Se carga de forma diferida. */
  var AFRAME_URL = "https://aframe.io/releases/1.8.0/aframe.min.js";

  var PESOS_POR_UNIDAD = 50000; // 1 unidad de altura
  var PESOS_POR_MONEDA = 10000; // 1 moneda
  var ALTO_RANURA = PESOS_POR_MONEDA / PESOS_POR_UNIDAD; // 0,2 unidades por moneda
  var GROSOR_MONEDA = 0.17; // un poco menos que la ranura: se ven las monedas apiladas

  var BASE_Y = 0.25; // altura de la balsa donde se apoya cada torre
  var TORRE_Z = -3; // distancia de las torres frente al muelle
  var SEPARACION_TORRES = 4;
  var CENTRO_MAQUETA_Z = -2.7; // centro de la "maqueta" (torres + botes)
  var CAMARA = { x: 0, y: 2.1, z: 6.2 }; // ojos de la estudiante, parada en el muelle
  var INCLINACION_INICIAL = 0.06; // radianes hacia arriba: así cabe la torre más alta
  var SEPARACION_LETRERO = 0.8; // espacio entre la cima de la torre y su letrero

  // Maqueta reducida para los modos con cámara
  var AR_ESCALA = 0.06; // AR real: la torre de $360.000 mide unos 43 cm sobre el piso o la mesa
  var AR_POSICION = { x: 0, y: 0, z: -1.2 }; // antes de tocar para ubicarla
  // Cámara de fondo: maqueta flotando frente a la estudiante (más grande si la
  // pantalla está horizontal, porque hay más ancho).
  var CAM_ESCALA_VERTICAL = 0.15;
  var CAM_ESCALA_HORIZONTAL = 0.2;
  var CAM_POSICION = { x: 0, y: 1.25, z: 3.4 };

  // ─────────────────────────── Utilidades ───────────────────────────

  /** 150000 → "150.000" (punto de miles siempre, también en números de 4 cifras). */
  function miles(n) {
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "-" : "") + s;
  }

  function pesos(n) {
    return (n < 0 ? "-$" : "$") + miles(Math.abs(n));
  }

  /** 2.5 → "2,5" */
  function formatoHoras(h) {
    return String(h).replace(".", ",");
  }

  function textoHoras(h) {
    return formatoHoras(h) + (h === 1 ? " hora" : " horas");
  }

  /** "C(x) = 50.000 + 20.000x" */
  function expresion(s) {
    return s.letra + "(x) = " + (s.b ? miles(s.b) + " + " : "") + miles(s.m) + "x";
  }

  function yawHaciaCamara(x, z) {
    return (Math.atan2(CAMARA.x - x, CAMARA.z - z) * 180) / Math.PI;
  }

  function soportaWebGL() {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return false;
      var ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext(); // liberar el contexto de prueba
      return true;
    } catch (e) {
      return false;
    }
  }

  // ───────────────────────── Carga diferida de A-Frame ─────────────────────────

  var cargaAFrame = null;

  function cargarAFrame() {
    if (window.AFRAME) return Promise.resolve(window.AFRAME);
    if (cargaAFrame) return cargaAFrame;
    cargaAFrame = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = AFRAME_URL;
      script.async = true;
      script.onload = function () {
        if (window.AFRAME) resolve(window.AFRAME);
        else reject(new Error("A-Frame se descargó pero no se inicializó."));
      };
      script.onerror = function () {
        cargaAFrame = null; // permitir reintentar
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("No se pudo descargar A-Frame."));
      };
      document.head.appendChild(script);
    });
    return cargaAFrame;
  }

  // ─────────────────────── Componentes 3D propios (A-Frame) ───────────────────────

  var componentesRegistrados = false;
  var recursosMoneda = null; // geometría y materiales compartidos por todas las torres

  function registrarComponentes() {
    if (componentesRegistrados) return;
    componentesRegistrados = true;

    var A = window.AFRAME;
    var THREE = A.THREE;

    /**
     * bahia-texto: letrero dibujado en un <canvas> (soporta tildes y ñ porque
     * usa las fuentes del navegador). "titulo" va en Poppins; "cuerpo" puede
     * tener varias líneas separadas por "\n".
     */
    A.registerComponent("bahia-texto", {
      schema: {
        titulo: { default: "" },
        cuerpo: { default: "" },
        ancho: { default: 2.4 },
        alto: { default: 0.8 },
        fondo: { default: "#ffffff" },
        acento: { default: "" },
        colorTitulo: { default: "#0369a1" },
        colorTexto: { default: "#0f172a" },
        opacidad: { default: 0.95 },
        radio: { default: 0.12 },
        escalaTitulo: { default: 1.2 },
      },
      init: function () {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.textura = new THREE.CanvasTexture(this.canvas);
        this.textura.colorSpace = THREE.SRGBColorSpace;
        this.textura.anisotropy = 4;
        this.material = new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, alphaTest: 0.02 });
        this.geometria = new THREE.PlaneGeometry(1, 1);
        this.malla = new THREE.Mesh(this.geometria, this.material);
        this.el.setObject3D("mesh", this.malla);
        var self = this;
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            if (self.ctx) self.dibujar(); // redibujar cuando carguen Poppins/Nunito
          });
        }
      },
      update: function () {
        this.malla.scale.set(this.data.ancho, this.data.alto, 1);
        this.dibujar();
      },
      dibujar: function () {
        var d = this.data;
        var PX = 220; // píxeles por unidad de la escena
        var w = Math.min(2048, Math.round(d.ancho * PX));
        var h = Math.min(1024, Math.round(d.alto * PX));
        var ctx = this.ctx;
        if (this.canvas.width !== w || this.canvas.height !== h) {
          this.canvas.width = w;
          this.canvas.height = h;
          this.textura.dispose(); // con WebGL2 la textura tiene tamaño fijo: se recrea
        }
        ctx.clearRect(0, 0, w, h);

        // Fondo redondeado + franja lateral de color
        var r = Math.min(d.radio * PX, h / 2);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(w, 0, w, h, r);
        ctx.arcTo(w, h, 0, h, r);
        ctx.arcTo(0, h, 0, 0, r);
        ctx.arcTo(0, 0, w, 0, r);
        ctx.closePath();
        ctx.globalAlpha = d.opacidad;
        ctx.fillStyle = d.fondo;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (d.acento) {
          ctx.clip();
          ctx.fillStyle = d.acento;
          ctx.fillRect(0, 0, Math.max(10, PX * 0.07), h);
        }
        ctx.restore();

        var lineas = [];
        if (d.titulo) lineas.push({ texto: d.titulo, titulo: true });
        (d.cuerpo ? d.cuerpo.split("\n") : []).forEach(function (t) {
          lineas.push({ texto: t, titulo: false });
        });
        if (!lineas.length) {
          this.textura.needsUpdate = true;
          return;
        }

        var nCuerpo = lineas.length - (d.titulo ? 1 : 0);
        var base = (h * 0.8) / ((d.titulo ? d.escalaTitulo * 1.25 : 0) + nCuerpo * 1.3);
        var total = 0;
        lineas.forEach(function (l) {
          l.tam = l.titulo ? base * d.escalaTitulo : base;
          l.alto = l.tam * (l.titulo ? 1.25 : 1.3);
          total += l.alto;
        });

        var y = (h - total) / 2;
        var margen = d.acento ? PX * 0.12 : PX * 0.06;
        var anchoUtil = w - margen * 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        lineas.forEach(function (l) {
          var familia = l.titulo ? "Poppins, system-ui, sans-serif" : "Nunito, system-ui, sans-serif";
          var peso = l.titulo ? "700 " : "600 ";
          var tam = l.tam;
          ctx.font = peso + tam + "px " + familia;
          var medida = ctx.measureText(l.texto).width;
          if (medida > anchoUtil) {
            tam = tam * (anchoUtil / medida); // achicar si no cabe
            ctx.font = peso + tam + "px " + familia;
          }
          ctx.fillStyle = l.titulo ? d.colorTitulo : d.colorTexto;
          ctx.fillText(l.texto, w / 2 + (d.acento ? PX * 0.03 : 0), y + l.alto / 2);
          y += l.alto;
        });
        this.textura.needsUpdate = true;
      },
      remove: function () {
        this.el.removeObject3D("mesh");
        this.textura.dispose();
        this.material.dispose();
        this.geometria.dispose();
        this.ctx = null;
      },
    });

    /** bahia-cielo: esfera con degradado de atardecer (no le afecta la niebla). */
    A.registerComponent("bahia-cielo", {
      init: function () {
        var c = document.createElement("canvas");
        c.width = 4;
        c.height = 512;
        var ctx = c.getContext("2d");
        var g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0.0, "#16294d");
        g.addColorStop(0.22, "#2f3e7a");
        g.addColorStop(0.36, "#6b4f97");
        g.addColorStop(0.44, "#c9658f");
        g.addColorStop(0.49, "#f59e7b");
        g.addColorStop(0.52, "#f7b58a");
        g.addColorStop(1.0, "#f7b58a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 4, 512);
        this.textura = new THREE.CanvasTexture(c);
        this.textura.colorSpace = THREE.SRGBColorSpace;
        this.material = new THREE.MeshBasicMaterial({ map: this.textura, side: THREE.BackSide, fog: false, depthWrite: false });
        this.geometria = new THREE.SphereGeometry(400, 24, 16);
        this.el.setObject3D("mesh", new THREE.Mesh(this.geometria, this.material));
      },
      remove: function () {
        this.el.removeObject3D("mesh");
        this.textura.dispose();
        this.material.dispose();
        this.geometria.dispose();
      },
    });

    /** bahia-oleaje: mar low-poly con olas suaves (quieto si animar = false). */
    A.registerComponent("bahia-oleaje", {
      schema: { animar: { default: true }, color: { default: "#0e7490" } },
      init: function () {
        this.geometria = new THREE.PlaneGeometry(240, 240, 72, 72);
        this.geometria.rotateX(-Math.PI / 2);
        this.material = new THREE.MeshStandardMaterial({
          color: this.data.color,
          flatShading: true, // facetas visibles: estilo low-poly
          roughness: 0.45,
          metalness: 0.05,
        });
        this.el.setObject3D("mesh", new THREE.Mesh(this.geometria, this.material));
        this.acumulado = 0;
        this.olear(0);
      },
      tick: function (t, dt) {
        if (!this.data.animar || !this.el.object3D.visible) return;
        this.acumulado += dt || 0;
        if (this.acumulado < 33) return; // ~30 actualizaciones por segundo bastan
        this.acumulado = 0;
        this.olear(t);
      },
      olear: function (t) {
        var s = t * 0.001;
        var pos = this.geometria.attributes.position;
        var arr = pos.array;
        for (var i = 0; i < arr.length; i += 3) {
          var x = arr[i];
          var z = arr[i + 2];
          arr[i + 1] =
            Math.sin(x * 0.45 + s * 1.3) * 0.07 + Math.cos(z * 0.38 + s * 0.9) * 0.06 + Math.sin((x + z) * 0.2 + s * 0.6) * 0.04;
        }
        pos.needsUpdate = true;
      },
      remove: function () {
        this.el.removeObject3D("mesh");
        this.geometria.dispose();
        this.material.dispose();
      },
    });

    /**
     * bahia-torre: torre de monedas. Se anima hacia "costo" (o salta si
     * animar = false). Las primeras cargoFijo/10.000 monedas son plateadas y
     * el resto doradas. Mueve su letrero para que quede sobre la cima.
     */
    A.registerComponent("bahia-torre", {
      schema: {
        costo: { default: 0 },
        cargoFijo: { default: 0 },
        animar: { default: true },
        maxMonedas: { default: 40 },
        letrero: { type: "selector" },
      },
      init: function () {
        if (!recursosMoneda) {
          recursosMoneda = {
            geometria: new THREE.CylinderGeometry(0.42, 0.42, GROSOR_MONEDA, 18),
            oro: new THREE.MeshStandardMaterial({
              color: "#f5b301",
              emissive: "#7a4b00",
              emissiveIntensity: 0.3,
              metalness: 0.35,
              roughness: 0.35,
              flatShading: true,
            }),
            plata: new THREE.MeshStandardMaterial({
              color: "#e2e8f0",
              emissive: "#475569",
              emissiveIntensity: 0.25,
              metalness: 0.3,
              roughness: 0.35,
              flatShading: true,
            }),
          };
        }
        var grupo = new THREE.Group();
        this.monedas = [];
        for (var i = 0; i < this.data.maxMonedas; i++) {
          var moneda = new THREE.Mesh(recursosMoneda.geometria, recursosMoneda.oro);
          moneda.rotation.y = Math.random() * Math.PI; // pila "real", no perfecta
          moneda.position.x = (Math.random() - 0.5) * 0.05;
          moneda.position.z = (Math.random() - 0.5) * 0.05;
          moneda.visible = false;
          grupo.add(moneda);
          this.monedas.push(moneda);
        }
        this.el.setObject3D("torre", grupo);
        this.mostrado = this.data.costo;
      },
      update: function () {
        if (!this.data.animar) this.mostrado = this.data.costo;
        this.pintar();
      },
      tick: function (t, dt) {
        // Primer cuadro: repintar, porque el "position" del letrero puede
        // haberse inicializado después y pisado su altura.
        if (!this.ubicado) {
          this.ubicado = true;
          this.pintar();
        }
        var objetivo = this.data.costo;
        if (this.mostrado === objetivo) return;
        var seg = (dt || 16) / 1000;
        var diferencia = objetivo - this.mostrado;
        // Suave al principio (proporcional) y con una velocidad mínima de
        // $200.000 por segundo, para que termine rápido aun con pocos cuadros.
        var paso = Math.max(Math.abs(diferencia) * Math.min(1, seg * 5), 200000 * seg);
        if (paso >= Math.abs(diferencia)) this.mostrado = objetivo;
        else this.mostrado += diferencia > 0 ? paso : -paso;
        this.pintar();
      },
      pintar: function () {
        var monedas = this.mostrado / PESOS_POR_MONEDA;
        var llenas = Math.floor(monedas + 1e-6);
        var fraccion = monedas - llenas;
        var fijas = Math.round(this.data.cargoFijo / PESOS_POR_MONEDA);
        for (var i = 0; i < this.monedas.length; i++) {
          var m = this.monedas[i];
          m.material = i < fijas ? recursosMoneda.plata : recursosMoneda.oro;
          if (i < llenas) {
            m.visible = true;
            m.scale.y = 1;
            m.position.y = i * ALTO_RANURA + GROSOR_MONEDA / 2;
          } else if (i === llenas && fraccion > 0.03) {
            m.visible = true; // media moneda ($5.000 con media hora)
            m.scale.y = fraccion;
            m.position.y = i * ALTO_RANURA + (GROSOR_MONEDA * fraccion) / 2;
          } else {
            m.visible = false;
          }
        }
        if (this.data.letrero) {
          var altura = this.mostrado / PESOS_POR_UNIDAD;
          this.data.letrero.object3D.position.y = this.el.object3D.position.y + altura + SEPARACION_LETRERO;
        }
      },
      remove: function () {
        this.el.removeObject3D("torre");
      },
    });

    /** bahia-regla: regla vertical de referencia ($50.000 por unidad de altura). */
    A.registerComponent("bahia-regla", {
      schema: { maxPesos: { default: 350000 } },
      init: function () {
        var unidades = this.data.maxPesos / PESOS_POR_UNIDAD;
        var PX = 128;
        var ancho = 1.7;
        var margenAbajo = 0.15;
        var alto = unidades + margenAbajo + 0.35;
        var c = document.createElement("canvas");
        c.width = Math.round(ancho * PX);
        c.height = Math.round(alto * PX);
        var ctx = c.getContext("2d");
        var xBarra = c.width - 18;
        var yCero = c.height - margenAbajo * PX;

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(xBarra - 3, yCero - unidades * PX, 6, unidades * PX);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        for (var k = 0; k <= unidades * 5; k++) {
          ctx.fillRect(xBarra - 10, yCero - k * ALTO_RANURA * PX - 1, 10, 2); // una marca por moneda
        }
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.font = "800 24px Nunito, system-ui, sans-serif";
        for (var u = 0; u <= unidades; u++) {
          var y = yCero - u * PX;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(xBarra - 22, y - 2, 25, 4);
          var etiqueta = pesos(u * PESOS_POR_UNIDAD);
          var anchoTexto = ctx.measureText(etiqueta).width;
          ctx.fillStyle = "rgba(15,23,42,0.72)";
          ctx.fillRect(xBarra - 34 - anchoTexto - 8, y - 16, anchoTexto + 16, 32);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(etiqueta, xBarra - 34, y + 1);
        }
        this.textura = new THREE.CanvasTexture(c);
        this.textura.colorSpace = THREE.SRGBColorSpace;
        this.material = new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, alphaTest: 0.02 });
        this.geometria = new THREE.PlaneGeometry(ancho, alto);
        var malla = new THREE.Mesh(this.geometria, this.material);
        malla.position.y = alto / 2 - margenAbajo; // el "$0" queda a la altura de la entidad
        this.el.setObject3D("mesh", malla);
      },
      remove: function () {
        this.el.removeObject3D("mesh");
        this.textura.dispose();
        this.material.dispose();
        this.geometria.dispose();
      },
    });
  }

  // ─────────────────────────── Marcado de la escena ───────────────────────────

  function attrs(obj) {
    return Object.keys(obj)
      .map(function (k) {
        return k + '="' + obj[k] + '"';
      })
      .join(" ");
  }

  function caja(pos, ancho, alto, prof, color, extra) {
    return (
      "<a-box " + attrs({ position: pos, width: ancho, height: alto, depth: prof, color: color }) + " " + (extra || "") + "></a-box>"
    );
  }

  function proa(pos, radio, alto, color) {
    return (
      '<a-cone position="' + pos + '" rotation="-90 45 0" radius-bottom="' + radio + '" radius-top="0.02" height="' + alto +
      '" segments-radial="4" color="' + color + '" material="flatShading: true"></a-cone>'
    );
  }

  /** Vaivén suave de un bote (se omite con prefers-reduced-motion). */
  function vaiven(x, y, z, yaw, dur, animar) {
    if (!animar) return "";
    return (
      'animation__flota="property: position; from: ' + x + " " + y + " " + z + "; to: " + x + " " + (y + 0.05) + " " + z +
      "; dir: alternate; loop: true; dur: " + dur + '; easing: easeInOutSine" ' +
      'animation__balanceo="property: rotation; from: 0 ' + yaw + " -2; to: 0 " + yaw + " 2; dir: alternate; loop: true; dur: " +
      Math.round(dur * 1.35) + '; easing: easeInOutSine"'
    );
  }

  function envolverBote(x, z, yaw, dur, animar, contenido) {
    var y = 0.1;
    return (
      '<a-entity position="' + x + " " + y + " " + z + '" rotation="0 ' + yaw + ' 0" ' + vaiven(x, y, z, yaw, dur, animar) + ">" +
      contenido + "</a-entity>"
    );
  }

  // Tres embarcaciones distintas hechas con primitivas (estilo low-poly).
  var CONSTRUCTORES_BOTE = [
    // Lancha rápida
    function (x, c, animar) {
      return envolverBote(x + 1.75, -2.4, -10, 2400, animar,
        caja("0 0.14 0", 0.8, 0.3, 1.8, "#f8fafc") +
          caja("0 0.02 0", 0.82, 0.1, 1.82, c) +
          proa("0 0.14 -1.2", 0.42, 0.6, "#f8fafc") +
          '<a-box position="0 0.4 -0.25" rotation="-25 0 0" width="0.7" height="0.24" depth="0.04" material="color: #bae6fd; opacity: 0.75; transparent: true"></a-box>' +
          caja("0 0.34 0.45", 0.56, 0.16, 0.5, c) +
          caja("0 0.34 1", 0.22, 0.42, 0.2, "#1e293b"));
    },
    // Yate de dos pisos
    function (x, c, animar) {
      return envolverBote(x + 1.9, -2.3, -8, 2900, animar,
        caja("0 0.16 0", 1.1, 0.4, 2.6, "#f8fafc") +
          caja("0 0.02 0", 1.12, 0.1, 2.62, c) +
          proa("0 0.16 -1.65", 0.62, 0.7, "#f8fafc") +
          caja("0 0.56 0.25", 0.85, 0.4, 1.2, "#f8fafc") +
          caja("0 0.6 0.25", 0.87, 0.12, 1.02, "#0f172a") +
          caja("0 0.8 0.25", 0.72, 0.08, 0.95, c) +
          caja("0 0.97 0.3", 0.5, 0.26, 0.5, "#f8fafc") +
          '<a-cylinder position="0 1.35 0.3" radius="0.02" height="0.6" color="#94a3b8"></a-cylinder>' +
          caja("0.14 1.55 0.3", 0.26, 0.15, 0.01, c));
    },
    // Catamarán de vela
    function (x, c, animar) {
      return envolverBote(x + 1.8, -2.3, -6, 3300, animar,
        caja("-0.42 0.12 0", 0.3, 0.3, 2.3, c) +
          caja("0.42 0.12 0", 0.3, 0.3, 2.3, c) +
          proa("-0.42 0.12 -1.35", 0.2, 0.4, c) +
          proa("0.42 0.12 -1.35", 0.2, 0.4, c) +
          caja("0 0.31 0.1", 1.15, 0.08, 1.6, "#f8fafc") +
          '<a-cylinder position="0 1.55 0.15" radius="0.035" height="2.5" color="#e2e8f0"></a-cylinder>' +
          '<a-triangle vertex-a="0 2.75 0.15" vertex-b="0 0.45 0.15" vertex-c="0 0.5 1" material="color: #ffffff; side: double; flatShading: true"></a-triangle>' +
          '<a-triangle vertex-a="0 2.5 0.12" vertex-b="0 0.45 -1.05" vertex-c="0 0.45 0.1" material="color: #dcfce7; side: double; flatShading: true"></a-triangle>');
    },
  ];

  function muelleHTML() {
    var h = "";
    for (var k = 0; k < 14; k++) {
      h += caja("0 0.44 " + (2.25 + k * 0.5).toFixed(2), 3, 0.12, 0.46, k % 2 ? "#8a5a12" : "#a16207"); // tablones
    }
    h += caja("-1.3 0.32 5.5", 0.2, 0.14, 7, "#6b4310") + caja("1.3 0.32 5.5", 0.2, 0.14, 7, "#6b4310");
    [2.2, 4.5, 6.8, 9].forEach(function (z) {
      h += '<a-cylinder position="-1.45 0.05 ' + z + '" radius="0.12" height="1.3" color="#5b3a0e" segments-radial="8"></a-cylinder>';
      h += '<a-cylinder position="1.45 0.05 ' + z + '" radius="0.12" height="1.3" color="#5b3a0e" segments-radial="8"></a-cylinder>';
    });
    h += '<a-cylinder position="-1.4 0.75 2.2" radius="0.13" height="0.5" color="#334155" segments-radial="8"></a-cylinder>';
    h += '<a-cylinder position="1.4 0.75 2.2" radius="0.13" height="0.5" color="#334155" segments-radial="8"></a-cylinder>';
    // Salvavidas naranja y blanco
    h += '<a-torus position="1.56 0.95 3.4" rotation="0 90 0" radius="0.26" radius-tubular="0.07" segments-radial="8" segments-tubular="16" color="#ea580c"></a-torus>';
    h += '<a-torus position="1.57 0.95 3.4" rotation="0 90 45" radius="0.26" radius-tubular="0.072" arc="40" segments-radial="8" segments-tubular="6" color="#ffffff"></a-torus>';
    h += '<a-torus position="1.57 0.95 3.4" rotation="0 90 225" radius="0.26" radius-tubular="0.072" arc="40" segments-radial="8" segments-tubular="6" color="#ffffff"></a-torus>';
    // Faroles al final del muelle (detrás de la cámara: se ven al girar)
    [-1.4, 1.4].forEach(function (x) {
      h += '<a-cylinder position="' + x + ' 1.6 8.6" radius="0.04" height="2.2" color="#1e293b"></a-cylinder>';
      h += '<a-sphere position="' + x + ' 2.75 8.6" radius="0.14" segments-width="8" segments-height="6" material="color: #fff1c1; emissive: #ffd27a; emissiveIntensity: 1.4"></a-sphere>';
    });
    return h;
  }

  function cerrosHTML() {
    // [x, z, radio, alto, color]: fila lejana morada y fila cercana verde seco
    var cerros = [
      [-110, -100, 26, 14, "#6a5384"], [-70, -118, 30, 22, "#5b4677"], [-30, -128, 26, 28, "#4b3a6e"],
      [12, -120, 34, 18, "#5b4677"], [55, -130, 30, 26, "#4b3a6e"], [100, -112, 28, 16, "#5b4677"],
      [-55, -86, 18, 10, "#3f5f4a"], [28, -90, 22, 12, "#46684f"], [82, -84, 16, 9, "#3f5f4a"],
    ];
    return cerros
      .map(function (c) {
        return '<a-cone position="' + c[0] + " " + c[3] / 2 + " " + c[1] + '" radius-bottom="' + c[2] + '" radius-top="0" height="' + c[3] +
          '" segments-radial="6" segments-height="1" material="color: ' + c[4] + '; flatShading: true; roughness: 1"></a-cone>';
      })
      .join("");
  }

  // ─────────────────────────── Fábrica del componente ───────────────────────────

  function crear(opciones) {
    var MathUtils = window.BahiaRecta.MathUtils;
    var UI = window.BahiaRecta.UI;
    var el = UI.el;

    var horasMax = opciones.horasMax || 10;
    var puntoComun = opciones.puntoComun || null;
    var alCambiarHoras = opciones.alCambiarHoras || function () {};
    var horas = opciones.horas || 0;

    // Servicios con su función de math.js y su posición en la escena
    var n = opciones.servicios.length;
    var servicios = opciones.servicios.map(function (s, i) {
      return {
        clave: s.clave,
        nombre: s.nombre,
        letra: s.letra,
        m: s.m,
        b: s.b,
        color: s.color,
        fn: MathUtils.linearFunction(s.m, s.b),
        x: (i - (n - 1) / 2) * SEPARACION_TORRES,
      };
    });
    function costo(s, x) {
      return Number(s.fn.evaluate(x));
    }

    // Altura máxima posible → tamaño de la regla y cantidad de monedas
    var costoMax = Math.max.apply(null, servicios.map(function (s) {
      return Math.max(costo(s, 0), costo(s, horasMax));
    }));
    var reglaMax = Math.ceil(costoMax / PESOS_POR_UNIDAD) * PESOS_POR_UNIDAD;
    var maxMonedas = Math.ceil(costoMax / PESOS_POR_MONEDA) + 1;

    var mensajeClave = puntoComun
      ? {
          titulo: "¡Las tres torres están a la misma altura!",
          texto: "Por " + textoHoras(puntoComun.x) + ", los tres servicios cuestan " + pesos(puntoComun.y) + ".",
        }
      : null;

    var estado = {
      montaje: 0,
      destruido: false,
      movimientoReducido: !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
      modo: "normal", // "normal" | "ar" | "camara"
      modoCamara: null, // "ar" | "camara" | null (qué ofrece el botón)
    };
    var refs = {};
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    // ─── HTML del componente ───

    refs.live = el("p", { class: "muelle3d__sr-only", role: "status", "aria-live": "polite" });

    refs.overlayHoras = el("span", { class: "muelle3d__overlay-horas" });
    refs.overlayPista = el("p", { class: "muelle3d__overlay-pista" });
    refs.overlayMomento = el("p", { class: "muelle3d__overlay-momento" });
    refs.overlayMomento.hidden = true;
    refs.overlay = el("div", { id: "muelle3d-overlay", class: "muelle3d__overlay" }, [
      el("div", { class: "muelle3d__overlay-arriba" }, [
        refs.overlayPista,
        el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--salir", text: "✕ Salir", onClick: salirCamara }),
      ]),
      refs.overlayMomento,
      el("div", { class: "muelle3d__overlay-abajo", role: "group", "aria-label": "Cambiar las horas" }, [
        el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--redondo", "aria-label": "Una hora menos", text: "−", onClick: function () { pedirHoras(horas - 1); } }),
        refs.overlayHoras,
        el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--redondo muelle3d__btn--naranja", "aria-label": "Una hora más", text: "+", onClick: function () { pedirHoras(horas + 1); } }),
      ]),
    ]);
    refs.overlay.hidden = true;
    // En AR real, tocar un botón del overlay NO debe mover las torres.
    refs.overlay.addEventListener("beforexrselect", function (evt) {
      evt.preventDefault();
    });

    refs.escena = el("div", {
      class: "muelle3d__escena",
      role: "region",
      "aria-label": "Escena 3D: tres torres de monedas muestran el costo de cada servicio. La misma información está en la tabla de valores.",
    });

    refs.btnCamara = el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--primario", text: "📷 Ver con la cámara", onClick: entrarCamara });
    refs.btnCamara.disabled = true;
    refs.btnCentrar = el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--secundario", text: "⟲ Centrar la vista", onClick: centrarVista });
    refs.btnCentrar.disabled = true;
    refs.notaCamara = el("p", { class: "muelle3d__nota" });

    refs.momento = el("div", { class: "muelle3d__momento" }, mensajeClave ? [
      el("span", { class: "muelle3d__momento-icono", "aria-hidden": "true", text: "★" }),
      el("p", {}, [el("strong", { text: mensajeClave.titulo }), document.createTextNode(" " + mensajeClave.texto)]),
    ] : []);
    refs.momento.hidden = true;

    var elemento = el("section", { class: "muelle3d", "aria-labelledby": "muelle3d-titulo" }, [
      refs.live,
      el("h3", { id: "muelle3d-titulo", text: "Muelle 3D: las tarifas como torres de monedas" }),
      el("ul", { class: "muelle3d__leyenda", "aria-label": "Cómo leer las torres" }, [
        el("li", {}, [
          el("span", { class: "muelle3d__moneda muelle3d__moneda--plata", "aria-hidden": "true" }),
          el("span", { html: "<strong>Plateadas:</strong> cargo fijo (ya están con 0 horas)" }),
        ]),
        el("li", {}, [
          el("span", { class: "muelle3d__moneda muelle3d__moneda--oro", "aria-hidden": "true" }),
          el("span", { html: "<strong>Doradas:</strong> lo que se paga por las horas" }),
        ]),
        el("li", { html: "1 moneda = <strong>$10.000</strong>" }),
      ]),
      refs.escena,
      el("div", { class: "muelle3d__acciones" }, [refs.btnCamara, refs.btnCentrar]),
      refs.notaCamara,
      el("p", {
        class: "muelle3d__ayuda",
        html:
          "<strong>Computador:</strong> arrastra con el mouse para mirar. <strong>Celular:</strong> mueve el teléfono. " +
          "<strong>Gafas VR:</strong> botón VR de la esquina. Las horas se cambian con el control de <em>Explorar horas</em>.",
      }),
      refs.momento,
    ]);

    // ─── Escena ───

    function escenaHTML() {
      var animar = !estado.movimientoReducido;
      var torres = "";
      var botes = "";
      servicios.forEach(function (s, i) {
        var yaw = yawHaciaCamara(s.x, TORRE_Z).toFixed(1);
        torres +=
          caja(s.x + " 0.08 " + TORRE_Z, 1.46, 0.1, 1.46, s.color) +
          caja(s.x + " 0.13 " + TORRE_Z, 1.38, 0.2, 1.38, "#a16207") +
          '<a-entity id="muelle3d-torre-' + s.clave + '" position="' + s.x + " " + BASE_Y + " " + TORRE_Z + '" ' +
          'bahia-torre="costo: ' + costo(s, horas) + "; cargoFijo: " + s.b + "; animar: " + animar + "; maxMonedas: " + maxMonedas +
          "; letrero: #muelle3d-letrero-" + s.clave + '"></a-entity>' +
          '<a-entity id="muelle3d-letrero-' + s.clave + '" position="' + s.x + " " + (BASE_Y + 1) + " " + TORRE_Z + '" rotation="0 ' + yaw + ' 0" ' +
          'bahia-texto="ancho: 3.4; alto: 1.25; acento: ' + s.color + "; colorTitulo: " + s.color + '"></a-entity>';
        botes += CONSTRUCTORES_BOTE[i % CONSTRUCTORES_BOTE.length](s.x, s.color, animar);
      });

      var xRegla = servicios[0].x - 2.5;
      var yPlano = puntoComun ? BASE_Y + puntoComun.y / PESOS_POR_UNIDAD : 0;
      var anchoPlano = servicios[n - 1].x - servicios[0].x + 1.6;
      var plano = puntoComun
        ? '<a-entity id="muelle3d-plano" visible="false" position="0 ' + yPlano + " " + TORRE_Z + '" ' +
          (animar ? 'animation__aparecer="property: scale; from: 0.05 1 1; to: 1 1 1; dur: 700; easing: easeOutCubic; startEvents: aparecer"' : "") + ">" +
          '<a-plane rotation="-90 0 0" width="' + anchoPlano + '" height="2.4" material="shader: flat; color: #fde047; opacity: 0.38; transparent: true; side: double; depthWrite: false" ' +
          (animar ? 'animation__pulso="property: components.material.material.opacity; from: 0.26; to: 0.46; dir: alternate; loop: true; dur: 1400; easing: easeInOutSine"' : "") + "></a-plane>" +
          '<a-box position="0 0 1.2" width="' + anchoPlano + '" height="0.04" depth="0.04" material="shader: flat; color: #facc15"></a-box>' +
          '<a-box position="0 0 -1.2" width="' + anchoPlano + '" height="0.04" depth="0.04" material="shader: flat; color: #facc15"></a-box>' +
          "</a-entity>" +
          '<a-entity id="muelle3d-letrero-clave" visible="false" position="0 ' + (yPlano + 2.4) + ' -3.3" ' +
          'bahia-texto="ancho: 6.4; alto: 1.15; fondo: #fff7ed; acento: #ea580c; colorTitulo: #9a3412; escalaTitulo: 1.1" ' +
          (animar ? 'animation__aparecer="property: scale; from: 0.6 0.6 0.6; to: 1 1 1; dur: 600; easing: easeOutBack; startEvents: aparecer"' : "") +
          "></a-entity>"
        : "";

      return (
        "<a-scene embedded " +
        attrs({
          "loading-screen": "enabled: false",
          "xr-mode-ui": "enabled: true; enterAREnabled: false", // la AR se abre con nuestro botón
          renderer: "antialias: true; alpha: true; colorManagement: true; maxCanvasWidth: 1920; maxCanvasHeight: 1920",
          fog: "type: linear; color: #f2a987; near: 40; far: 170",
          cursor: "rayOrigin: mouse; fuse: false", // sin "fuse": en celulares A-Frame lo activa por defecto
          raycaster: "objects: .muelle3d-clic; far: 40",
          webxr: "overlayElement: #muelle3d-overlay",
          "ar-hit-test": "target: #muelle3d-maqueta; type: map",
          "device-orientation-permission-ui": "enabled: true",
        }) + ">" +
        '<a-entity light="type: hemisphere; color: #ffe2c4; groundColor: #1d4e6b; intensity: 1.1"></a-entity>' +
        '<a-entity light="type: directional; color: #ffd0a0; intensity: 2.2" position="6 10 9"></a-entity>' +
        '<a-entity light="type: ambient; color: #ffffff; intensity: 0.35"></a-entity>' +
        // Entorno: se esconde en los modos con cámara
        '<a-entity id="muelle3d-entorno">' +
        "<a-entity bahia-cielo></a-entity>" +
        '<a-ring position="-24 14 -160" radius-inner="10.5" radius-outer="17" segments-theta="32" material="shader: flat; color: #ffd08a; opacity: 0.4; transparent: true; fog: false"></a-ring>' +
        '<a-circle position="-24 14 -160" radius="11" segments="32" material="shader: flat; color: #ffe29a; fog: false"></a-circle>' +
        cerrosHTML() +
        '<a-entity bahia-oleaje="animar: ' + animar + '"></a-entity>' +
        muelleHTML() +
        "</a-entity>" +
        // Maqueta: torres, botes, regla y plano. Su origen es el centro, para
        // poder ubicarla y escalarla en AR.
        '<a-entity id="muelle3d-maqueta" position="0 0 ' + CENTRO_MAQUETA_Z + '">' +
        '<a-entity position="0 0 ' + -CENTRO_MAQUETA_Z + '">' +
        '<a-cylinder id="muelle3d-base" visible="false" position="0 -0.06 ' + CENTRO_MAQUETA_Z + '" radius="' + (servicios[n - 1].x - xRegla + 2) / 2 +
        '" height="0.1" segments-radial="24" material="color: #0e7490; opacity: 0.85; transparent: true; flatShading: true"></a-cylinder>' +
        botes + torres +
        '<a-entity position="' + xRegla + " " + BASE_Y + " " + TORRE_Z + '" rotation="0 ' + yawHaciaCamara(xRegla, TORRE_Z).toFixed(1) + ' 0" bahia-regla="maxPesos: ' + reglaMax + '"></a-entity>' +
        plano +
        "</a-entity></a-entity>" +
        // Botones 3D para VR: "−", horas y "+" (mirándolos 1,5 s o con el control)
        '<a-entity id="muelle3d-vr" position="0 1.05 3.9" rotation="-30 0 0">' +
        '<a-entity id="muelle3d-vr-menos" class="muelle3d-clic" position="-0.5 0 0" bahia-texto="ancho: 0.36; alto: 0.36; fondo: #0369a1; colorTitulo: #ffffff; radio: 0.18; titulo: −"></a-entity>' +
        '<a-entity id="muelle3d-vr-horas" bahia-texto="ancho: 0.58; alto: 0.36; fondo: #ffffff; colorTitulo: #0369a1; colorTexto: #334155"></a-entity>' +
        '<a-entity id="muelle3d-vr-mas" class="muelle3d-clic" position="0.5 0 0" bahia-texto="ancho: 0.36; alto: 0.36; fondo: #ea580c; colorTitulo: #ffffff; radio: 0.18; titulo: +"></a-entity>' +
        '<a-entity position="0 -0.28 0" bahia-texto="ancho: 1.5; alto: 0.14; fondo: #0f172a; colorTexto: #ffffff; opacidad: 0.65; radio: 0.07; cuerpo: Mira un botón 1,5 s o usa el control"></a-entity>' +
        "</a-entity>" +
        // Estudiante en el muelle: cámara + cursor de mirada + controles VR
        '<a-entity id="muelle3d-rig" position="' + CAMARA.x + " 0.5 " + CAMARA.z + '">' +
        '<a-entity id="muelle3d-camara" camera="fov: 75" look-controls="pointerLockEnabled: false; magicWindowTrackingEnabled: true" wasd-controls="enabled: false" position="0 1.6 0">' +
        '<a-entity id="muelle3d-mira" visible="false" position="0 0 -1" ' +
        'cursor="fuse: true; fuseTimeout: 1500; rayOrigin: entity" raycaster="objects: .muelle3d-clic; far: 15; enabled: false" ' +
        'geometry="primitive: ring; radiusInner: 0.014; radiusOuter: 0.022" material="shader: flat; color: #ffffff; opacity: 0.9; transparent: true" ' +
        'animation__fusing="property: scale; startEvents: fusing; easing: easeInCubic; dur: 1500; from: 1 1 1; to: 0.3 0.3 0.3" ' +
        'animation__salir="property: scale; startEvents: mouseleave; dur: 200; to: 1 1 1"></a-entity>' +
        "</a-entity>" +
        '<a-entity laser-controls="hand: right" raycaster="objects: .muelle3d-clic; far: 20"></a-entity>' +
        '<a-entity laser-controls="hand: left" raycaster="objects: .muelle3d-clic; far: 20"></a-entity>' +
        "</a-entity>" +
        "</a-scene>"
      );
    }

    function montar() {
      estado.montaje += 1;
      var miMontaje = estado.montaje;
      if (!soportaWebGL()) {
        mostrarAlternativa("webgl");
        return;
      }
      refs.escena.innerHTML = "";
      refs.escena.classList.remove("muelle3d__escena--alternativa");
      refs.escena.appendChild(
        el("div", { class: "muelle3d__cargando", role: "status" }, [
          el("span", { class: "muelle3d__cargando-barco", "aria-hidden": "true", text: "⛵" }),
          el("p", { text: "Preparando el muelle 3D…" }),
        ])
      );
      cargarAFrame()
        .then(function () {
          if (estado.destruido || miMontaje !== estado.montaje) return;
          registrarComponentes();
          construir();
        })
        .catch(function (err) {
          console.error("Muelle 3D:", err);
          if (estado.destruido || miMontaje !== estado.montaje) return;
          mostrarAlternativa("red");
        });
    }

    function construir() {
      var lienzo = document.createElement("div");
      lienzo.className = "muelle3d__lienzo";
      lienzo.innerHTML = escenaHTML();
      // El overlay debe existir en el documento cuando A-Frame lee "webxr".
      refs.escena.appendChild(refs.overlay);
      refs.escena.appendChild(lienzo);
      var escena = lienzo.querySelector("a-scene");
      refs.aScene = escena;
      var listo = function () {
        if (refs.aScene === escena) preparar(escena);
      };
      if (escena.hasLoaded) listo();
      else escena.addEventListener("loaded", listo, { once: true });
    }

    function preparar(escena) {
      var q = function (sel) {
        return escena.querySelector(sel);
      };
      refs.torres = {};
      refs.letreros = {};
      servicios.forEach(function (s) {
        refs.torres[s.clave] = q("#muelle3d-torre-" + s.clave);
        refs.letreros[s.clave] = q("#muelle3d-letrero-" + s.clave);
      });
      refs.plano = q("#muelle3d-plano");
      refs.letreroClave = q("#muelle3d-letrero-clave");
      refs.entorno = q("#muelle3d-entorno");
      refs.maqueta = q("#muelle3d-maqueta");
      refs.base = q("#muelle3d-base");
      refs.vr = q("#muelle3d-vr");
      refs.vrHoras = q("#muelle3d-vr-horas");
      refs.rig = q("#muelle3d-rig");
      refs.camara = q("#muelle3d-camara");
      refs.mira = q("#muelle3d-mira");
      refs.planoVisible = false;
      if (refs.letreroClave) refs.letreroClave.setAttribute("bahia-texto", { titulo: mensajeClave.titulo, cuerpo: mensajeClave.texto });

      [[q("#muelle3d-vr-menos"), -1], [q("#muelle3d-vr-mas"), 1]].forEach(function (par) {
        var boton = par[0];
        boton.addEventListener("click", function () {
          pedirHoras(horas + par[1]);
        });
        boton.addEventListener("mouseenter", function () {
          boton.object3D.scale.set(1.15, 1.15, 1.15);
        });
        boton.addEventListener("mouseleave", function () {
          boton.object3D.scale.set(1, 1, 1);
        });
      });

      escena.addEventListener("enter-vr", function () {
        if (escena.is("ar-mode")) {
          activarModoAR();
        } else {
          // VR: el cursor de mirada (fuse) solo se activa aquí, para que en el
          // computador no se pulsen botones solo por mirarlos.
          refs.mira.setAttribute("visible", true);
          refs.mira.setAttribute("raycaster", "enabled", true);
        }
      });
      escena.addEventListener("exit-vr", function () {
        refs.mira.setAttribute("visible", false);
        refs.mira.setAttribute("raycaster", "enabled", false);
        if (estado.modo === "ar") volverAModoNormal();
      });
      escena.addEventListener("ar-hit-test-select", function () {
        refs.overlayPista.textContent = "¡Listo! Camina alrededor de las torres. Toca otro lugar para moverlas.";
        anunciar("Torres ubicadas.");
      });

      var cargando = refs.escena.querySelector(".muelle3d__cargando");
      if (cargando) cargando.parentNode.removeChild(cargando);
      refs.lista = true;
      refs.btnCentrar.disabled = false;
      var lc = refs.camara.components["look-controls"];
      if (lc) lc.pitchObject.rotation.x = INCLINACION_INICIAL;
      actualizar();
      detectarCamara();
    }

    function mostrarAlternativa(motivo) {
      refs.escena.innerHTML = "";
      refs.escena.classList.add("muelle3d__escena--alternativa");
      var hijos = [
        el("p", { class: "muelle3d__alternativa-titulo", text: "🛶 El muelle 3D no está disponible" }),
        el("p", {
          text:
            motivo === "webgl"
              ? "Tu dispositivo o navegador no puede mostrar escenas 3D (no tiene WebGL activado). ¡No te preocupes! Sigue explorando con la gráfica y la tabla de valores."
              : "No pudimos descargar la escena 3D. Revisa tu conexión a internet e inténtalo de nuevo. Mientras tanto, explora con la gráfica y la tabla.",
        }),
      ];
      if (motivo === "red") {
        hijos.push(el("button", { type: "button", class: "muelle3d__btn muelle3d__btn--secundario", text: "Reintentar", onClick: montar }));
      }
      refs.escena.appendChild(el("div", { class: "muelle3d__alternativa" }, hijos));
      refs.btnCamara.disabled = true;
      refs.btnCentrar.disabled = true;
    }

    // ─── Actualización ───

    function anunciar(mensaje) {
      refs.live.textContent = "";
      setTimeout(function () {
        if (!estado.destruido) refs.live.textContent = mensaje;
      }, 60);
    }

    /** Pide a la situación que cambie las horas (ella valida y llama a setHoras). */
    function pedirHoras(x) {
      var limitado = Math.min(horasMax, Math.max(0, Math.round(x * 2) / 2));
      if (limitado !== horas) alCambiarHoras(limitado);
    }

    function actualizar() {
      var esClave = !!puntoComun && Math.abs(horas - puntoComun.x) < 1e-9;
      refs.momento.hidden = !esClave;
      refs.overlayMomento.hidden = !esClave;
      if (esClave) refs.overlayMomento.textContent = "★ " + mensajeClave.titulo;
      refs.overlayHoras.textContent = textoHoras(horas);

      if (!refs.lista) return;
      var animar = !estado.movimientoReducido;
      servicios.forEach(function (s) {
        var c = costo(s, horas);
        refs.torres[s.clave].setAttribute("bahia-torre", { costo: c, animar: animar });
        refs.letreros[s.clave].setAttribute("bahia-texto", { titulo: s.nombre, cuerpo: expresion(s) + "\n" + pesos(c) });
      });
      refs.vrHoras.setAttribute("bahia-texto", { titulo: formatoHoras(horas), cuerpo: horas === 1 ? "hora" : "horas" });

      if (refs.plano) {
        if (esClave && !refs.planoVisible) {
          refs.planoVisible = true;
          refs.plano.setAttribute("visible", true);
          refs.letreroClave.setAttribute("visible", true);
          if (animar) {
            refs.plano.emit("aparecer");
            refs.letreroClave.emit("aparecer");
          }
        } else if (!esClave && refs.planoVisible) {
          refs.planoVisible = false;
          refs.plano.setAttribute("visible", false);
          refs.letreroClave.setAttribute("visible", false);
        }
      }
    }

    function setHoras(x) {
      var anterior = horas;
      horas = x;
      actualizar();
      if (puntoComun && x === puntoComun.x && anterior !== x) anunciar(mensajeClave.titulo + " " + mensajeClave.texto);
    }

    function centrarVista() {
      var lc = refs.camara && refs.camara.components["look-controls"];
      if (!lc) return;
      lc.pitchObject.rotation.x = estado.modo === "camara" ? 0 : INCLINACION_INICIAL;
      lc.yawObject.rotation.y = 0;
      anunciar("Vista centrada en las torres.");
    }

    // ─── Cámara: AR real o cámara de fondo ───

    /** Decide qué ofrece el botón de cámara según el dispositivo. */
    function detectarCamara() {
      if (!window.isSecureContext) {
        refs.notaCamara.textContent =
          "📷 La cámara solo funciona cuando la app está publicada con HTTPS (o abierta en localhost).";
        return;
      }
      var tieneCamara = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      var revisarAR = navigator.xr && navigator.xr.isSessionSupported
        ? navigator.xr.isSessionSupported("immersive-ar").catch(function () { return false; })
        : Promise.resolve(false);
      revisarAR.then(function (soportaAR) {
        if (estado.destruido) return;
        if (soportaAR) {
          estado.modoCamara = "ar";
          refs.btnCamara.textContent = "📷 Ver en realidad aumentada";
          refs.notaCamara.textContent = "Las torres aparecerán sobre el piso o la mesa que tengas en frente.";
        } else if (tieneCamara) {
          estado.modoCamara = "camara";
          refs.btnCamara.textContent = "📷 Ver con la cámara";
          refs.notaCamara.textContent = "Las torres aparecerán flotando sobre lo que muestre tu cámara.";
        } else {
          refs.notaCamara.textContent = "Este navegador no permite usar la cámara.";
          return;
        }
        refs.btnCamara.disabled = false;
      });
    }

    function entrarCamara() {
      if (!refs.lista || estado.modo !== "normal") return;
      if (estado.modoCamara === "ar") {
        refs.aScene.enterAR().catch(function (err) {
          // Si la AR real falla (permisos, ARCore ausente…), se usa la cámara de fondo.
          console.warn("AR no disponible, se usa la cámara de fondo:", err);
          estado.modoCamara = "camara";
          refs.btnCamara.textContent = "📷 Ver con la cámara";
          entrarCamaraDeFondo();
        });
      } else {
        entrarCamaraDeFondo();
      }
    }

    /** Ajusta la maqueta para verla a escala reducida y oculta el entorno. */
    function prepararMaqueta(escala, pos) {
      refs.entorno.setAttribute("visible", false);
      refs.vr.setAttribute("visible", false);
      refs.base.setAttribute("visible", true);
      refs.maqueta.object3D.scale.set(escala, escala, escala);
      refs.maqueta.object3D.position.set(pos.x, pos.y, pos.z);
      refs.aScene.removeAttribute("fog");
      refs.overlay.hidden = false;
      refs.btnCamara.disabled = true;
    }

    function activarModoAR() {
      estado.modo = "ar";
      prepararMaqueta(AR_ESCALA, AR_POSICION);
      refs.rig.object3D.position.set(0, 0, 0); // en AR la cámara es el teléfono real
      refs.overlayPista.textContent = "Apunta al piso o a una mesa y mueve el teléfono despacio. Cuando veas la flecha, toca la pantalla para ubicar las torres.";
      anunciar("Realidad aumentada activada.");
    }

    function entrarCamaraDeFondo() {
      // En iPhone, el permiso del giroscopio debe pedirse dentro del toque.
      var permisoGiro =
        window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function"
          ? DeviceOrientationEvent.requestPermission().catch(function () { return "denied"; })
          : Promise.resolve("granted");
      var pedirVideo = navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });

      Promise.all([pedirVideo, permisoGiro])
        .then(function (res) {
          if (estado.destruido) {
            res[0].getTracks().forEach(function (t) { t.stop(); });
            return;
          }
          estado.stream = res[0];
          refs.video = el("video", { class: "muelle3d__video", autoplay: "", muted: "", playsinline: "" });
          refs.video.muted = true;
          refs.video.srcObject = estado.stream;
          refs.escena.insertBefore(refs.video, refs.escena.firstChild);
          var reproducir = refs.video.play();
          if (reproducir && reproducir.catch) reproducir.catch(function () {});

          estado.modo = "camara";
          prepararMaqueta(window.innerWidth > window.innerHeight ? CAM_ESCALA_HORIZONTAL : CAM_ESCALA_VERTICAL, CAM_POSICION);
          refs.escena.classList.add("muelle3d__escena--camara");
          document.body.classList.add("muelle3d-sin-scroll");
          window.dispatchEvent(new Event("resize")); // A-Frame ajusta el lienzo a pantalla completa
          centrarVista();
          refs.overlayPista.textContent =
            res[1] === "granted"
              ? "Mueve el teléfono para mirar alrededor de las torres."
              : "Arrastra con el dedo para mirar alrededor de las torres.";
          anunciar("Cámara activada. Las torres aparecen sobre la imagen de tu cámara.");
        })
        .catch(function (err) {
          console.warn("No se pudo abrir la cámara:", err);
          refs.notaCamara.textContent =
            err && err.name === "NotAllowedError"
              ? "📷 No diste permiso para usar la cámara. Puedes activarlo en la configuración del navegador."
              : "📷 No se encontró una cámara disponible en este dispositivo.";
          anunciar(refs.notaCamara.textContent);
        });
    }

    function salirCamara() {
      if (estado.modo === "ar") {
        refs.aScene.exitVR(); // "exit-vr" llama a volverAModoNormal
      } else if (estado.modo === "camara") {
        volverAModoNormal();
      }
    }

    function apagarVideo() {
      if (estado.stream) {
        estado.stream.getTracks().forEach(function (t) { t.stop(); });
        estado.stream = null;
      }
      if (refs.video && refs.video.parentNode) refs.video.parentNode.removeChild(refs.video);
      refs.video = null;
    }

    function volverAModoNormal() {
      var eraCamara = estado.modo === "camara";
      estado.modo = "normal";
      apagarVideo();
      refs.overlay.hidden = true;
      refs.escena.classList.remove("muelle3d__escena--camara");
      document.body.classList.remove("muelle3d-sin-scroll");
      if (refs.lista) {
        refs.entorno.setAttribute("visible", true);
        refs.vr.setAttribute("visible", true);
        refs.base.setAttribute("visible", false);
        refs.maqueta.object3D.scale.set(1, 1, 1);
        refs.maqueta.object3D.position.set(0, 0, CENTRO_MAQUETA_Z);
        refs.rig.object3D.position.set(CAMARA.x, 0.5, CAMARA.z);
        refs.aScene.setAttribute("fog", "type: linear; color: #f2a987; near: 40; far: 170");
        centrarVista();
      }
      refs.btnCamara.disabled = !estado.modoCamara;
      if (eraCamara) window.dispatchEvent(new Event("resize"));
      anunciar("Volviste al muelle.");
    }

    // ─── Movimiento reducido ───

    function alCambiarMovimiento() {
      estado.movimientoReducido = mq.matches;
      if (!refs.lista) return;
      refs.aScene.querySelector("[bahia-oleaje]").setAttribute("bahia-oleaje", "animar", !estado.movimientoReducido);
      actualizar();
    }
    if (mq && mq.addEventListener) mq.addEventListener("change", alCambiarMovimiento);

    // ─── Destrucción ───

    function destruir() {
      estado.destruido = true;
      estado.montaje += 1; // invalida una descarga de A-Frame que siga en curso
      if (mq && mq.removeEventListener) mq.removeEventListener("change", alCambiarMovimiento);
      apagarVideo();
      document.body.classList.remove("muelle3d-sin-scroll");
      var escena = refs.aScene;
      refs.lista = false;
      refs.aScene = null;
      if (!escena) return;
      try {
        if (escena.is && (escena.is("vr-mode") || escena.is("ar-mode"))) escena.exitVR();
      } catch (e) {
        /* sin sesión XR activa */
      }
      var renderer = escena.renderer;
      try {
        escena.pause();
      } catch (e) {
        /* la escena aún no había cargado */
      }
      if (escena.parentNode) escena.parentNode.removeChild(escena); // A-Frame libera el renderer
      try {
        if (renderer && renderer.forceContextLoss) renderer.forceContextLoss(); // y el contexto WebGL
      } catch (e) {
        /* nada que liberar */
      }
    }

    actualizar();
    montar();

    return {
      elemento: elemento,
      setHoras: setHoras,
      destruir: destruir,
    };
  }

  window.BahiaRecta.Muelle3D = { crear: crear };
})();
