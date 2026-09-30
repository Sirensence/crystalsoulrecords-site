# Actualización automática de lanzamientos

El sitio revisa cada seis horas los ocho perfiles musicales de Crystal Soul Records. No requiere Spotify Premium, una cuenta de desarrollador ni credenciales privadas.

## Cómo funciona

1. GitHub Actions consulta el catálogo musical público mediante los identificadores verificados de cada artista.
2. `scripts/sync-releases.mjs` genera `data/auto-catalog.json`.
3. El sitio combina ese archivo con los catálogos curados y elimina duplicados.
4. Si aparece un lanzamiento nuevo, GitHub publica de nuevo la página y el contador se actualiza automáticamente.

Los enlaces curados existentes continúan abriendo directamente Spotify. Un lanzamiento detectado automáticamente abre una búsqueda precisa en Spotify con el artista y el título. Cuando se conoce un enlace directo, puede añadirse opcionalmente a `data/release-link-overrides.json`, pero esto no es necesario para que el lanzamiento aparezca.

## Revisión manual opcional

En GitHub abre **Actions → Sync music releases → Run workflow** para revisar el catálogo inmediatamente sin esperar el siguiente ciclo.
