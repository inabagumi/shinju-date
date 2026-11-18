interface SearchModalSectionHeadingProps {
  children: string;
  id?: string;
}

/** 検索モーダルの候補のまとまりに付ける見出し */
export function SearchModalSectionHeading({
  children,
  id,
}: SearchModalSectionHeadingProps) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-meta text-muted" id={id}>
        {children}
      </h2>
    </div>
  );
}
