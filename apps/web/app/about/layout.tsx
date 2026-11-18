import SimpleDocument from "@/components/simple-document";
import { createPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site";

const TITLE = `${SITE_NAME}とは?`;

export const metadata = createPageMetadata({
  path: "/about",
  title: TITLE,
  type: "article",
});

export default function AboutLayout({ children }: LayoutProps<"/about">) {
  return <SimpleDocument title={TITLE}>{children}</SimpleDocument>;
}
