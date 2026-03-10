import { getButler } from "$lib/firestore";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ params }) => {
  const butler = await getButler(params.id);
  if (!butler) error(404, "AI執事が見つかりません");
  return { butler };
};
