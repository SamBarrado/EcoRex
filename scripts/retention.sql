-- Métricas de retención de Ecorex. SOLO LECTURA (únicamente SELECT).
--   npm run db:retention          -> D1 local
--   npm run db:retention:remote   -> D1 de producción (paso consciente, lo lanzas tú)
--
-- "Actividad" = una fila en `discoveries` (percibir o fusionar). Los días son
-- UTC, igual que `created_at` / `discovered_at`. No se muestran emails ni
-- nombres: solo ids y recuentos.

-- 1. Resumen: usuarios, activación y actividad reciente.
SELECT
  (SELECT COUNT(*) FROM users) AS usuarios,
  (SELECT COUNT(DISTINCT user_id) FROM discoveries) AS usuarios_con_alguna_carta,
  (SELECT COUNT(DISTINCT user_id) FROM discoveries WHERE discovered_at >= datetime('now', '-1 day')) AS activos_24h,
  (SELECT COUNT(DISTINCT user_id) FROM discoveries WHERE discovered_at >= datetime('now', '-7 days')) AS activos_7d,
  (SELECT COUNT(DISTINCT user_id) FROM discoveries WHERE discovered_at >= datetime('now', '-30 days')) AS activos_30d,
  (SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-7 days')) AS altas_7d;

-- 2. Retención por antigüedad. "elegibles" = usuarios con al menos N días de vida.
--    exacto  = volvió justo el día N tras el alta.
--    ventana = volvió algún día entre el 1 y el N tras el alta (más estable con pocos usuarios).
SELECT
  'D1' AS hito,
  COUNT(*) AS elegibles,
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) = date(u.created_at, '+1 day'))) AS vuelven_exacto,
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) BETWEEN date(u.created_at, '+1 day') AND date(u.created_at, '+1 day'))) AS vuelven_en_ventana
FROM users u WHERE u.created_at <= datetime('now', '-1 day')
UNION ALL
SELECT
  'D7', COUNT(*),
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) = date(u.created_at, '+7 days'))),
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) BETWEEN date(u.created_at, '+1 day') AND date(u.created_at, '+7 days')))
FROM users u WHERE u.created_at <= datetime('now', '-7 days')
UNION ALL
SELECT
  'D30', COUNT(*),
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) = date(u.created_at, '+30 days'))),
  SUM(EXISTS (SELECT 1 FROM discoveries d WHERE d.user_id = u.id
              AND date(d.discovered_at) BETWEEN date(u.created_at, '+1 day') AND date(u.created_at, '+30 days')))
FROM users u WHERE u.created_at <= datetime('now', '-30 days');

-- 3. Actividad diaria de las últimas 2 semanas.
SELECT
  date(discovered_at) AS dia,
  COUNT(DISTINCT user_id) AS usuarios_activos,
  COUNT(*) AS cartas
FROM discoveries
WHERE discovered_at >= datetime('now', '-14 days')
GROUP BY date(discovered_at)
ORDER BY dia DESC;

-- 4. Un usuario por fila (solo ids): cuántos días distintos han jugado y cuándo fue la última vez.
SELECT
  u.id AS usuario,
  date(u.created_at) AS alta,
  COUNT(DISTINCT date(d.discovered_at)) AS dias_distintos_jugados,
  COUNT(d.id) AS cartas,
  MAX(date(d.discovered_at)) AS ultima_actividad,
  CAST(julianday('now') - julianday(MAX(d.discovered_at)) AS INTEGER) AS dias_sin_jugar
FROM users u
LEFT JOIN discoveries d ON d.user_id = u.id
GROUP BY u.id
ORDER BY ultima_actividad DESC;
