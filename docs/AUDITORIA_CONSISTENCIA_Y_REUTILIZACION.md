# Auditoría de consistencia y reutilización — WhatPlan

**Fecha:** 6 de octubre de 2026
**Foco:** frontend, patrones de entidad y sistema visual; revisión secundaria del backend.
**Método:** auditoría inicial estática, seguida por refactorización y verificación focalizada de contratos, pruebas y presentación visual. El detector de Impeccable se ejecutó una vez; sus avisos se trataron como indicadores para inspeccionar, no como defectos confirmados. La puntuación de abajo representa el estado inicial y no una medición posterior.

## Veredicto

La idea del usuario es correcta para cuatro experiencias: **WhereFood, WhichFilm, HowCook y WhyFun** tienen una ficha reutilizable y una experiencia repetible asociada. En las cuatro se repiten foto, fecha o resumen, acciones, historial y reseñas. El modelo visual también ya comparte buena parte de sus cards y cabeceras.

No conviene convertir todo WhatPlan en una sola entidad o pantalla genérica. **WhenDates** reúne recurrencias y experiencias vinculadas; **Whither Journey** es un agregado de viaje con etapas, agenda, archivos, estadías, equipaje y balances. Esas secciones deben reutilizar la base visual y los controles, manteniendo sus propios flujos.

La oportunidad principal no es rehacer las cards: `CatalogMediaCard`, `EntityDetailHeader`, `EntityDetailActions`, `SectionShell`, `Button`, `PhotoManagerModal` y `PhotoViewer` ya dan una base valiosa. El mayor retorno está en aplicar el mismo armazón a los catálogos y diálogos que aún repiten composición, aclarar los tokens visuales y cerrar algunas bifurcaciones del backend.

**Resumen ejecutivo:** 13/20 (**Aceptable**); 0 hallazgos P0, 2 P1 y 8 P2. Los tres temas que conviene resolver primero son la divergencia entre checkouts, los nombres de miembros fijos dentro de las cards y la fragmentación de las reglas visuales.

## Resultado de la implementación

Se aplicaron los cambios reutilizables de mayor alcance sin convertir en genéricas las diferencias propias de cada dominio:

| Hallazgo | Estado | Cambio |
|---|---|---|
| Identidades fijas en Film y HowCook | Resuelto | Las cards y formularios reciben miembros activos y etiquetas del hogar desde el contexto de ubicación; hay fallback cuando falta una identidad. |
| Composición de WhereFood, WhichFilm, HowCook y WhyFun | Resuelto | Las cuatro páginas usan `CatalogExperienceLayout` con slots tipados; búsqueda, filtros y estados de cada sección siguen siendo propios. |
| Ciclo común de reseñas | Resuelto | Las cinco reseñas usan `ReviewDialogShell`; los campos, métricas, validaciones y mutaciones siguen en cada dominio. |
| Renderizado estático de estrellas | Resuelto | `StarGlyphs` comparte forma y relleno fraccionario; `StarRating` conserva su interacción por teclado. |
| Reset y neutros duplicados | Resuelto parcialmente | `base.css` centraliza reset y tokens semánticos, y se retiraron las definiciones repetidas de `global.css`; los acentos y tratamientos locales aún requieren una migración gradual. |
| Contratos de paginación y zona | Resuelto | El archivo de lugares archivados consume `Slice` incremental; el filtro envía `zoneId`, y se cubrieron ambos contratos en las pruebas del frontend. |
| Límite de páginas frente al tope del servidor | Resuelto | El máximo efectivo es 30 en la interfaz, el hook compartido y la validación HTTP. |
| Queries privadas sin alcance de pareja | Resuelto en repositorios revisados | Se quitaron métodos globales redundantes y se añadió una comprobación de contrato para consultas privadas personalizadas. |
| DTO HTTP recibidos directamente por servicios | Parcial | Place, Recipe y WhyFun Plan convierten requests validados a inputs de aplicación propios. El resto de la API y el archivo `Api.java` siguen pendientes de separar por recurso. |
| Fallback de skeleton | Conservado | El mapeo por ruta ya cubre catálogos, detalle, fechas, viaje y gestores; no se encontró un defecto que justificara rehacerlo. |
| Dos checkouts backend | Abierto | Se trabajó contra `WhatPlanBackend-login-fix/main`, cuyo contrato coincide con el frontend. El checkout divergente y sus cambios locales se dejaron intactos; requiere una decisión de organización antes de archivarlo o reconciliarlo. |
| `PhotoStorage` y reemplazos de foto | Abierto | Se conservaron asociaciones tipadas y flujos por agregado; una abstracción genérica aquí escondería diferencias de ownership y portada. |
| APIs heredadas de WhyFun | Parcial | `/plans` queda marcado como obsoleto en código y conserva su contrato; retirarlo requiere confirmar que no haya clientes activos. |

Se visualizó el diálogo de reseña de película en escritorio y móvil con datos simulados. La estructura común mantiene el contexto, las métricas específicas, el área de texto y las acciones dentro del ancho disponible. Esta pasada no sustituye la revisión integral de estados y las otras cinco secciones.

## Verificación

- Frontend: `npm test` — 43 pruebas aprobadas; `npm run build` — compilación correcta; `npm run lint` — sin errores y 22 avisos de Fast Refresh/hooks.
- Backend: `CoupleScopedRepositoryContractTest` pasó. La suite completa ejecutó 238 pruebas; seis pruebas de integración no pudieron iniciar porque Docker Desktop no tenía el engine disponible. Al excluir esas seis, las 232 restantes terminaron sin fallos. No se midió rendimiento con carga ni se pudo ejecutar la base PostgreSQL de Testcontainers.
- Rendimiento esperado: los catálogos consultan páginas de hasta 30 elementos, con carga incremental donde aplica; esto limita el trabajo por respuesta y la carga de fotos. No es una medición de latencia: la meta de ~300 ms debe verificarse contra el VPS y la base real.

## Alcance y fuente de código

Hay dos checkouts de backend:

- Para revisar la combinación que coincide con las rutas actuales del frontend, tomé `WhatPlanFrontend` en `main` (`00e7816`) junto con `WhatPlanBackend-login-fix` en `main` (`85e473c`), ambos actualizados el 6 de octubre. El frontend tenía cambios locales previos en `LoadingSkeleton.tsx`, `AppRoutes.tsx` y `loading.css`; leí el estado de trabajo y no los toqué. Este backend expone `/api/whither-journey` y `/api/zones`, que consume el frontend.
- También inspeccioné `WhatPlanBackend` en `CoupleExpantion` (`0745e54`, 26 de septiembre). Ese checkout no contiene `JourneyApi` ni `ZoneApi` y tiene cambios locales en `Repositories.java` y `CoupleScopedRepositoryContractTest.java`. Si se usa por error junto al frontend actual, Viajes y Zonas quedan sin esos endpoints.

El informe no presupone cuál carpeta debe eliminarse: recomienda confirmar el checkout de referencia antes de comenzar una refactorización. El informe anterior de UX de producto sigue siendo la referencia para comportamiento e interacción y permanece en `docs/AUDITORIA_PRODUCTO_UX.md` en la raíz del workspace.

## Puntaje de auditoría técnica

| Dimensión | Nota / 4 | Evidencia y límite |
|---|---:|---|
| Accesibilidad | 3 | Hay foco visible, estados accesibles en componentes compartidos, control de estrellas con teclado, objetivos táctiles de 44 px y variante para movimiento reducido. No se hizo una pasada con tecnologías asistivas ni comprobación de contraste en pantalla. |
| Rendimiento | 3 | Rutas divididas con carga diferida, imágenes con lazy loading y catálogos con paginación/carga incremental. No se midió el bundle ni Web Vitals. |
| Responsive | 3 | Hay reglas móviles, áreas seguras y layouts que cambian de columna. La revisión de esta tarea fue de código, no una captura de cada apartado y viewport. |
| Theming | 2 | Existe un tema tipado por sección, pero colores, radios y tipografía aparecen repetidos entre TypeScript, CSS y documentación; hay bastante CSS literal. |
| Integridad de implementación | 2 | El núcleo de cards y detalles es coherente. Siguen conviviendo envolturas duplicadas, contratos heredados y decisiones de miembro escritas a mano. |
| **Total** | **13 / 20** | **Aceptable: la base ya existe; hacen falta varias correcciones de consistencia y limpieza.** |

**Integridad de implementación:** el sistema sí expresa un producto reconocible: fondo nocturno común y acento por experiencia, con componentes compartidos para cards y fichas. La integridad baja por las diferencias de envoltura y por dos árboles de backend con capacidades distintas, no porque las secciones necesiten verse idénticas en contenido.

## Apartado por apartado

| Sección | Ficha reutilizable | Experiencia/historial | Qué debe compartir | Qué mantener propio |
|---|---|---|---|---|
| WhereFood | Lugar | Visita; cada visita puede llevar reseña, fotos e ítems | Card, cabecera, acciones, galería, diálogo de reseña | Reseña de lugar y reseña de visita son dos niveles distintos; filtros, dirección y estado pendiente. |
| WhichFilm | Película | Vista; cada vista puede tener una reseña | Card, cabecera, acciones, estrellas, galería y diálogo | TMDB, póster, género/plataforma y dimensiones de opinión de película. |
| HowCook | Receta | Cocinada; puede tener porciones, hogar, fecha y reseña | Card, cabecera, acciones, formulario de reseña, fotos | Ingredientes/pasos y datos de preparación no son campos genéricos de cualquier ficha. |
| WhyFun | Actividad | Salida/visita; puede tener fotos y reseña | Card, cabecera, acciones, galería, diálogo de reseña | Horarios y categorías jerárquicas. En el backend hay además una API heredada de “planes”. |
| WhenDates | Fecha recurrente | Ocurrencia con comentarios, fotos y experiencias vinculadas | Tema, card multimedia, estados y controles de fotos | La fecha agrupa recuerdos y recurrencias; no representa una ficha de catálogo normal. |
| Whither Journey | Viaje con etapas | Agenda diaria, puntos, estadías, documentos, equipaje y dinero | Tema, botones, cards, cabecera, modal y visor de fotos | Es un flujo agregado; no conviene transformarlo en CRUD genérico de ficha/experiencia. |

**Modelo de reutilización recomendado:** cuatro módulos de catálogo con una presentación `ficha + experiencia`; dos secciones agregadas con sus propios flujos. La capa común puede recibir slots tipados para imagen, eyebrow, metadatos, acciones y contenido. Las reglas y DTO de cada dominio permanecen explícitos.

## Hallazgos priorizados

### [P1] Los datos de pareja están codificados con nombres fijos

**Ubicación:** `src/features/films/FilmCard.tsx:9-18`; `src/features/home-recipes/CatalogRecipeCard.tsx:18`.
**Categoría:** Integridad de implementación / reuso.
**Impacto:** `FilmCard` solo calcula opiniones actuales de autores llamados `tomas` y `avril`; la card de receta traduce el hogar a “Tomás” o “Avril” con un ternario fijo. Para otra pareja, las métricas pueden desaparecer o mostrar una identidad incorrecta. También hace que el componente conozca datos de una pareja concreta.
**Recomendación:** recibir identidad y nombres desde los miembros activos de la pareja o un adaptador compartido de autoría. No introducir los nombres como configuración de tema.
**Comando sugerido:** `$impeccable harden` para revisar los estados y fallbacks de identidad de estas cards; el cambio de datos pertenece al frontend de producto.

### [P1] Los checkouts de backend no ofrecen el mismo contrato

**Ubicación:** `WhatPlanBackend-login-fix/src/main/java/com/wherefood/journey/JourneyApi.java:18`; `WhatPlanBackend-login-fix/src/main/java/com/wherefood/web/ZoneApi.java:29`; frontend `src/features/journey/journey.ts:317-320` y `src/features/zones/zones.ts:6-16`.
**Categoría:** Integridad / contrato frontend-backend.
**Impacto:** el otro checkout, `WhatPlanBackend`, no contiene esas APIs. Abrir o continuar el trabajo sobre ese árbol deja a la interfaz sin Viajes y Zonas aunque compile el frontend. Además, sus cambios locales pueden divergir aún más del backend que sí corresponde a las rutas actuales.
**Recomendación:** elegir un checkout canónico y portar allí, de forma deliberada, los cambios que deban conservarse. Añadir el contrato frontend-backend a la lista de aceptación de futuras ramas.
**Comando sugerido:** no aplica; requiere una decisión de organización del repositorio.

### [P2] El armazón común de los catálogos existe pero no se usa

**Ubicación:** `src/components/ui/CatalogExperienceLayout.tsx:5-20`; composición repetida en `DiscoverPage.tsx:148-190`, `WhichFilmPage.tsx:161-200`, `HomeRecipesPage.tsx:123-141` y `WhyFunPage.tsx:145-158`.
**Categoría:** Implementación / consistencia visual.
**Impacto:** los cuatro catálogos repiten la secuencia shell → hero → alta → controles → resultados, aunque cada uno ya comparte hero, botón de alta, búsqueda y componentes de catálogo. `CatalogExperienceLayout` está definido, pero no tiene consumidores fuera de su propia declaración; la consistencia depende hoy de que cuatro archivos mantengan el mismo orden y clases.
**Recomendación:** usar o ajustar ese armazón para los cuatro catálogos principales con slots para controles, contenido, navegación y estados. Dejar WhenDates y Journey fuera si sus jerarquías no caben sin condicionales.
**Comando sugerido:** `$impeccable extract`.

### [P2] La hoja global repite reset y tema base

**Ubicación:** `src/main.tsx:13-31`; definiciones compartidas al inicio de `src/styles/base.css:1-44` y `src/styles/global.css:1-130`.
**Categoría:** Theming / mantenimiento.
**Impacto:** ambos archivos vuelven a definir `:root`, `box-sizing`, `body`, controles, enlaces, animación decorativa y estilos de login. Se importan uno detrás del otro y algunas reglas se ajustan con valores distintos. Para saber cuál regla gobierna hay que reconstruir la cascada, y una corrección puede quedar duplicada u ocultada. `global.css` además concentra más de 3.200 líneas de estilos.
**Recomendación:** mantener una única capa de reset/tokens y mover estilos por sección a sus hojas existentes. En cada corte, eliminar las declaraciones antiguas una vez que el módulo consuma la regla compartida.
**Comando sugerido:** `$impeccable distill`, seguido de `$impeccable extract` para fijar los tokens reutilizables.

### [P2] El tema de sección no es la única fuente de valores visuales

**Ubicación:** `src/lib/sectionTheme.ts:3-39`; `src/styles/base.css:1-14`; `src/styles/global.css`; `src/styles/when-dates.css:1-7`; `src/styles/journey.css:122-159`; `MANUAL_DE_MARCA.md` y `DESIGN.md`.
**Categoría:** Theming / identidad visual.
**Impacto:** los acentos existen en `sectionThemes`, pero parte de los mismos valores reaparece como hex literal en CSS; el set neutral se declara de nuevo en `:root`, y los documentos no describen cada tono local. El detector señaló ejemplos de tipografía/radio fuera de la escala documentada (`action-buttons.css:17`, `:126`) y colores de fechas no incluidos en la paleta documentada (`when-dates.css:3`). Son avisos de mantenimiento: algunos tamaños y fondos son intencionales por superficie, no errores visuales automáticos.
**Recomendación:** elegir CSS variables semánticas como fuente de ejecución para neutros, contraste, superficies, foco y sombra; alimentar `SectionShell` desde el tema tipado. Documentar solo valores recurrentes o con intención de identidad; conservar como locales los tratamientos que realmente pertenecen a una pieza específica. Alinear también los nombres del manual (“WhichMovie”/“WhoCook”) con las rutas actuales (`films`/`how-cook`) si esos son los nombres públicos elegidos.
**Comando sugerido:** `$impeccable extract`, luego `$impeccable document` cuando se confirme la nomenclatura.

### [P2] Los diálogos de reseña repiten estructura y ciclo de guardado

**Ubicación:** `PlaceReviewForm.tsx:21-29`, `VisitReviewForm.tsx:22-37`, `FilmReviewForm.tsx:34-45`, `CookingReviewForm.tsx:21` y `ActivityReviewForm.tsx:19`.
**Categoría:** Implementación / consistencia visual.
**Impacto:** se repiten modal con descarte, formulario, botón en carga, error accesible y confirmación de borrado. A la vez, cambian de ancho y clase según módulo; dos formularios largos concentran markup en una sola línea, lo que dificulta comparar cambios. Las escalas de opinión sí son diferentes y no deberían borrarse al abstraer.
**Recomendación:** extraer un `ReviewDialogShell` para título/contexto, formulario, acciones, pending/error y borrado; pasar los controles de opinión como slot. Mantener en cada dominio sus campos, validación y mutaciones. Formatear el JSX en bloques para facilitar revisión.
**Comando sugerido:** `$impeccable extract`.

### [P2] Las estrellas tienen dos renderizados de solo lectura

**Ubicación:** `src/components/ui/RatingStars.tsx:1-22` y `src/components/ui/StarRating.tsx:1-11`.
**Categoría:** Implementación / identidad visual.
**Impacto:** `RatingStars` dibuja promedios fraccionarios; `StarRating` soporta entrada por teclado y también un modo estático de estrellas enteras. La distinción de datos es válida, pero mantener dos caminos estáticos puede hacer que una nota individual y una media parezcan controles de familias distintas.
**Recomendación:** conservar rating interactivo y rating promedio como contratos diferentes; compartir el átomo visual/label accesible y decidir explícitamente qué componente representa una puntuación individual estática.
**Comando sugerido:** `$impeccable extract`.

### [P2] La capa web contiene DTO, controlador y lógica de acceso

**Ubicación:** `WhatPlanBackend-login-fix/src/main/java/com/wherefood/web/Api.java:19-54,100-128`; firmas `PlaceService.java:53,69`, `RecipeService.java:46` y `WhyFunPlanService.java:52`.
**Categoría:** Arquitectura / mantenibilidad backend.
**Impacto:** los records de request se declaran en archivos de API dentro de `web` y los servicios reciben esos mismos tipos. `Api` agrupa muchos repositorios y hace consultas/paginación y parte del mapeo a DTO además de atender HTTP. Esto une el contrato HTTP con las reglas de aplicación y hace crecer la clase central al sumar un módulo.
**Recomendación:** como refactor gradual, mantener la API como adaptador HTTP; pasar inputs de aplicación propios a servicios; trasladar consultas de uso de caso y mapeos complejos a servicio/mapper; dividir `Api` por recurso. No hay necesidad de construir un framework genérico de entidades.
**Comando sugerido:** no aplica; refactor Spring Boot.

### [P2] El guardado de fotos repite asignación y reemplazo de perfil

**Ubicación:** `WhatPlanBackend-login-fix/src/main/java/com/wherefood/web/PhotoStorage.java:103-154`; reemplazos en `FilmMediaService.java:35-46`, `RecipeMediaService.java:35-46` y `PlaceMediaService.java:56-65`.
**Categoría:** Duplicación backend.
**Impacto:** al menos nueve overloads de `PhotoStorage.store` repiten la asignación de bytes, thumbnail, dimensiones y timestamp; las asociaciones tipadas son lo que cambia. Los servicios de fotos de perfil repiten búsqueda acotada a pareja, borrado/flush, actualización del registro, guardado y retorno. Un cambio común de metadatos puede quedar desparejo.
**Recomendación:** extraer solo la inicialización compartida de metadatos de imagen y el flujo de reemplazo cuando el tipo lo permita; conservar las asociaciones compiladas por tipo, límites por agregado, autorización y lógica de portada dentro de cada servicio.
**Comando sugerido:** no aplica; refactor Spring Boot.

### [P2] Conviven contratos antiguos y actuales de WhyFun

**Ubicación:** `WhyFunApi.java:35-101` (`/plans`) y `WhyFunActivityApi.java:38-188` (`/activities` y `/activity-visits`); el frontend actual usa `/why-fun/activities` en `src/features/why-fun/whyFun.ts:22-29`.
**Categoría:** Arquitectura / contrato.
**Impacto:** los dos controladores comparten la base `/api/why-fun` y operan sobre `WhyFunVenue`, pero exponen conceptos distintos: el contrato heredado de plan con fecha única y el actual de actividad reutilizable con visitas. No es una colisión de rutas —los subrecursos son diferentes—, pero un cambio de categorías, fotos o semántica puede requerir tocar dos familias.
**Recomendación:** registrar qué clientes externos aún usan `/plans`; si no hay ninguno, retirar ese contrato en una migración explícita. Si se conserva, marcarlo como compatibilidad heredada y mantener una única implementación de las reglas compartidas.
**Comando sugerido:** no aplica; primero hay que confirmar consumidores del contrato.

## Patrones que conviene conservar

- `CatalogMediaCard` ofrece slots y ya unifica Lugar, Película, Actividad, Receta, fecha y viaje. `PlaceCard`, `FilmCard`, `FunVenueCard` y `CatalogRecipeCard` añaden contenido del dominio sin reconstruir el contenedor.
- `EntityDetailHeader` y `EntityDetailActions` se usan en las cuatro fichas principales. Lugar, Película, Receta y Actividad comparten orden de media, título, metadatos y acciones.
- `SectionShell` con `sectionThemeStyle` mantiene un acento por módulo, y el componente `Button` centraliza variantes y el tratamiento accesible del icono.
- `PhotoManagerModal`, `PhotoViewer`, `AdaptivePhoto` y `MediaImage` resuelven selección, carga y visualización de imágenes en más de una sección.
- La arquitectura de datos distingue ficha y ocurrencia; `CoupleScopedEntity` y las consultas con `couple_id` dan una base común sin colapsar la semántica de cada registro.
- El frontend usa carga diferida de rutas, lazy loading de imágenes, consulta incremental, foco visible y reduced motion. Son patrones que conviene sostener durante los cambios.

## Siguientes pasos recomendados

1. **Cerrar la fuente canónica del backend.** Esta implementación usa `WhatPlanBackend-login-fix/main`, que contiene las rutas que consume el frontend. El otro checkout sigue en disco con cambios locales y queda pendiente decidir si se archiva o reconcilia.
2. **Completar el sistema visual.** Migrar de forma gradual los acentos compartidos que siguen literales en CSS y alinear `MANUAL_DE_MARCA.md`/`DESIGN.md` con los nombres públicos que se elijan.
3. **Reducir las fronteras restantes del backend.** Separar `Api.java` por recurso en cortes pequeños; mantener los inputs HTTP fuera de servicios nuevos. Revisar `PhotoStorage` por asociaciones tipadas y medir si una función de metadatos común reduce duplicación sin esconder ownership.
4. **Decidir sobre `/why-fun/plans`.** El código ya lo marca como obsoleto; antes de eliminarlo, buscar consumidores y definir el ciclo de compatibilidad.
5. **Completar la regresión visual.** Recorrer seis secciones, estados vacío/carga/error, altas, edición, fotos, teclado y tamaños móvil/escritorio. En esta vuelta solo se capturó el diálogo de reseña de película con respuestas simuladas.
6. **Medir el VPS.** Probar catálogos con los datos e imágenes reales, consultas paginadas y percentiles de latencia/carga. La paginación limita el trabajo por solicitud, pero la meta de ~300 ms aún no está medida.
7. **Ejecutar integración con Docker activo.** Volver a correr las seis pruebas Testcontainers para cubrir aislamiento HTTP y migraciones en PostgreSQL/Redis.

### Comandos Impeccable recomendados

1. **[P2] `$impeccable extract`**: tokens semánticos, armazón de catálogo y shell de reseñas.
2. **[P2] `$impeccable document`**: actualizar nombres y reglas del sistema después de acordar la nomenclatura final.
3. **[P2] `$impeccable audit`**: volver a medir accesibilidad, temas y adaptación después de implementar.
4. **`$impeccable polish`**: última pasada sobre las seis secciones una vez cerrados los cambios.

Los pasos 2, 3 y la parte de Testcontainers del 7 son los bloques de implementación pendientes; los demás requieren confirmación organizativa, consumidores externos o infraestructura de rendimiento. Conviene volver a correr `$impeccable audit` después de cerrar la migración visual para comparar la puntuación con la línea base de 13/20.
