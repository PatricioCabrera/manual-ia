// Permite ampliar los diagramas Mermaid a pantalla completa, con zoom
// (rueda del mouse / pellizco) y paneo (arrastrar).
//
// Material renderiza cada diagrama dentro de un shadow root CERRADO
// (`.mermaid` es el host, el <svg> real vive adentro del shadow root).
// Eso significa dos cosas:
//   1. No se puede leer ni clonar el <svg> desde afuera (shadowRoot
//      devuelve null en modo "closed"), así que no alcanza con
//      `svg.cloneNode(true)`.
//   2. Los clics/gestos dentro del diagrama se re-targetean al host
//      `.mermaid` antes de llegar a document, así que un selector como
//      `.mermaid svg` nunca hace match.
// La solución es mover el nodo real (`.mermaid`, con su shadow root y
// todo) al overlay en vez de clonarlo, y devolverlo a su lugar al cerrar.
// Como no podemos leer el <svg> interno, el zoom se hace con `transform`
// sobre el host: eso escala visualmente todo su contenido (shadow
// incluido) sin necesitar acceso a él.
(function () {
  var MIN_USER_ZOOM = 0.4;
  var MAX_USER_ZOOM = 8;
  var ZOOM_STEP = 1.15;

  function closeOverlay(overlay, mermaidEl, parent, nextSibling, onKeydown) {
    mermaidEl.style.transform = "";
    mermaidEl.style.cursor = "";
    parent.insertBefore(mermaidEl, nextSibling);
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
  }

  function openOverlay(mermaidEl) {
    var parent = mermaidEl.parentNode;
    var nextSibling = mermaidEl.nextSibling;

    var overlay = document.createElement("div");
    overlay.className = "mermaid-zoom-overlay";
    overlay.appendChild(mermaidEl);

    var hint = document.createElement("div");
    hint.className = "mermaid-zoom-hint";
    hint.textContent =
      "Scroll para zoom · arrastrá para mover · Esc o clic afuera para cerrar";
    overlay.appendChild(hint);

    document.body.appendChild(overlay);

    // Medimos el tamaño natural DESPUÉS de moverlo al overlay, no antes:
    // en la página, `.mermaid` es un flex item que se estira al ancho de
    // la columna de contenido, así que su rect ahí no es el tamaño real
    // del diagrama. Recién en el overlay (centrado, sin estirarse) el
    // rect refleja el tamaño intrínseco real.
    var rect = mermaidEl.getBoundingClientRect();

    // Escala base: el diagrama ocupa todo el espacio disponible.
    var fitScale = 1;
    if (rect.width > 0 && rect.height > 0) {
      var maxWidth = window.innerWidth * 0.92;
      var maxHeight = window.innerHeight * 0.85;
      fitScale = Math.min(maxWidth / rect.width, maxHeight / rect.height);
    }

    var userZoom = 1;
    var panX = 0;
    var panY = 0;

    function applyTransform() {
      mermaidEl.style.transform =
        "translate(" + panX + "px, " + panY + "px) scale(" + fitScale * userZoom + ")";
    }
    applyTransform();
    mermaidEl.style.cursor = "grab";

    function onWheel(event) {
      event.preventDefault();
      var factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      userZoom = Math.min(MAX_USER_ZOOM, Math.max(MIN_USER_ZOOM, userZoom * factor));
      applyTransform();
    }

    var dragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var panStartX = 0;
    var panStartY = 0;

    function onPointerDown(event) {
      dragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      panStartX = panX;
      panStartY = panY;
      mermaidEl.style.cursor = "grabbing";
      mermaidEl.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragging) return;
      panX = panStartX + (event.clientX - dragStartX);
      panY = panStartY + (event.clientY - dragStartY);
      applyTransform();
    }

    function onPointerUp() {
      dragging = false;
      mermaidEl.style.cursor = "grab";
    }

    mermaidEl.addEventListener("wheel", onWheel, { passive: false });
    mermaidEl.addEventListener("pointerdown", onPointerDown);
    mermaidEl.addEventListener("pointermove", onPointerMove);
    mermaidEl.addEventListener("pointerup", onPointerUp);
    mermaidEl.addEventListener("pointercancel", onPointerUp);

    function cleanupAndClose() {
      mermaidEl.removeEventListener("wheel", onWheel);
      mermaidEl.removeEventListener("pointerdown", onPointerDown);
      mermaidEl.removeEventListener("pointermove", onPointerMove);
      mermaidEl.removeEventListener("pointerup", onPointerUp);
      mermaidEl.removeEventListener("pointercancel", onPointerUp);
      closeOverlay(overlay, mermaidEl, parent, nextSibling, onKeydown);
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        cleanupAndClose();
      }
    }

    // Solo cierra si el clic fue en el fondo (no en el diagrama, que ahora
    // usa el clic/arrastre para paneo).
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target === hint) {
        cleanupAndClose();
      }
    });
    document.addEventListener("keydown", onKeydown);
  }

  document.addEventListener("click", function (event) {
    var mermaidEl = event.target.closest(".mermaid");
    if (mermaidEl && !mermaidEl.closest(".mermaid-zoom-overlay")) {
      openOverlay(mermaidEl);
    }
  });
})();
