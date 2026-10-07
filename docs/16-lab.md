# 16 · Lab: roadmap de implementación

Este capítulo es el plan para **construir una versión reducida de AgroCorp** por tu cuenta, de la laptop a AWS con Terraform. No es código completo: es la secuencia, la estructura y el criterio de "terminado" de cada etapa. Construirlo es el paso que convierte este manual en experiencia demostrable.

## Principio del lab

Cada etapa agrega **una sola capa** del capítulo 01 y tiene un criterio de salida verificable. Si una etapa no pasa su criterio, no avanzás: los problemas de identidad o de datos que arrastres se multiplican en la nube.

## Estructura del repositorio

```text
agro-agent-platform/
├── README.md                     # qué es, diagrama, cómo correrlo, decisiones
├── docs/
│   ├── adr/                      # una ADR por decisión (formato del capítulo 15)
│   └── architecture.md
├── mcp-server/                   # servidor MCP agro-sales (Python)
│   ├── src/
│   │   ├── server.py             # tools
│   │   ├── auth.py               # validación de JWT, derivación de alcance
│   │   ├── db.py                 # pool, contexto de sesión, queries parametrizadas
│   │   └── audit.py
│   ├── tests/
│   │   ├── test_tools.py
│   │   └── test_authz.py         # matriz de autorización del capítulo 15
│   └── Dockerfile
├── agent/                        # harness propio (Strands o Claude Agent SDK)
│   ├── src/
│   ├── evals/
│   │   ├── cases.yaml            # 30–50 casos, incluidos negativos
│   │   └── run_evals.py
│   └── Dockerfile
├── db/
│   ├── schema.sql
│   ├── seed.sql                  # datos ficticios
│   └── rls.sql                   # políticas de RLS
├── docker-compose.yml            # entorno local completo
└── infra/                        # Terraform
    ├── modules/
    │   ├── network/
    │   ├── mcp-service/          # ECS service + ALB + WAF + IAM
    │   ├── agent-service/
    │   ├── database/
    │   └── observability/
    └── envs/
        └── dev/
```

## Etapas

### Etapa 0 · El loop desnudo

- **Qué:** correr el agente mínimo del capítulo 03 contra la API del modelo, con una tool en memoria.
- **Aprendés:** `tool_use`, `tool_result`, historial, `stop_reason`.
- **Criterio de salida:** imprimís el JSON crudo de cada request y response y podés explicar cada campo en voz alta.

### Etapa 1 · Servidor MCP local

- **Qué:** servidor `agro-sales` con 3 tools de lectura contra PostgreSQL en Docker (Postgres es más liviano que SQL Server para el lab; el patrón de RLS es equivalente).
- **Probar con:** MCP Inspector, primero por stdio y después por Streamable HTTP.
- **Criterio de salida:** desde el Inspector listás tools, llamás cada una, ves un `isError: true` con un cliente inexistente y un error de protocolo con un argumento inválido. Podés explicar la diferencia.

```yaml
# docker-compose.yml (esqueleto)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev
    volumes:
      - ./db:/docker-entrypoint-initdb.d
  mcp:
    build: ./mcp-server
    environment:
      DATABASE_URL: postgresql://mcp_reader:dev@db/agro
      OIDC_ISSUER: ${OIDC_ISSUER}
      OIDC_AUDIENCE: api://agro-sales-mcp
    ports: ["8000:8000"]
    depends_on: [db]
  agent:
    build: ./agent
    environment:
      MCP_URL: http://mcp:8000/mcp
    depends_on: [mcp]
  langfuse:
    image: langfuse/langfuse:latest   # fijá una versión concreta en tu repo
    # ver docs de Langfuse para su propio Postgres y variables
```

### Etapa 2 · Consumirlo desde dos hosts

- **Qué:** conectar el mismo servidor a **Claude Code** (como MCP HTTP local) y a **tu harness** (Strands o Claude Agent SDK).
- **Aprendés:** el servidor MCP es portable; el host cambia.
- **Criterio de salida:** la misma pregunta, en los dos hosts, llama las mismas tools. Anotás las diferencias de comportamiento y las atribuís a la capa correcta (prompt, harness o modelo).

### Etapa 3 · Identidad

- **Qué:** registrar una aplicación en un IdP (Entra ID si tenés un tenant de desarrollo, o Cognito), validar JWT en el servidor (firma vía JWKS, `iss`, `aud`, `exp`), publicar `/.well-known/oauth-protected-resource` y devolver `401` con `WWW-Authenticate` sin token.
- **Criterio de salida:** sin token → `401`; token de otra audiencia → rechazado; token válido → acceso. Tests automatizados de los tres casos.

### Etapa 4 · Autorización en la capa de datos

- **Qué:** RLS en Postgres (`CREATE POLICY` con `current_setting('app.zona')`) o en SQL Server con `SESSION_CONTEXT`, y el servidor fijando el contexto por request.
- **Criterio de salida:** `test_authz.py` reproduce la **matriz de autorización del capítulo 15** (Ana, Bruno, Carla, Diego, sin grupo) y pasa. Incluí un test que simule reuso de conexión del pool entre usuarios distintos.

```sql
-- Equivalente en PostgreSQL
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY ventas_por_zona ON ventas
    USING (
        zona = current_setting('app.zona', true)
        OR current_setting('app.rol', true) = 'GerenteComercial'
    );
-- En cada request, dentro de la transacción:
-- SELECT set_config('app.zona', 'NORTE', true);   -- true = solo esta transacción
```

### Etapa 5 · Observabilidad

- **Qué:** OpenTelemetry en harness y servidor MCP, propagando `traceparent` en `_meta`. Backend: Langfuse local.
- **Criterio de salida:** un solo trace muestra la llamada al modelo, la tool call, el span del servidor MCP y la query SQL, con tokens y latencias.

### Etapa 6 · Evals

- **Qué:** 30 casos en `cases.yaml`: 20 positivos, 5 fuera de alcance y 5 de autorización o injection. Cada caso se corre 3 veces.
- **Criterio de salida:** un comando reporta la tasa de éxito por categoría; lo corre CI (GitHub Actions) y falla si baja del umbral.

### Etapa 7 · AWS con Terraform

- **Qué:** llevar `mcp-server` y `agent` a ECS Fargate, la base a RDS, secretos a Secrets Manager, el modelo a Bedrock vía VPC endpoint, y el servidor MCP detrás de un ALB con WAF.
- **Módulos mínimos:** `network`, `database`, `mcp-service`, `agent-service`, `observability`.
- **Criterio de salida:** `terraform apply` desde cero levanta todo; los tests de autorización corren contra el entorno de AWS y pasan; no hay ningún secreto en variables de Terraform en texto plano ni en las imágenes.

### Etapa 8 · Publicar en un asistente

- **Qué:** exponer el servidor por HTTPS público (ALB + WAF + certificado ACM) y conectarlo como **conector personalizado en Claude** o **app en modo desarrollador de ChatGPT**.
- **Criterio de salida:** un usuario de prueba se loguea vía OAuth y consulta datos de su zona desde el asistente; otro usuario no ve los datos del primero.

## Definición de "terminado" para portfolio

- [ ] README con diagrama, problema, decisiones y cómo correrlo en 5 minutos (`docker compose up`).
- [ ] ADRs de las decisiones principales (transporte, identidad, RLS, topología).
- [ ] Tests de autorización visibles en CI.
- [ ] Un reporte de evals con resultados reales.
- [ ] Captura del trace completo.
- [ ] Video de 3 minutos: la misma pregunta hecha por dos usuarios con alcances distintos, y el trace que lo explica.

La línea de CV que habilita este lab: *"Diseñé e implementé una plataforma de agentes de IA sobre AWS con MCP, propagación de identidad OIDC y Row-Level Security, con observabilidad OpenTelemetry de punta a punta y evals en CI."* Cada palabra de esa línea queda respaldada por un artefacto del repositorio.

## Recall

??? question "¿Por qué la etapa 4 (RLS) va antes que la etapa 7 (AWS)?"
    Porque la autorización es la propiedad más crítica y la más difícil de corregir después. Si llegás a AWS con la autorización sin probar, cada problema aparece mezclado con problemas de red, IAM y despliegue, y es mucho más caro de diagnosticar. Localmente, un test de autorización corre en segundos.

??? question "¿Qué verifica exactamente el test de 'reuso de conexión del pool'?"
    Que si una conexión quedó con el contexto de sesión del usuario A (zona Norte) y el siguiente request es del usuario B (zona Sur), **B no ve datos de Norte**. Es decir, que el contexto se fija en cada request y no se hereda. Es el bug de autorización más probable con RLS basado en contexto de sesión.
