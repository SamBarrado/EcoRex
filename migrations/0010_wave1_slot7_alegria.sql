-- 0010_wave1_slot7_alegria: restore wave-1 slot 7 to Alegría.
--
-- Data-only. Slot 7 was Alegría (0008), then a draft of Furia was promoted into it and
-- unpromoted (the slot kept the draft's Fractae). Promote now only uses the slot of the
-- draft's own Fractae, so this cannot happen again. Only touches the slot if still unused.
-- Reversible: UPDATE species SET fractae_id = 1 WHERE id = 7;
UPDATE species SET fractae_id = (SELECT id FROM fractae WHERE slug = 'alegria')
  WHERE id = 7 AND scientific_name = '???' AND is_active = 0
    AND NOT EXISTS (SELECT 1 FROM species_phase_anchors a WHERE a.species_id = species.id)
    AND NOT EXISTS (SELECT 1 FROM discoveries d WHERE d.species_id = species.id);
