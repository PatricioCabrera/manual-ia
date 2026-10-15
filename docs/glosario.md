# Glosario

Definiciones cortas para repaso rápido. Entre paréntesis, el capítulo donde se desarrolla.

**A2A (Agent-to-Agent)**
: Protocolo abierto para que un agente delegue tareas en otro agente autónomo. Complementa a MCP: MCP conecta agentes con herramientas; A2A, agentes con agentes. (06, 11)

**ABAC con session tags**
: Autorización basada en atributos en AWS: se asume un rol IAM con tags de sesión (zona, sociedad) y las policies los referencian con `${aws:PrincipalTag/...}`. (10)

**Agente**
: Sistema que usa un modelo para decidir, en un loop, qué acciones ejecutar y observa cada resultado antes del siguiente paso. Modelo + harness + tools + instrucciones. (01)

**AgentCore (Amazon Bedrock AgentCore)**
: Suite modular de AWS para agentes en producción: Runtime, Harness, Gateway, Identity, Memory, Policy, Observability, Evaluations y otros. (05, 07, 14)

**Agentic search**
: El agente busca información con tools (búsqueda léxica, lectura de archivos) de forma iterativa, en lugar de un paso fijo de RAG. (09)

**Anotaciones de tool**
: Pistas declaradas por el servidor MCP sobre el comportamiento de una tool: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. No son garantías. (06)

**Audiencia (`aud`)**
: Claim de un token que indica para qué servicio fue emitido. El servidor debe rechazar tokens emitidos para otro. (02)

**CIMD (Client ID Metadata Documents)**
: Mecanismo de registro de clientes OAuth en MCP donde el `client_id` es una URL HTTPS con la metadata del cliente. Reemplaza a DCR. (06)

**Chunking**
: División de documentos en fragmentos para indexarlos en un RAG. (09)

**Claude Agent SDK**
: El motor de Claude Code publicado como librería (Python/TypeScript) para construir harness propios. (05)

**Claude Managed Agents**
: Servicio de Anthropic que hospeda el harness, las sesiones y los sandboxes; admite sandboxes self-hosted y túneles MCP. (05, 07)

**Client credentials**
: Flujo OAuth máquina a máquina: el token representa a la aplicación, no a un usuario. (02)

**Compactación**
: Resumir el historial para liberar espacio en la ventana de contexto. (04)

**Confused deputy**
: Un intermediario con privilegios que ejecuta, a pedido de alguien con menos privilegios, acciones que ese alguien no podría hacer. El riesgo central de un servidor MCP con service account. (06, 10)

**Context engineering**
: Diseño de qué entra en la ventana de contexto, en qué orden, formato y momento. (04)

**Context window (ventana de contexto)**
: Todo el texto que el modelo ve en un request. Tiene un máximo en tokens. (01, 04)

**DCR (Dynamic Client Registration)**
: Registro automático de clientes OAuth (RFC 7591). Deprecado en MCP a favor de CIMD. (06)

**Embedding**
: Vector numérico que representa el significado de un texto; textos parecidos quedan cerca. (09)

**Enterprise-Managed Authorization (EMA)**
: Extensión de MCP para que el IdP corporativo gobierne qué servidores MCP puede usar cada usuario. (06)

**Evals**
: Pruebas automatizadas del comportamiento de un agente, medidas como tasa de éxito. (12)

**Framework (de agentes)**
: Librería con la que se escribe un harness: Claude Agent SDK, Strands, LangGraph, etc. (05)

**Function calling / tool use**
: Capacidad del modelo de responder con una solicitud estructurada para ejecutar una función (nombre + argumentos JSON). (03)

**Guardrails**
: Filtros sobre entradas y salidas (PII, temas, prompt attacks, grounding). Probabilísticos: reducen riesgo, no lo eliminan. (12)

**Harness**
: El programa que ejecuta el loop del agente: ensambla contexto, llama al modelo, ejecuta tools, maneja estado, permisos y errores. (01, 05)

**Host (MCP)**
: La aplicación de IA que contiene al modelo, al loop y a los clientes MCP: Claude, ChatGPT, tu agente. (06)

**Human-in-the-loop**
: Aprobación humana obligatoria antes de ciertas acciones del agente. (10)

**Idempotencia**
: Ejecutar una operación dos veces tiene el mismo efecto que una. Crítico en tools de escritura. (02)

**Indirect prompt injection**
: Instrucciones adversariales que llegan al contexto dentro de datos (documentos, resultados de tools, mails), no del usuario. (04, 06)

**JSON-RPC 2.0**
: Especificación mínima de llamadas a procedimientos remotos en JSON (request, response, error, notification). El formato de mensajes de MCP. (02)

**JSON Schema**
: Formato para describir la forma de un JSON. Define los parámetros de las tools. (02)

**JWT**
: Token firmado en formato `header.payload.firma` con claims (`iss`, `sub`, `aud`, `exp`, roles). (02)

**LangGraph**
: Framework para modelar agentes como grafos de estados explícitos, con checkpoints y human-in-the-loop. (05)

**LLM-as-judge**
: Usar un modelo para evaluar respuestas de otro con una rúbrica explícita. (12)

**MCP (Model Context Protocol)**
: Protocolo abierto para que aplicaciones de IA descubran y usen tools, resources y prompts de servidores externos, sobre JSON-RPC, por stdio o Streamable HTTP, con OAuth 2.1. (06)

**MCP Apps**
: Extensión oficial de MCP para que los servidores entreguen interfaces HTML interactivas que el host renderiza aislado. Base de las apps con UI en ChatGPT y Claude. (06, 08)

**MCP gateway / registry**
: Punto central que cataloga, autentica, autoriza y audita servidores MCP para toda la organización. (01, 07)

**Model gateway**
: Proxy entre aplicaciones y proveedores de modelos: cuotas, routing, costos por equipo, logs. (01, 12)

**Modelo**
: Red neuronal sin estado que, dado un texto, genera la continuación. Se consume por API. (01)

**MRTR (Multi Round-Trip Requests)**
: Patrón de MCP 2026-07-28: el servidor responde `input_required` y el cliente reintenta el request con las respuestas del usuario. Reemplaza a elicitation/sampling iniciados por el servidor. (06)

**OBO (On-Behalf-Of) / Token exchange**
: Intercambiar el token de un usuario por otro con distinta audiencia, que sigue representando al mismo usuario. Mecanismo de propagación de identidad. (02, 10)

**OIDC (OpenID Connect)**
: Capa de autenticación sobre OAuth; agrega el ID token. Base del SSO corporativo. (02)

**Orquestador-workers**
: Patrón multi-agente donde un agente descompone la tarea, delega en otros y sintetiza. (11)

**PKCE**
: Extensión de OAuth que impide canjear un código de autorización interceptado. Obligatoria en OAuth 2.1. (02)

**Plugin (ChatGPT)**
: Paquete distribuible en un workspace de ChatGPT que combina apps (servidores MCP: datos, auth, acciones) y skills (flujo de trabajo). (15)

**Prompt caching**
: El proveedor reutiliza el procesamiento de un prefijo idéntico del prompt; la lectura cacheada cuesta ~10% del input normal. (04)

**Protected Resource Metadata (RFC 9728)**
: Documento en `/.well-known/oauth-protected-resource` donde un servidor MCP indica qué authorization server usar. (06)

**RAG (Retrieval-Augmented Generation)**
: Recuperar fragmentos de documentos relevantes y agregarlos al contexto antes de responder. (09)

**Reranking**
: Reordenar candidatos recuperados con un modelo más preciso. (09)

**Resource (MCP)**
: Dato de solo lectura identificado por URI que el host puede agregar al contexto. Controlado por la aplicación. (06)

**Routing**
: Clasificar cada pedido y derivarlo al agente o flujo especializado correspondiente. (11)

**RLS (Row-Level Security)**
: Filtrado de filas en la base según la identidad o el contexto de la sesión. (10)

**Runtime**
: Dónde se ejecuta el proceso del harness: laptop, Lambda, ECS, AgentCore Runtime. (05)

**Runtime con protocolo MCP (AgentCore)**
: Modo de AgentCore Runtime que hospeda un servidor MCP propio (Streamable HTTP en `:8000/mcp`) con validación de JWT de entrada. Es la forma gestionada de publicar el servidor MCP de una app de ChatGPT. (15)

**Sandbox**
: Entorno aislado donde el agente ejecuta código o comandos. (05)

**SESSION_CONTEXT**
: Mecanismo de SQL Server para asociar pares clave-valor a una sesión, usable por políticas de RLS. (10)

**Skill**
: Paquete de instrucciones y archivos (`SKILL.md`) que el agente carga solo cuando la tarea lo requiere (progressive disclosure). Formato abierto: lo usan ChatGPT, Claude y Codex. Orienta el flujo, nunca autoriza. (04, 15)

**SSE (Server-Sent Events)**
: Formato de streaming HTTP (`text/event-stream`) para mandar eventos del servidor al cliente. (02)

**stdio (transporte)**
: Transporte MCP local: el host lanza el servidor como subproceso y se comunican por stdin/stdout. (06)

**Strands Agents**
: Framework open source de AWS, model-driven; base del harness gestionado de AgentCore. (05)

**Streamable HTTP**
: Transporte MCP remoto: un endpoint HTTP que recibe POST con mensajes JSON-RPC y responde JSON o SSE. (06)

**Subagente**
: Agente invocado por otro para una subtarea, con su propia ventana de contexto. (11)

**System prompt**
: Instrucciones de mayor jerarquía para el modelo: rol, reglas, contexto estable, formato. (04)

**Token passthrough**
: Antipatrón: reenviar el token recibido por el servidor MCP a otras APIs. (06)

**Tool**
: Capacidad que el modelo puede pedir, definida por nombre, descripción y schema. El modelo pide; el harness ejecuta. (01, 03)

**Tool poisoning**
: Instrucciones maliciosas ocultas en la descripción de una tool. (06)

**Tríada letal**
: Datos privados + contenido no confiable + canal de salida en el mismo agente = riesgo de exfiltración. (06)

**`traceparent`**
: Header/campo de OpenTelemetry que propaga el contexto de trace entre servicios; MCP lo transporta en `_meta`. (06, 12)
