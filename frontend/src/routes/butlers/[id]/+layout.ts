import { api } from "$lib/api";
import type { Butler } from "$lib/types";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ params }) => {
  try {
    const butler = await api.get<Butler>(`/butlers/${params.id}`);
    return { butler };
  } catch {
    error(404, "AI執事が見つかりません");
  }
};
