# shared/species-sources

Clientes de fuentes paleontológicas (PBDB, NHM Dino Directory, dinosaurpictures.org): **ESM puro, solo `fetch`, sin I/O ni efectos al importar**. Los usan a la vez el tooling local (`tools/species`, que los reexporta desde `tools/species/lib/`) y Ecorex Admin (`admin/functions`). Nada de aquí puede tocar el sistema de ficheros, `process` ni APIs de pago. Los tipos están en los `.d.mts`.
