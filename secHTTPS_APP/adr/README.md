# ADR — Architecture Decision Records

Este directorio contiene los **Registros de Decisiones de Arquitectura** del proyecto
`secHTTPS_APP`.

Un ADR documenta una decisión de diseño o arquitectura importante: *qué* se decidió,
*por qué* se tomó esa decisión y *cuáles* son sus consecuencias. No es un manual de uso
ni un tutorial — es el historial razonado de las elecciones técnicas del proyecto.

---

## Por qué mantener ADRs

- Los nuevos miembros del equipo entienden por qué el sistema está construido así, no
  solo cómo está construido.
- Evita repetir debates ya resueltos.
- Documenta alternativas desechadas y los motivos, lo que ayuda a re-evaluar en el futuro
  cuando el contexto cambie.
- Facilita las revisiones de código cuando la PR cambia una decisión anterior.

---

## Cuándo escribir un ADR

Escribe un ADR cuando tomes una decisión que:

- sea **difícil de revertir** sin un esfuerzo significativo,
- afecte a **múltiples partes del sistema** o al equipo completo,
- implique elegir entre varias opciones razonables con trade-offs importantes,
- sea probable que alguien pregunte "¿por qué está hecho así?" en el futuro.

No hace falta un ADR para cada cambio menor — solo para las decisiones de peso.

---

## Plantilla

Copia este bloque en un nuevo archivo `NNN_titulo-breve.md`:

```markdown
# NNN — Título breve (tiempo verbal presente: "Usar X para Y")

**Fecha:** AAAA-MM-DD
**Estado:** Propuesto | Aceptado | Obsoleto | Sustituido por ADR-NNN

## Contexto

Descripción del problema o situación que motivó la decisión. Qué restricciones existían
(técnicas, de equipo, de tiempo, de coste). Cuál era el estado anterior si lo había.

## Opciones consideradas

- **Opción A:** descripción breve — pros / contras
- **Opción B:** descripción breve — pros / contras
- **Opción C (elegida):** descripción breve — pros / contras

## Decisión

"Se elige **Opción C** porque..."

Explicar el razonamiento principal. Ser concreto.

## Consecuencias

**Positivas:**
- ...

**Negativas / trade-offs asumidos:**
- ...

**Neutras / acciones derivadas:**
- ...
```

---

## Convención de nombres

```
001_clean-architecture-hexagonal.md
002_trpc-para-frontend-rest-para-integracion.md
003_inMemory-para-testing-sin-bd.md
NNN_descripcion-en-minusculas-con-guiones.md
```

Los números son correlativos e inmutables. No se reutilizan los números de ADRs obsoletos.

---

## ADRs de este proyecto

| ADR | Título | Estado |
|---|---|---|
| *(ninguno aún — este es el directorio inicial)* | | |

Añade aquí una fila por cada ADR que crees.

---

## Referencias

- [Architectural Decision Records — adr.github.io](https://adr.github.io/)
- [Michael Nygard — Documenting Architecture Decisions (artículo original)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
