# Actualización automática de lanzamientos

El sitio revisa cada seis horas los ocho perfiles musicales de Crystal Soul Records. No requiere Spotify Premium, una cuenta de desarrollador ni credenciales privadas.

## Cómo funciona

1. GitHub Actions consulta el catálogo musical público mediante los identificadores verificados de cada artista.
2. `scripts/sync-releases.mjs` genera `data/auto-catalog.json`.
3. El sitio combina ese archivo con los catálogos curados y elimina duplicados.
4. Si aparece un lanzamiento nuevo, GitHub publica de nuevo la página y el contador se actualiza automáticamente.

Los enlaces directos verificados en los catálogos curados, el catálogo anterior o `data/release-link-overrides.json` se conservan en cada sincronización. Al combinar entradas duplicadas, el sitio siempre prefiere un enlace directo al lanzamiento sobre una búsqueda de Spotify.

La fuente pública de metadatos es Apple Music/iTunes. Spotify puede publicar un lanzamiento antes de que esa fuente lo incluya. En ese caso, puede añadirse al catálogo curado de su artista con el enlace y la portada oficiales; esa entrada permanece visible después de las sincronizaciones.

Una entrada nueva sin enlace directo verificado conserva la búsqueda de artista y título como alternativa hasta que se añada la URL oficial.

## Revisión manual opcional

En GitHub abre **Actions → Sync music releases → Run workflow** para revisar el catálogo inmediatamente sin esperar el siguiente ciclo.
