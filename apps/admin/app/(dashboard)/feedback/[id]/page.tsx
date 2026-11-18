import { PageHeader } from "@shinju-date/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/back-link";

import { createTitleFromMessage } from "../_lib/create-title-from-message";
import { getFeatureRequestById } from "../_lib/get-feedback";
import {
  FeatureRequestDetail,
  FeatureRequestDetailSkeleton,
} from "./_components/feedback-detail";

export const generateMetadata = async ({
  params,
}: Pick<PageProps<"/feedback/[id]">, "params">): Promise<Metadata> => {
  const { id } = await params;

  const featureRequest = await getFeatureRequestById(id);

  if (!featureRequest) {
    return {
      title: "機能要望が見つかりません",
    };
  }

  const title = createTitleFromMessage(featureRequest.message);

  return {
    title: `${title} - 機能要望詳細`,
  };
};

const FeatureRequestDetailData = async ({
  params,
}: Pick<PageProps<"/feedback/[id]">, "params">) => {
  const { id } = await params;

  const featureRequest = await getFeatureRequestById(id);

  if (!featureRequest) {
    notFound();
  }

  return <FeatureRequestDetail featureRequest={featureRequest} />;
};

export default function FeedbackDetailPage({
  params,
}: PageProps<"/feedback/[id]">) {
  return (
    <div>
      <div className="mb-4">
        <BackLink href="/feedback">機能要望一覧に戻る</BackLink>
      </div>

      <PageHeader title="機能要望詳細" />

      <Suspense fallback={<FeatureRequestDetailSkeleton />}>
        <FeatureRequestDetailData params={params} />
      </Suspense>
    </div>
  );
}
