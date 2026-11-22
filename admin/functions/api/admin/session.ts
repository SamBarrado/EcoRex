import type { AdminContext, AdminEnv } from "../../lib/adminAuth";

export const onRequestGet: PagesFunction<AdminEnv, any, { admin: AdminContext }> = async ({ data }) => {
  const { user, role } = data.admin;
  return Response.json({ user: { id: user.id, email: user.email, display_name: user.display_name }, role });
};
