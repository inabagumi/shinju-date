import { notFound } from "next/navigation";

import { fetchTalent } from "@/lib/data/talents";
import type { TalentDetail } from "@/lib/data/talents";

export type TalentPageParams = PageProps<"/talents/[id]">["params"];

/**
 * The talent of the page. For talents that are not shown (missing, retired,
 * deleted, or an ID that is not a UUID), this renders the not-found page.
 *
 * Each section of the page calls this inside its own `<Suspense>`, and
 * `fetchTalent` is cached, so the talent is fetched only once.
 */
export async function getShownTalent(
  params: TalentPageParams
): Promise<TalentDetail> {
  const { id } = await params;
  const talent = await fetchTalent(id);

  if (!talent) {
    notFound();
  }

  return talent;
}
