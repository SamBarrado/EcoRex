-- 0009_wave_slots_one_per_fractae: each wave gets exactly one reserved slot per Fractae.
--
-- Data-only; touches ONLY unused placeholders ('???', inactive). Waves 2-5 reserved 8 slots each
-- that cycled through the 6 Fractae that existed at the time (1..6,1,2). With Alegría (7) and
-- Confianza (8) in `fractae` (0008), the 8 slots of a wave become Fractae 1..8, one each;
-- wave 1 already is (6 live species + slots 7 = Alegría, 8 = Confianza).
-- Fractae ids: 1 Furia, 2 Sorpresa, 3 Tristeza, 4 Miedo, 5 Asco, 6 Curiosidad, 7 Alegría, 8 Confianza.
-- Reversible only approximately (previous cycle: fractae_id = ((id - 7) % 6) + 1).
UPDATE species SET fractae_id = ((id - 9) % 8) + 1
  WHERE id BETWEEN 9 AND 40
    AND scientific_name = '???' AND is_active = 0
    AND NOT EXISTS (SELECT 1 FROM species_phase_anchors a WHERE a.species_id = species.id)
    AND NOT EXISTS (SELECT 1 FROM discoveries d WHERE d.species_id = species.id);
