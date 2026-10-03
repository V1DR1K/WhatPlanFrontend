---
name: WhatPlan
description: Planes compartidos sobre una base nocturna con acentos por experiencia.
colors:
  bg: "#121112"
  panel: "#1c1a1c"
  line: "#312e31"
  cream: "#fffaf0"
  muted: "#aaa3a3"
  field-bg: "#151415"
  modal-bg: "#211f21"
  wp-brand-red: "#ff6049"
  wp-brand-contrast: "#281211"
  violet: "#a978ff"
  food-accent: "#ff8a00"
  film-accent: "#b8adff"
  cook-accent: "#d4ef55"
  fun-accent: "#ffd166"
  dates-accent: "#ff8bca"
  journey-accent: "#83d8f5"
  journey-contrast: "#102b38"
  journey-surface: "#18323e"
  journey-surface-soft: "#12232d"
  journey-foreground: "#e4f6ff"
  journey-muted: "#b9dce9"
  journey-line: "#467488"
  danger-bg: "#472522"
  danger-border: "#ff8f80"
  danger-text: "#ffb5aa"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(42px, 6vw, 70px)"
    fontWeight: 700
    lineHeight: 0.91
    letterSpacing: "-3px"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "31px"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-1px"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  body:
    fontFamily: "DM Sans, sans-serif"
  label:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "1.5px"
rounded:
  field: "9px"
  control: "12px"
  panel: "14px"
  card: "17px"
  modal: "20px"
  hero: "24px"
  round: "50%"
spacing:
  control-gap: "8px"
  form-gap: "12px"
  card-inset: "16px"
  section-gap: "24px"
  catalog-gap: "28px"
components:
  button-primary:
    backgroundColor: "{colors.wp-brand-red}"
    textColor: "{colors.wp-brand-contrast}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-secondary:
    backgroundColor: "color-mix(in srgb, var(--section-accent) 14%, var(--panel))"
    textColor: "var(--section-accent)"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-destructive:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "var(--section-accent)"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-icon:
    backgroundColor: "{colors.modal-bg}"
    textColor: "{colors.cream}"
    rounded: "{rounded.round}"
    height: "44px"
    width: "44px"
  input:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field}"
    padding: "12px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  chip:
    backgroundColor: "transparent"
    textColor: "var(--section-accent)"
    rounded: "{rounded.field}"
    padding: "7px 10px"
  navigation:
    backgroundColor: "{colors.cream}"
    textColor: "#1a1819"
    rounded: "{rounded.field}"
    padding: "7px 10px"
---

# Design System: WhatPlan

## Overview

**Creative North Star: "Planes compartidos, estética nocturna"**

Esta frase resume la identidad ya documentada en `MANUAL_DE_MARCA.md`: cercana, nocturna y un poco lúdica. Es una descripción del sistema existente, sin proponer una identidad nueva. La base oscura reúne las experiencias; el color de cada sección identifica las acciones y los estados de esa experiencia.

El sistema combina títulos editoriales, lectura funcional directa y controles con una pequeña profundidad física. `PRODUCT.md` confirma conservar los controles, la tipografía y la navegación actuales, con uso por teclado, adaptación a teléfonos y respeto por movimiento reducido.

**Key Characteristics:**

- Base oscura compartida y acento propio por experiencia.
- Fraunces para marca y títulos editoriales; DM Sans para uso funcional; DM Mono para datos cortos.
- Acciones redondeadas con sombra sólida; paneles de profundidad tonal.
- Formularios y visor de fotos compartidos entre módulos.

## Colors

La paleta conserva un fondo ciruela oscuro y texto cálido, con acentos luminosos limitados a énfasis funcionales.

### Primary

- **Coral de marca** (`wp-brand-red`): palabra destacada del logo y acciones fuera de una experiencia.

### Secondary

- **Naranja gastronómico**, **lavanda de cine**, **lima de cocina**, **dorado de actividades** y **rosa de fechas**: acentos de las cinco experiencias existentes, según `src/lib/sectionTheme.ts`.
- **Celeste de viaje** (`journey-accent`): extensión aprobada para Whither Journey. Usa contraste oscuro en acciones rellenas y superficies azuladas en sus paneles.
- **Violeta de foco** (`violet`): foco compartido. El tema de viaje especifica su propio foco celeste.

### Neutral

- **Noche ciruela** (`bg`), **panel carbón** (`panel`) y **línea malva** (`line`): fondo, superficies y divisores del sistema.
- **Crema cálido** (`cream`) y **gris rosado** (`muted`): texto principal y metadatos compartidos.
- **Azules pálidos de viaje** (`journey-foreground`, `journey-muted`): variante local de lectura; no reemplazan los neutros globales.
- Los tokens `danger-*` mantienen una acción destructiva diferenciada del acento de sección.

**The Section Accent Rule.** La experiencia aplica sus colores mediante `SectionShell` y `sectionThemeStyle`; los diálogos conservan ese tema aunque se rendericen en un portal.

## Typography

Fraunces aporta la voz editorial de la marca y los heroes; DM Sans sostiene botones, formularios y lectura. DM Mono identifica categorías y datos breves. Las familias y los tamaños representativos están en el frontmatter; los tamaños específicos permanecen en sus componentes.

- **Display:** encabezado editorial de `ExperienceHero`, con una palabra opcional en acento y cursiva.
- **Headline:** títulos compartidos de secciones y diálogos.
- **Title:** nombre de card en la biblioteca existente.
- **Body:** familia funcional; el componente determina el tamaño. Las descripciones de hero usan 16 px e interlineado 1.5.
- **Label:** sobretítulos y metadatos breves; no usar mayúsculas para párrafos.

Whither Journey conserva DM Sans en sus encabezados propios, con el tamaño observado `clamp(2rem, 5vw, 3.8rem)` y altura 1.1. Esta elección pertenece al módulo y a su brief; no redefine los heroes editoriales de otras experiencias.

## Layout

La aplicación usa un contenedor de hasta 1240 px, márgenes automáticos, espacio lateral de 28 px y compensación de áreas seguras. La navegación superior es fija al desplazarse, con fondo translúcido y desenfoque. Las experiencias se organizan como bloques verticales; el catálogo compartido usa separaciones de 28 px, reducidas a 22 px hasta 540 px.

El detalle compartido pasa a una columna hasta 820 px; búsqueda y ordenamiento se apilan hasta 640 px. Whither Journey usa un ancho interno máximo de 1160 px y una transición a una columna hasta 700 px. Sus pestañas se envuelven en móvil. No convertir su disposición específica en plantilla universal.

Los diálogos definen anchos compacto, estándar y amplio de hasta 540, 780 y 1060 px. El contenido desplaza dentro de la ventana y el cierre permanece fuera de ese desplazamiento. Los formularios usan campos que pueden encogerse sin desbordar. Los controles táctiles compartidos suelen medir al menos 44 px; hay variantes compactas específicas y no debe suponerse un mínimo universal en el CSS existente.

## Elevation & Depth

Los paneles se distinguen por tono y borde. Los botones primarios y secundarios tienen una sombra sólida desplazada (3 px), que se acorta al interactuar (2 px). El diálogo usa una sombra amplia para separarse del fondo oscurecido. Los valores completos viven en las extensiones del sidecar.

**The Tactile Action Rule.** Reutilizar la respuesta del botón compartido: desplazamiento de 1 px y sombra más corta al hover o foco, conservando el contorno visible de foco.

## Shapes

El sistema combina radios suaves para campos y controles, cards algo más redondeadas y diálogos amplios; los controles solo de ícono son circulares. Los radios representativos están en el frontmatter. La variante de viaje tiene cards de 14 px y pestañas de 8 px, sin modificar la biblioteca compartida.

## Components

### Buttons

Acciones de aspecto físico y texto funcional. `Button` ofrece primary, secondary, destructive, tertiary e icon. El tema de sección determina el relleno, contraste y sombra de acciones; la variante destructiva conserva sus colores propios. El ícono opcional precede al texto. Estados deshabilitados reducen opacidad y eliminan sombra. El sidecar muestra cada variante con sus estados reales.

### Chips

Filtros compactos con acento en el contorno y el texto. La selección añade una mezcla tonal del acento sobre el panel y texto crema. No equiparar esta selección a las pestañas del detalle de viaje.

### Cards / Containers

Las cards compartidas separan medio visual y contenido, con borde discreto, fondo de panel y padding de 16 px en el cuerpo. Whither Journey presenta ruta, título, fechas y enlace como una card completa; esa composición queda en su brief.

### Inputs / Fields

Los campos compartidos conservan fondo oscuro, texto claro y borde discreto. Los controles de catálogo usan una mezcla leve del acento y alto mínimo de 44 px. Las etiquetas son visibles; errores usan texto propio con `role="alert"`. Los campos de fecha y hora de viaje declaran esquema oscuro. Los formularios de diálogo reutilizan la tipografía táctil compartida.

### Navigation

El encabezado común conserva marca, selector de ciudad y acciones. La navegación rápida usa chips: activo con fondo crema y texto oscuro. Las pestañas de viaje son una variante local con celeste relleno al seleccionar; admiten flechas de teclado y envuelven sus rótulos en pantallas estrechas.

### Modal / PhotoViewer / StarRating

El diálogo compartido administra cierre, foco inicial, ciclo de Tab, devolución de foco y bloqueo del desplazamiento. Protege formularios modificados con confirmación de descarte; durante un guardado pendiente no cierra por Escape, fondo o botón. Las fotos privadas reutilizan `PhotoViewer`; las reseñas reutilizan `StarRating`. Conservar sus contratos comunes al extender una experiencia.

### Motion

El vocabulario compartido tiene feedback breve, transición de estado y llegada de página o diálogo. Su curva de llegada y tiempos están en el sidecar. La agenda de viaje añade un marcador completado que llega mediante escala y desenfoque durante 0.4 s; movimiento reducido elimina esa animación y sus transiciones. La firma de viaje permanece local.

## Do's and Don'ts

### Do:

- **Do** conservar la base oscura, los temas de sección y los componentes compartidos.
- **Do** mantener etiquetas visibles, foco por teclado y estados de carga, error y deshabilitado.
- **Do** registrar composiciones específicas en briefs de superficie.
- **Do** respetar movimiento reducido en las animaciones de llegada.

### Don't:

- **Don't** sustituir el acento de una experiencia por el de otra.
- **Don't** convertir el celeste o los encabezados propios de viaje en un cambio global.
- **Don't** cubrir pantallas enteras con el acento ni usar Fraunces en formularios o párrafos largos.
- **Don't** agregar cierres que omitan la protección del diálogo compartido.

<!-- Scan baseline: 2026-10-03. Sources: MANUAL_DE_MARCA.md; src/styles/base.css, global.css, action-buttons.css, catalog-controls.css, experience-hero.css, motion.css, modals.css, touch.css, journey.css; src/lib/sectionTheme.ts; shared UI components. Typography/radius/spacing keys describe observed reusable values, not newly introduced runtime tokens. No existing DESIGN.md or .impeccable/design.json was replaced. -->
