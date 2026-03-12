import { getButler } from "$lib/firestore";
import { auth } from "$lib/firebase";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

/** Firebase Auth の初期化（onAuthStateChanged 初回発火）を待つ */
function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      resolve();
    });
  });
}

export const load: LayoutLoad = async ({ params }) => {
  await waitForAuth();
  const butler = await getButler(params.id);
  if (!butler) error(404, "AI執事が見つかりません");
  return { butler };
};
