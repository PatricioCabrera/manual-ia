# 12 · Operación: observabilidad, evals, guardrails y FinOps

## Concepto

Un agente en producción es un sistema **no determinístico** que gasta dinero por cada paso y toma decisiones que nadie escribió explícitamente. Operarlo requiere cuatro disciplinas:

| Disciplina | Pregunta que responde |
|---|---|
| **Observabilidad** | ¿Qué hizo el agente, paso por paso, y cuánto costó? |
| **Evals** | ¿Lo hace bien? ¿Este cambio lo mejoró o lo empeoró? |
| **Guardrails** | ¿Qué entradas y salidas bloqueamos en tiempo real? |
| **FinOps** | ¿Cuánto cuesta por unidad de valor y cómo lo controlamos? |

## Por qué es distinto de operar una API tradicional

En una API tradicional, el mismo input produce el mismo output y el costo por request es casi constante. En un agente:

- El mismo pedido puede tomar **caminos distintos** (3 tool calls hoy, 7 mañana).
- El costo por request varía en un orden de magnitud.
- "Funciona" no es binario: una respuesta puede ser técnicamente correcta y útil, o correcta e inútil.
- Un cambio de **prompt** o de **versión de modelo** es un cambio de comportamiento tan grande como un deploy de código, y muchas veces más impredecible.

## Observabilidad

### Qué es un trace de un agente

El estándar es **OpenTelemetry** con las **convenciones semánticas de GenAI**: nombres y atributos estándar para spans de modelos, agentes y tools. Un trace típico:

```text
invoke_agent "asistente-comercial"          4.2s   $0.031
├── chat claude-...                           1.1s   in: 8.2k (7.9k cached) out: 180
│   └── → tool_use get_ventas
├── execute_tool get_ventas                   0.6s
│   └── [servidor MCP] tools/call get_ventas  0.5s
│       └── SQL SELECT ... ventas_v           0.3s   rows: 1
├── chat claude-...                           0.9s   in: 8.6k (8.2k cached) out: 95
│   └── → tool_use get_stock
├── execute_tool get_stock                    0.4s
└── chat claude-...                           1.2s   in: 9.1k (8.6k cached) out: 240
    └── end_turn
```

Atributos clave de cada span de modelo: modelo usado, tokens de input, de output y cacheados, `stop_reason`, latencia. En cada span de tool: nombre, argumentos (con cuidado por PII), resultado o error y duración.

### Trace distribuido hasta el servidor MCP

Desde la revisión 2026-07-28, MCP define cómo propagar el contexto de OpenTelemetry (`traceparent`) en el `_meta` de cada request. Así el span del servidor MCP y la query SQL quedan **dentro del mismo trace** que el loop del agente. Sin esto, tenés dos sistemas de observabilidad desconectados y diagnosticar latencia es adivinar.

### Métricas que importan

| Métrica | Por qué |
|---|---|
| **Tokens por sesión** (input, output, cacheados) | Base del costo |
| **Cache hit rate** | Si baja de golpe, alguien rompió el prefijo del prompt |
| **Tool calls por sesión** (p50, p95, máximo) | Detecta loops y regresiones de eficiencia |
| **Tasa de error por tool** | Tools rotas o mal descritas |
| **Latencia hasta el primer token y total** | UX |
| **Costo por tarea completada** | La métrica de negocio |
| **Tasa de escalamiento a humano / "no sé"** | Cobertura del agente |
| **Feedback del usuario** (👍/👎) | Señal de calidad barata |

### Herramientas

| Herramienta | Tipo | Nota |
|---|---|---|
| **Langfuse** | Open source, self-hostable | Muy usado; traces, prompts versionados, evals |
| **Arize Phoenix** | Open source | Fuerte en evals y análisis |
| **LangSmith** | SaaS de LangChain | Integración natural con LangGraph |
| **Datadog LLM Observability** | SaaS | Si ya usás Datadog |
| **AgentCore Observability / CloudWatch** | AWS | Nativo si usás AgentCore; traces vía ADOT |

Como todas hablan OpenTelemetry, la instrumentación es portable: instrumentás una vez y elegís backend.

!!! warning "Los traces contienen datos sensibles"
    Prompts, respuestas y resultados de tools incluyen datos de negocio y PII. El backend de observabilidad tiene que tener el **mismo nivel de control de acceso y retención** que los datos originales. Mandar traces con datos de clientes a un SaaS externo sin revisarlo es una fuga.

## Evals

### Concepto

Un **eval** es una prueba automatizada del comportamiento del agente: un conjunto de casos (input + criterio de éxito) que se corre para medir calidad. Es el equivalente de los tests de regresión, adaptado a un sistema no determinístico.

**Sin evals, cada cambio de prompt, de modelo o de tool es un deploy sin tests.** Es la capa más ignorada y la más crítica.

### Niveles de evaluación

| Nivel | Qué evalúa | Cómo | Determinístico |
|---|---|---|---|
| **Tools** | Cada tool por separado | Tests unitarios normales | Sí |
| **Selección de tools** | ¿El agente elige la tool correcta con los argumentos correctos? | Casos con la tool esperada | Casi |
| **Trayectoria** | ¿El camino fue razonable? (sin pasos innecesarios, sin loops) | Comparar la secuencia de tool calls | Parcial |
| **Respuesta final** | ¿Es correcta, completa, fiel a los datos? | Comparación exacta, reglas o **LLM-as-judge** | No |
| **Seguridad** | ¿Resiste injections? ¿Respeta permisos? | Casos adversariales, red teaming | Parcial |

### LLM-as-judge

Un modelo evalúa la respuesta de otro con una rúbrica explícita:

```text
Evaluá la respuesta según estos criterios. Respondé con JSON.
1. ¿Todas las cifras aparecen en los resultados de las tools? (sí/no)
2. ¿Cita la fuente y el período? (sí/no)
3. ¿Responde la pregunta sin información irrelevante? (1-5)
```

Funciona si la rúbrica es **concreta y verificable**. "¿Es buena la respuesta?" produce ruido. Hay que **calibrar el juez** contra evaluaciones humanas en una muestra.

### Cómo construir el primer set de evals

1. **Juntá 30 a 50 preguntas reales** (de usuarios piloto, de tickets o de los logs).
2. Para cada una, definí **qué es éxito**: la tool esperada, la cifra correcta o las condiciones que debe cumplir la respuesta.
3. Agregá **casos negativos**: preguntas fuera de alcance, pedidos de datos no autorizados, injections conocidas.
4. **Corrélo en CI** ante cada cambio de prompt, modelo o tool. Definí un umbral: si baja la tasa de éxito, el cambio no se mergea.
5. **Alimentalo desde producción:** cada 👎 o incidente se convierte en un caso nuevo.

Como el agente no es determinístico, **corré cada caso varias veces** y mirá la tasa de éxito, no un único resultado.

### Evals online

En producción: muestrear conversaciones reales y evaluarlas automáticamente (con un juez) para detectar degradación. AgentCore Evaluations, Langfuse y Phoenix ofrecen esto.

## Guardrails

### Concepto

Filtros determinísticos o basados en modelos que inspeccionan **entradas** y **salidas** en tiempo real y bloquean o modifican lo que viola una política.

| Tipo | Ejemplo |
|---|---|
| **PII** | Detectar y enmascarar números de documento, CBU, mails |
| **Temas denegados** | "No hablar de política ni dar asesoramiento legal" |
| **Contenido** | Toxicidad, lenguaje inapropiado |
| **Prompt attacks** | Detectar intentos de injection o jailbreak en la entrada |
| **Grounding** | Verificar que la respuesta se apoya en las fuentes (detección de alucinaciones) |

En AWS, **Bedrock Guardrails** ofrece estas categorías como servicio, aplicable al modelo de Bedrock o como API independiente sobre cualquier texto.

### Qué pueden y qué no pueden hacer

!!! warning "Los guardrails son probabilísticos"
    Un detector de prompt injection es un clasificador: tiene falsos positivos y falsos negativos. **Reduce** el riesgo, no lo elimina. Es una capa más de defensa en profundidad, nunca el control principal. El control principal sigue siendo la autorización determinística del capítulo 10.

## FinOps de IA

### Qué impulsa el costo

```text
Costo por tarea = Σ por cada llamada al modelo (tokens_in × precio_in + tokens_out × precio_out
                                                 - descuento por caché)
                + infraestructura (runtime, vector store, gateway)
                + tools (Lambdas, queries, APIs de terceros)
```

En la mayoría de los casos, **los tokens del modelo son la línea más grande**. Y dentro de los tokens, **el input acumulado del loop** domina.

### Palancas, ordenadas por impacto

| Palanca | Impacto típico | Cómo |
|---|---|---|
| **Prompt caching** | Muy alto en agentes (el prefijo se repite en cada vuelta) | Orden estable del prompt; nada volátil al principio |
| **Model tiering** | Alto | Modelo chico para routing, clasificación y extracción; modelo grande solo para razonamiento complejo |
| **Menos vueltas del loop** | Alto | Mejores tools (una tool que resuelve lo que antes eran tres) y mejores descripciones |
| **Resultados de tools acotados** | Medio a alto | Agregar y paginar en el servidor |
| **Batch** | ~50% de descuento en APIs de batch | Para procesos no interactivos (clasificar 10.000 documentos de noche) |
| **Límites** | Evita desastres | `max_turns`, presupuesto de tokens por sesión, cuotas por usuario |

### Asignación de costos

Lo que ya hacés con tags en AWS, aplicado a IA:

- **Una identidad o perfil de inferencia por aplicación** para poder atribuir el gasto (en Bedrock, los *application inference profiles* permiten tags de asignación de costos).
- **Un model gateway** (LiteLLM, Portkey o equivalentes) si usás varios proveedores: cuotas y reportes por equipo en un solo lugar.
- **Métrica de unidad:** costo por tarea completada o por usuario activo. "Gastamos USD 3.000 en tokens" no dice nada; "USD 0,04 por consulta resuelta, contra 12 minutos de un analista" sí.

### Detección de anomalías

La métrica más útil para detectar problemas temprano es la **distribución de tokens por sesión**. Un p99 que se dispara indica loops, resultados de tools gigantes o un cambio que rompió el caché. Alertá sobre la distribución, no solo sobre el total diario.

## Antipatrones

| Antipatrón | Consecuencia |
|---|---|
| Actualizar el modelo "porque salió uno nuevo" sin correr evals | Regresiones silenciosas |
| Evaluar con "lo probé con 5 preguntas y anda" | Falsa confianza |
| Juez LLM con rúbrica vaga | Métricas ruidosas que no detectan nada |
| Traces con PII en un SaaS sin revisar | Fuga de datos por la observabilidad |
| Guardrails como único control de seguridad | Falsos negativos = incidentes |
| Modelo grande para todo | Costo varias veces mayor sin mejora medible |
| Solo alertas de presupuesto mensual | Te enterás de un loop a fin de mes |

## Recall

??? question "El cache hit rate del agente pasó de 85% a 10% después de un deploy. ¿Qué buscás primero?"
    Un cambio en el **prefijo** del prompt que varía entre requests: un timestamp o un ID de request agregado al system prompt, un cambio en el **orden de las tools** (por ejemplo, un servidor MCP que no devuelve un orden determinístico), o contenido dinámico movido antes del breakpoint de caché.

??? question "¿Por qué hay que correr cada caso de eval varias veces?"
    Porque el agente es **no determinístico**: el mismo input puede producir caminos y respuestas distintas. Un caso que pasa una vez puede fallar el 30% de las veces. Lo que se mide es la **tasa de éxito** por caso y total, con suficientes repeticiones para que la diferencia entre dos versiones sea significativa.

??? question "Nombrá tres palancas de costo, ordenadas por impacto, para un agente conversacional con 8 tool calls promedio."
    1. **Prompt caching**, porque cada una de las ~9 llamadas reenvía el mismo prefijo (tools + system prompt).
    2. **Reducir vueltas del loop** con mejores tools (una tool que devuelve lo que hoy requiere tres) y descripciones que eviten llamadas erradas.
    3. **Model tiering**: modelo chico para pasos simples (clasificar, extraer) y grande solo para el razonamiento final. También acotar los resultados de las tools.

??? question "¿Qué relación hay entre `traceparent` en el `_meta` de MCP y la observabilidad?"
    Permite **propagar el contexto de trace de OpenTelemetry** del harness al servidor MCP. El servidor crea sus spans (y los de la query SQL) como hijos del span `execute_tool` del agente. Así un único trace muestra el camino completo: decisión del modelo → tool call → servidor MCP → base de datos, con la latencia de cada tramo.
