import { listDinosaurGenera, searchPbdbTaxa } from "../../../../../shared/species-sources/pbdb.mjs";
import { suggestGenera } from "../../../lib/genusLookup";
import { denyUnlessRole, jsonError, type AdminContext, type AdminEnv } from "../../../lib/adminAuth";

type Ctx = { admin: AdminContext };
const MAX_RESULTS = 200;

/**
 * GET ?q=Steg            -> flexible genus suggestions (anywhere in the name, typos, Spanish
 *                            spellings, and Spanish common names via Wikipedia as a fallback)
 * GET ?baseName=Theropoda&interval=Cretaceous&country=US&min=5 -> PBDB candidates
 * Each candidate says whether the project already uses that genus (it is NOT
 * excluded: a genus can be reused for another Fractae / edition).
 */
export const onRequestGet: PagesFunction<AdminEnv & { WIKIMEDIA_CONTACT?: string }, any, Ctx> = async ({ request, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const url = new URL(request.url);

  try {
    const q = url.searchParams.get("q");
    if (q !== null) return Response.json(await suggestGenera(q, await listDinosaurGenera(), { contact: env.WIKIMEDIA_CONTACT }));

    const minRaw = Number(url.searchParams.get("min") ?? 1);
    const candidates = (
      await searchPbdbTaxa({
        baseName: url.searchParams.get("baseName") || "Dinosauria",
        interval: url.searchParams.get("interval") || undefined,
        country: url.searchParams.get("country") || undefined,
        minOccurrences: Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 1,
      })
    ).slice(0, MAX_RESULTS);

    const [species, drafts] = await Promise.all([
      env.DB.prepare("SELECT scientific_name FROM species").all<{ scientific_name: string }>(),
      env.DB.prepare("SELECT genus, fractae, edition, status FROM species_drafts").all<{ genus: string; fractae: string; edition: string; status: string }>(),
    ]);
    const inGame = new Set((species.results ?? []).map((s) => s.scientific_name.split(" ")[0].toLowerCase()));
    return Response.json({
      candidates: candidates.map((c) => ({
        ...c,
        inProject: {
          inGame: inGame.has(c.genus.toLowerCase()),
          drafts: (drafts.results ?? []).filter((d) => d.genus.toLowerCase() === c.genus.toLowerCase()),
        },
      })),
    });
  } catch (e) {
    console.error("PBDB search failed:", e instanceof Error ? e.message : e);
    return jsonError(502, "No se pudo consultar PBDB");
  }
};
