# Phase Context

**Phase:** 12 — Telemetry unit system + new widget types
**Generated:** 2026-08-12
**Status:** Discussed and designed, plan approved by user in a Claude Code session, all 5 plans applied 2026-08-12 — **resequenced to run first**, ahead of the testing harness (now Phase 12, see `.paul/phases/12-testing-harness/`), per explicit user decision

## Goals

- Every widget that renders a telemetry value can carry a real unit, not just 5 of 17 types.
- One shared formatter instead of the two duplicated ones (`formatTelemetryValue` in `frontend/src/lib/format.ts` and `formatValue` in `frontend/src/widgets/charts/chart-shared.ts`).
- A catalog-backed unit picker in the Add-widget config panel, replacing free-text `<Input maxLength={12}>`.
- Five new widgets: progress-bar (gauge style flag), stacked bar (bar-chart flag), sparkline tile (value-tile flag), a multi-key comparison chart (genuinely new type), and a static label/text widget (genuinely new type).

## How this was scoped

Explored via two parallel Explore agents (units-handling trace + widget-pipeline trace across both `backend/src/dashboards/` and `frontend/src/dashboards/`), then a Plan agent produced a 5-phase implementation design with explicit pushback. Four `AskUserQuestion` decisions locked the direction before planning:

1. **Conversion happens frontend-side**, not backend — avoids building the `telemetry_definitions`/`unit_categories`/`unit_conversions`/`user_unit_preferences` catalog (4 Postgres tables) that `.paul/ARCHITECTURE.md` already marks as V2, and that `.paul/rules/api.md:9` describes but was never built.
2. **No user unit preferences for now** — no Prisma model, no `/users/me/preferences` endpoint, no settings UI/context. Confirmed by the Plan agent as creating zero later debt: the catalog module needs no consumer to exist, so preferences are additive when someone actually asks for them.
3. **Units first, then widgets** — matches the user's stated priority; each phase ships independently.
4. **No iframe/embed widget** — dropped for risk (clickjacking/exfiltration on dashboards shared with customers via `DashboardCustomerAccess`) with no concrete use case to justify it yet.

## Approved plan (verbatim, from the Claude Code plan file)

The full phased design below was approved by the user 2026-08-12 and should be brought into the formal `PLAN.md`(s) at `/paul:plan` time rather than re-discussed from scratch. It already names exact files, line numbers, and code shapes as of that session — **re-verify against current code before executing**, since Phase 11 (testing) and any other work will land first and may shift line numbers.

---

Corre antes de testing (Phase 12, ver `.paul/phases/12-testing-harness/CONTEXT.md`) — el usuario decidió explícitamente arrancar esta fase primero. Este plan no incluye setup de Jest ni tests automatizados; solo los `*.check.ts` assert-based manuales que ya son el patrón del repo.

### Contexto

Hoy `unit` es texto libre limitado a 5 de 17 tipos de widget (gauge/battery/rssi via `scale`, calendar-heatmap, value-map; scatter tiene xUnit/yUnit aparte). Line/bar/tablas/value-tile/value-cards muestran números pelados. Hay dos formatters duplicados (`formatTelemetryValue` en `frontend/src/lib/format.ts` y `formatValue` en `chart-shared.ts`) que hacen lo mismo y ninguno toma unidad.

Se decidió explícitamente: conversión de unidades (si algún día existe) va en el frontend, no en el backend — evita construir ya el catálogo `telemetry_definitions`/`unit_conversions` de 4 tablas que `.paul/ARCHITECTURE.md` marca como V2. **Sin preferencias de usuario por ahora** (ni tabla, ni endpoint, ni settings UI) — se agrega después sin retrabajo porque el catálogo no necesita un consumidor todavía. **Sin widget de iframe** — riesgo de clickjacking/exfiltración en dashboards compartidos con clientes, sin caso de uso concreto ahora.

Orden: unidades primero (prioridad del usuario), widgets nuevos después. Cada fase queda usable sola.

### Fase 1 — Catálogo + campo compartido + un solo formatter

**Catálogo nuevo:** `frontend/src/lib/units.ts` — solo frontend (backend nunca renderiza ni convierte, un catálogo espejado ahí sería sync duplicado sin uso). Categorías (temperature, pressure, percentage, signal, energy, power, flow, volume, length, mass, speed, duration, count), cada una con lista de `{symbol, label, decimals}`.

**Se guarda el símbolo (`'°C'`), no un id** — así todo config ya guardado (`'%'`, `'dBm'`) queda válido sin fallback especial. `resolveUnit(stored)` es el único punto de lookup: reconocido → catálogo, no reconocido → se muestra tal cual como sufijo literal (nunca rompe configs viejos).

`suggestUnit(telemetryKey)` — generaliza `DIAL_DEFAULTS` (`CardCells.tsx:106-113`) y `SCALE_PLACEHOLDERS` (`ConfigureStep.tsx:23-27`): `temperature`→°C, `battery`→%, `rssi`→dBm, etc.

**Sin `factor`/`offset`/`baseUnit` todavía** — no tienen consumidor sin conversión; se agregan cuando exista.

**Campo unit al fragmento compartido** — `backend/src/dashboards/widget-registry.ts`, agregar a `presentation` (línea ~49):
```ts
unit: z.string().trim().min(1).max(24).optional(),
decimals: z.number().int().min(0).max(6).optional(),
```
Borrar `unit` de `scale` (:128, duplicado), de `calendar-heatmap` (:207) y `value-map` (:245) — ya lo heredan de `presentation`, mismo nombre/tipo, cero migración. Scatter mantiene `xUnit`/`yUnit` propios (dos ejes). `frontend/src/dashboards/renderer/shared.tsx:30-60` (`EntityWidgetConfig`) ya tiene `unit?`, agregar `decimals?`.

**Un formatter** — `frontend/src/lib/format.ts`:
```ts
export interface MeasureFormat { unit?: string; decimals?: number }
export function formatTelemetryValue(raw: string|number|undefined, opts?: MeasureFormat): string|undefined
```
El segundo parámetro hoy es `maxDecimals = 2` y ningún call site lo usa (verificado en los 13) — ensanchar a objeto no rompe nada.

Borrar `formatValue` de `frontend/src/widgets/charts/chart-shared.ts:14-16`, reemplazar por:
```ts
export const axisTick = (v: number) => formatTelemetryValue(v) ?? '';
export const withUnit = (unit?: string) => (v: number|string) => formatTelemetryValue(v, { unit }) ?? '';
```
Eje sin unidad (chartjunk repetido), tooltip con unidad (`ScatterChartWidget.tsx:93,109` ya usa este patrón para el label del eje).

**Call sites a actualizar:**
- `formatValue` → `axisTick`/`withUnit(unit)` en `LineChartWidget.tsx:60,63`, `BarChartWidget.tsx:44,47`, `MultiSeriesLineChartWidget.tsx:70,73`, `MultiSeriesBarChartWidget.tsx:64,67`, `ScatterChartWidget.tsx:70,105,125`.
- Threadear `unit` como prop en esos mismos componentes + `YAxis label={{value: unit, angle:-90, position:'insideLeft'}}`, pasado desde `ChartCells.tsx` (`LineChartCell`, `BarChartCell`, `ScatterCell`).
- `CardCells.tsx:40-45` — `ValueTileCell` ya puede pasar `unit={config.unit}` a `ValueTileWidget` (el prop ya existe, solo no se pasaba).

**Nota:** value-cards y las tablas son multi-key (`[temperature, pressure]`), un solo `unit` no alcanza — quedan para Fase 4 junto con el gráfico de comparación.

**Verificación:**
- `npx tsx src/lib/units.check.ts` (nuevo, assert-based): símbolos únicos entre categorías, `resolveUnit` con conocido/desconocido/undefined, `suggestUnit('batteryLevel') === '%'`.
- Extender `frontend/src/lib/format.check.ts`: redondeo con `decimals`, string no numérico pasa sin sufijo.
- Manual: dashboard guardado con `unit:'%'` en battery sigue igual; nuevo line-chart con unit configurado muestra label en eje y tooltip.

### Fase 2 — Selector de unidades en el panel de config

Nuevo `frontend/src/dashboards/widget-config/UnitPicker.tsx`: reusa `components/ui/Select.tsx` agregando `group?: string` opcional a `SelectOption` + un `Radix Select.Group`/`Label`. Opciones agrupadas por categoría + `'Custom…'` que revela el `<Input maxLength={24}>` de siempre (escape hatch para unidades fuera del catálogo, y camino de back-compat para configs viejos).

En `ConfigureStep.tsx`: borrar `UNIT_ONLY_TYPES` (:19), mostrar el picker cuando `meta.telemetryKey !== 'none'` (la propia flag del registry ya dice si el widget muestra un valor). Reemplaza los inputs de unit en :151-157, :163-171, y los dos de scatter en :249-262.

`SCALE_TYPES` deja de duplicarse entre `ConfigureStep.tsx:15` y `AddWidgetPanel/index.tsx:32` — exportar una vez desde `widget-config/widget-registry.tsx`.

Auto-sugerencia: en `AddWidgetPanel/index.tsx`, al cambiar `telemetryKey`, si el usuario no tocó manualmente el unit, `setUnit(suggestUnit(key) ?? '')` — necesita un boolean `unitTouched` para no pisar una elección deliberada al editar un widget guardado.

Input opcional de `decimals` al lado del unit picker.

**Verificación manual:** value-tile en key `temperature` → unit prefilled `°C`; cambiar a Custom, escribir `widgets/hr`, guardar, reabrir → se mantiene. Editar widget viejo con `unit:'dBm'` → picker lo reconoce como catálogo, no como custom.

### Fase 3 — Dos widgets baratos (flags, no tipos nuevos)

**Progress bar** — nuevo valor `'BAR'` en el enum `style` del gauge (`widget-registry.ts:165`, ya tiene DIAL/THERMOMETER/RADIAL — el comentario ahí mismo ya justifica que estilo es un campo, no un tipo). Rama `Bar` en `GaugeWidget.tsx` (rect + rect relleno según `ratio`, igual que los otros estilos). Opción nueva en el `<Select>` de `ConfigureStep.tsx:193-197`.

**Stacked bar** — `bar-chart` gana `stacked: z.boolean().optional()`. `MultiSeriesBarChartWidget.tsx:80`: `<Bar stackId={stacked ? 'a' : undefined}/>`. Checkbox en `ConfigureStep`, visible solo con `scope==='ALL'` (con una sola entidad apilar no tiene efecto). Sin validación semántica de "es aditivo" — un hint de texto alcanza.

**Sparkline tile — como flag, no tipo nuevo.** `sparkline: z.boolean().optional()` en `value-tile`. `ValueTileCell` llama `useHistoryForEntities` igual que `ScatterCell` ya corre dos hooks condicionalmente (`ChartCells.tsx:161-168`) — no hace falta un tipo aparte. Gatear a scope SINGLE (ALL dispararía hasta 24 requests de historial). `ValueTileWidget` gana una mini `<Line>` en `ResponsiveContainer` chico cuando `sparkline` está activo.

**Verificación manual:** gauge estilo BAR; bar-chart ALL scope con stacked on/off; value-tile con sparkline en device con historial y en uno sin historial (debe caer a tile plano, no chart vacío).

### Fase 4 — Multi-key: unidades por key + gráfico de comparación

**`units?: Record<string, string>`** en tipos multi-key (`value-cards`, `timeseries-table`, el nuevo chart), keyed por telemetry key. Backend: `z.record(z.string().min(1), z.string().trim().min(1).max(24)).optional()`. UI: junto al `CheckboxList` de keys, una fila `key → UnitPicker` por key seleccionada, prefilled con `suggestUnit`.

**`multi-key-chart` (nuevo tipo, "Comparison Chart"):** el gap real — hoy no existe forma de graficar dos keys distintas juntas (temperature vs pressure de una misma entidad). `entity: 'required'`, `supportsAllScope: false` (N entidades × M keys no es legible), `multiTelemetryKeys: true` (reusa el picker de `CheckboxList` que ya existe en `ConfigureStep.tsx:335-344`). Datos: `useMultiKeyHistoryForEntities` (`datasource/history.ts:95`, ya construido para esto).

Eje dual: agrupar keys por símbolo de unidad resuelto. 1 grupo → 1 `YAxis`. 2 grupos → `yAxisId="left"/"right"`. 3+ grupos → se muestran las primeras 2, el resto va al `omittedCount` existente (no se inventa un tercer eje ni se normaliza — normalizar pierde la unidad, que es el punto del widget).

Nuevo caso en `WidgetPreview.tsx` (switch exhaustivo, el compilador avisa si falta), `renderer/index.tsx`, `shared.tsx`.

**Verificación:** `npx tsx` check para `groupKeysByUnit` (1 unidad, 2, 3 con drop, todas sin unidad, mezcla).

### Fase 5 — Label / texto estático

Tipo nuevo, `entity: 'none'`, `telemetryKey: 'none'`. Schema propio (no `optionalDatasource()`, que aceptaría un `entityId` inservible):
```ts
label: z.object({ text: z.string().trim().min(1).max(2000), align: z.enum(['left','center']).optional(), ...presentation }),
```
El branch `entity === 'none'` en `ConfigureStep.tsx:315` ("This widget needs no further configuration") existe pero nunca se ejecutó — verificar manualmente que funciona, no asumir. Agregar `<textarea>` para `text` ahí.

Render: `<p className="whitespace-pre-wrap">{text}</p>` — React escapea por defecto, texto plano es XSS-safe sin nada extra. **Sin librería de markdown** — se justifica el día que se quieran links/tablas, y ahí sí con sanitizer (`dompurify`), no antes.

Categoría: meterlo en `Cards` para no crear una categoría de un solo widget.

### Pendiente para más adelante (no en este plan)

- Preferencias de usuario por categoría de unidad — el catálogo ya queda listo para sumarlo sin retrabajo.
- `factor`/`offset` de conversión — se agregan junto con las preferencias, no antes (constantes sin consumidor no se testean solas).
- Widget de iframe/embed.
- `SUM`/`COUNT` con unidades de offset (°C→°F) es una trampa para cuando exista conversión — una línea de comentario en `units.ts` alcanza por ahora.

### Verificación general

`npm run dev` en frontend y backend, probar en el dashboard builder real: crear cada tipo de widget nuevo/modificado, guardar, recargar, editar. Los `*.check.ts` se corren manual con `npx tsx <path>` (no hay test runner instalado, es el patrón existente en el repo).

---

*This file is temporary. It informs planning but is not required.*
*Created from an approved Claude Code plan, consumed by `/paul:plan`.*
