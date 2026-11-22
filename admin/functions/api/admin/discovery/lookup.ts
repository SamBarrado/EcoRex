import { research } from "../../../lib/discovery";
import { denyUnlessRole, jsonError, type AdminContext, type AdminEnv } from "../../../lib/adminAuth";

/** GET ?genus=Stegosaurus — what the three real sources return. Free; saves nothing. */
export const onRequestGet: PagesFunction<AdminEnv, any, { admin: AdminContext }> = async ({ request, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const genus = new URL(request.url).searchParams.get("genus")?.trim();
  if (!genus || !/^[A-Za-z]{2,40}$/.test(genus)) return jsonError(400, "Género no válido");
  return Response.json(await research(genus));
};
