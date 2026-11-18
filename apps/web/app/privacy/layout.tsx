import SimpleDocument from "@/components/simple-document";
import { createPageMetadata } from "@/lib/metadata";

const TITLE = "プライバシーポリシー";

export const metadata = createPageMetadata({
  path: "/privacy",
  title: TITLE,
  type: "article",
});

export default function PrivacyLayout({ children }: LayoutProps<"/privacy">) {
  return <SimpleDocument title={TITLE}>{children}</SimpleDocument>;
}
