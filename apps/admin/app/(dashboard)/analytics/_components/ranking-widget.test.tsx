import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RankingWidget } from "./ranking-widget";

interface Row {
  id: string;
  name: string;
  count: number;
}

const rows: Row[] = [
  { count: 1200, id: "a", name: "Alpha" },
  { count: 30, id: "b", name: "Beta" },
];

const dateRange = { endDate: "2026-11-14", startDate: "2026-11-08" };

const renderTalentRanking = () => {
  render(
    <RankingWidget
      dateRange={dateRange}
      description="説明"
      exportType="talents"
      getHref={(row) => `/talents/${row.id}`}
      getKey={(row) => row.id}
      getLabel={(row) => row.name}
      getValue={(row) => row.count}
      labelHeading="タレント"
      rows={rows}
      selectedDate={null}
      title="人気タレントランキング"
      valueHeading="クリック数"
    />
  );
};

describe(RankingWidget, () => {
  it("renders the header and the export link", () => {
    renderTalentRanking();

    expect(
      screen.getByRole("heading", { name: /人気タレントランキング/u })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "CSV をダウンロード" })
    ).toHaveAttribute(
      "href",
      "/api/export/talents?from=2026-11-08&to=2026-11-14"
    );
    expect(
      screen.getByRole("columnheader", { name: "クリック数" })
    ).toBeInTheDocument();
  });

  it("renders the ranked rows", () => {
    renderTalentRanking();

    const [, firstRow, secondRow] = screen.getAllByRole("row");
    expect(
      within(firstRow as HTMLElement).getByRole("link", { name: "Alpha" })
    ).toHaveAttribute("href", "/talents/a");
    expect(firstRow).toHaveTextContent("1,200");
    expect(secondRow).toHaveTextContent("Beta");
  });

  it("does not link the names without getHref", () => {
    render(
      <RankingWidget
        dateRange={dateRange}
        description="説明"
        exportType="keywords"
        getKey={(row) => row.id}
        getLabel={(row) => row.name}
        getValue={(row) => row.count}
        labelHeading="キーワード"
        rows={rows}
        selectedDate={null}
        title="人気キーワードランキング"
        valueHeading="検索回数"
      />
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Alpha" })
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    render(
      <RankingWidget
        dateRange={dateRange}
        description="説明"
        exportType="videos"
        getKey={(row: Row) => row.id}
        getLabel={(row) => row.name}
        getValue={(row) => row.count}
        labelHeading="動画"
        rows={[]}
        selectedDate={null}
        title="人気動画ランキング"
        valueHeading="クリック数"
      />
    );

    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });
});
