# Manual de Arquitectura de Agentes de IA

Manual de estudio en MkDocs sobre modelo, harness, MCP, contexto, identidad y operación de agentes de IA en entornos corporativos, con el mapeo de cada componente a ChatGPT Enterprise, Amazon Bedrock + AgentCore e infraestructura propia (octubre 2026).

Publicado en: https://patriciocabrera.com/manual-ia/

## Cómo correrlo local

```bash
python3 -m venv .venv
source .venv/bin/activate          # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

Abrí http://127.0.0.1:8000. Los cambios en `docs/` se recargan solos.

Para validar como lo hace CI (falla ante cualquier warning o link roto):

```bash
mkdocs build --strict
```

`requirements.txt` fija las versiones exactas. MkDocs 2.0 rompe la compatibilidad con Material, así que el proyecto se queda en 1.x.

Los diagramas Mermaid se cargan desde un CDN la primera vez, así que necesitás conexión a internet para verlos. Con un clic se abren a pantalla completa, con zoom y paneo.

## Estructura

- `mkdocs.yml`: configuración, tema y navegación.
- `docs/`: un archivo Markdown por capítulo.
    - Parte I y II: fundamentos y piezas (modelo, APIs, loop, contexto, harness, MCP, topologías, RAG).
    - Parte III: identidad, patrones, operación, local vs cloud y mapa de mercado.
    - Parte IV: del concepto al servicio (ChatGPT, Bedrock, AgentCore), caso AgroCorp y lab.
- `docs/glosario.md`: definiciones cortas con el capítulo de referencia.

Los diagramas están en Mermaid y los renderiza el tema. Las preguntas de recall usan admonitions plegables (`??? question`).

## Publicación

El workflow `.github/workflows/pages.yml` corre `mkdocs build --strict` en cada PR y, en `main`, publica en GitHub Pages con `actions/deploy-pages`. El sitio queda bajo el dominio del user site (`patriciocabrera.github.io` con dominio propio), en el path `/manual-ia/`.
