# Planning — AeroGlass (Media Player)

> Proyecto propio, construido desde cero, **inspirado** en la idea y funcionalidad de
> [Damianx64/Glass-Widget](https://github.com/Damianx64/Glass-Widget.git) (widget de música
> glassmorphism con Tauri + React). No se clona el repo original ni se reutiliza su
> historial de commits — cada fase se construye e implementa por tu cuenta.
>
> **Meta añadida sobre el original**: soporte para Linux (MPRIS/D-Bus), además de Windows.

## Cómo usar este documento

- Cada sección = una unidad de trabajo independiente.
- Al terminar una sección, **detente y haz el commit sugerido** (o uno propio, en tus
  palabras) antes de pasar a la siguiente.
- Los mensajes de commit son sugerencias de contenido/alcance, no texto para copiar
  literal — escríbelos con tus propias palabras.
- Marca cada casilla `[ ]` → `[x]` a medida que avances.

---

## Fase 0 — Scaffolding del proyecto

**Objetivo:** tener un proyecto Tauri + React + TypeScript arrancando en modo dev.

- [x] Crear el proyecto con `npm create tauri-app@latest` (elige React + TypeScript + Vite)
- [x] Verificar que `npm run tauri dev` abre una ventana en blanco sin errores
- [x] Instalar `lucide-react` para los íconos de los controles
- [x] Configurar `.gitignore` (node_modules, target, dist)
- [x] Iniciar repo git propio (`git init`) si no lo hizo el scaffolding

**Commit sugerido:** `chore: scaffold del proyecto (tauri + react + ts)`

---

## Fase 1 — Ventana tipo widget

**Objetivo:** que la ventana se comporte como un widget flotante, no como una app normal.

En `src-tauri/tauri.conf.json`, configura la ventana con:

- Tamaño pequeño y fijo (no redimensionable) — piensa en un rectángulo horizontal tipo
  "now playing" (~390x110 es un buen punto de partida)
- Sin decoraciones (`decorations: false`)
- Fondo transparente (`transparent: true`)
- Siempre visible por encima (`alwaysOnTop: true`)
- Oculta de la barra de tareas (`skipTaskbar: true`)
- Sin sombra de sistema (`shadow: false`)

- [x] Aplicar estos flags en `tauri.conf.json`
- [x] Correr `npm run tauri dev` y confirmar que la ventana aparece sin bordes/título

**Commit sugerido:** `feat: configurar ventana flotante sin decoraciones`

---

## Fase 2 — Estructura visual base (glassmorphism)

**Objetivo:** el "card" de vidrio con layout: portada + info de canción + controles.

- [x] Crear el layout base en `App.tsx`: un contenedor `.card` con dos bloques:
      `.content` (portada + texto) y `.controls` (botones)
- [x] Escribir el CSS del efecto glass en `App.css`:
  - `backdrop-filter: blur(...)`
  - fondo semitransparente (`rgba(...)`)
  - bordes redondeados y un borde sutil (`border: 1px solid rgba(255,255,255,0.1)` es un
    punto de partida típico)
- [x] Usar una imagen placeholder para la portada mientras no hay datos reales
- [x] Verificar visualmente que el widget ya se ve "de vidrio" sobre el escritorio

**Commit sugerido:** `feat: layout base y estilos glassmorphism del widget`

---

## Fase 3 — Controles de reproducción (solo UI, sin lógica real aún)

**Objetivo:** botones prev / play-pause / next, con estado local simulado.

- [x] Agregar los tres botones con íconos de `lucide-react` (`SkipBack`, `Play`/`Pause`,
      `SkipForward`)
- [x] Manejar un estado local `isPlaying` (boolean) solo para alternar el ícono al hacer
      clic — todavía sin conectar a Tauri
- [x] Diferenciar visualmente el botón central (primario) de los laterales (secundarios)

**Commit sugerido:** `feat: controles de reproducción (UI, sin backend aún)`

---

## Fase 4 — Animación de barras tipo ecualizador

**Objetivo:** barras animadas que reaccionan a si hay música sonando o no.

- [x] Generar un patrón de N barras con altura y delay de animación aleatorios
      (piensa en una función `generateWaveConfig(bars: number)`)
- [x] Crear un componente `WaveAnimation` que reciba ese patrón y el estado
      `isPlaying`
- [x] En CSS: animación `@keyframes` que sube/baja la altura de cada barra en loop,
      y una clase `.paused` que la congela cuando no hay reproducción
- [x] Regenerar el patrón cada vez que cambia de canción (para que no se vea repetitivo)

**Commit sugerido:** `feat: animación de barras de audio (wave animation)`

---

## Fase 5 — Backend Rust: tipos y comandos Tauri

**Objetivo:** definir el contrato entre frontend y backend antes de implementar la
lógica real de cada SO.

- [x] Definir un struct `SongInfo { title, artist, is_playing }` serializable (`serde`)
- [x] Crear dos comandos Tauri: uno para **leer** el estado actual (`check_music`) y
      otro para **enviar acciones** de control (`control_media`, con un parámetro de
      acción tipo `"play_pause" | "next" | "prev"`)
- [x] De momento, que devuelvan datos falsos/hardcodeados (para probar el `invoke`
      desde React sin depender aún de ninguna API del sistema)
- [x] Desde `App.tsx`, hacer `invoke("check_music")` en un `useEffect` con
      `setInterval` (cada 1s) y pintar el resultado en pantalla

**Commit sugerido:** `feat: comandos Tauri (check_music, control_media) con datos mock`

---

## Fase 6 — Backend real: Windows (Media Session API)

**Objetivo:** conectar `check_music` / `control_media` a la música real de Windows.

- [x] Agregar el crate `windows` (con las features `Media_Control` y `Foundation`) como
      dependencia **condicional** (`[target.'cfg(target_os = "windows")'.dependencies]`)
      en `Cargo.toml`
- [x] Investigar `GlobalSystemMediaTransportControlsSessionManager` para obtener la
      sesión activa
- [x] Leer título, artista y estado de reproducción desde esa sesión
- [x] Implementar los tres controles (play/pause, next, prev) usando los métodos
      `TryTogglePlayPauseAsync`, `TrySkipNextAsync`, `TrySkipPreviousAsync`
- [x] Manejar el caso "no hay sesión activa" devolviendo un estado neutro en vez de
      error (para que la UI no se rompa)

**Commit sugerido:** `feat: integración con Windows Media Session API`

---

## Fase 7 — Backend real: Linux (MPRIS / D-Bus) — mejora sobre el original

**Objetivo:** el mismo contrato (`SongInfo`, control de acciones) pero implementado con
el estándar de Linux para reproductores multimedia.

- [x] Agregar el crate `mpris` como dependencia condicional para `target_os = "linux"`
      (requiere `libdbus-1-dev` y `pkg-config` instalados en el sistema para compilar)
- [x] Usar `PlayerFinder` para encontrar el reproductor activo (el que está sonando, o
      el primero disponible si ninguno lo está)
- [x] Mapear metadata de MPRIS (`title`, `artists`) a tu struct `SongInfo`
- [x] Implementar los controles usando los métodos del player (`play_pause`, `next`,
      `previous`)
- [x] Estructurar el código para que Windows y Linux vivan en módulos separados
      (por ejemplo `media/windows.rs` y `media/linux.rs`) detrás de una misma interfaz,
      seleccionada por `#[cfg(target_os = "...")]`

**Commit sugerido:** `feat: integración con MPRIS para soporte en Linux`

---

## Fase 8 — Transiciones y pulido de UX

**Objetivo:** que el cambio de canción no se sienta brusco.

- [x] Al pulsar prev/next: fade-out del título/artista, esperar a que termine la
      transición (~300ms), pedir los datos nuevos, fade-in
- [x] Sincronizar la regeneración del patrón de barras con ese mismo cambio de pista
- [x] Revisar estados límite: sin música, pausado, sesión que desaparece a mitad de uso

**Commit sugerido:** `polish: transiciones de fade al cambiar de canción`

---

## Fase 9 — Empaquetado y README

**Objetivo:** dejar el proyecto listo para compartir/instalar.

- [ ] Agregar íconos de la app (`src-tauri/icons/`)
- [ ] Probar `npm run tauri build` y confirmar que genera el instalador/paquete
- [ ] Escribir tu propio `README.md`: qué hace, stack usado, requisitos por SO
      (incluyendo las dependencias de sistema para Linux), cómo correr en dev y build

**Commit sugerido:** `docs: README y build de producción`

---

## Ideas para diferenciarlo más del original (opcional, después de la Fase 9)

- [x] Carátula del álbum real (MPRIS y Windows Media Session exponen el thumbnail)
- [ ] Reemplazar el polling por eventos (`MediaPropertiesChanged` en Windows,
      señales de D-Bus en Linux) en vez de preguntar cada segundo
- [ ] Barra de progreso / tiempo transcurrido de la canción
- [ ] Selector de sesión cuando hay varias apps reproduciendo a la vez
- [x] Bandeja del sistema con menú (mostrar/ocultar, prev/play-pause/next,
      fijar siempre-encima, salir) — verificado a nivel D-Bus/StatusNotifierItem
- [x] `visibleOnAllWorkspaces` para que no desaparezca al cambiar de escritorio
      virtual en Linux (Windows no soporta esta opción por limitación de Tauri)
- [ ] Ecualizador reactivo al audio real (no animación aleatoria):
  - [x] Captura del monitor de PulseAudio/PipeWire + FFT en Linux (`libpulse-simple-binding`
        + `rustfft`), verificado con datos reales en vivo — requiere `libpulse-dev` en el
        sistema para compilar
  - [x] Captura loopback vía WASAPI en Windows (`cpal`, activa loopback solo al tratar
        el dispositivo de salida como entrada) — sin verificar, no hay Windows a mano
  - [ ] Frontend: mover las barras con los niveles reales en vez de `generateWaveConfig`
