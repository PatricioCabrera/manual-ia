# Manual de Arquitectura de Agentes de IA

Manual de estudio en MkDocs sobre modelo, harness, MCP, contexto, identidad y operación de agentes de IA en entornos corporativos (septiembre 2026).

## Cómo abrirlo en el browser

```bash
python3 -m venv .venv
source .venv/bin/activate          # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

Abrí http://127.0.0.1:8000. Los cambios en `docs/` se recargan solos.

Para generar el sitio estático (carpeta `site/`, abrible sin servidor):

```bash
mkdocs build
```

`requirements.txt` fija MkDocs 1.x: MkDocs 2.0 rompe la compatibilidad con el tema Material.

Los diagramas Mermaid se cargan desde un CDN la primera vez, así que necesitás conexión a internet para verlos.

## Estructura

- `mkdocs.yml`: configuración, tema y navegación.
- `docs/`: un archivo Markdown por capítulo.

Los diagramas están en Mermaid y los renderiza el tema. Las preguntas de recall usan admonitions plegables (`??? question`).
