import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./Table";

const renderTable = () =>
  render(
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="whitespace-normal">動画のタイトル</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

describe(Table, () => {
  it("scrolls horizontally inside the bordered container", () => {
    renderTable();

    const table = screen.getByRole("table");

    expect(table).toHaveClass("table-fixed");
    expect(table.parentElement).toHaveClass(
      "overflow-x-auto",
      "rounded-container",
      "border"
    );
  });

  it("lets keyboard users focus the scroll container", () => {
    renderTable();

    const container = screen.getByRole("table").parentElement;

    expect(container).toHaveAttribute("tabindex", "0");
    expect(container).toHaveClass("focus-ring");
  });

  it("renders column headers with the column scope", () => {
    renderTable();

    const header = screen.getByRole("columnheader", { name: "タイトル" });

    expect(header).toHaveAttribute("scope", "col");
    expect(header).toHaveClass("text-caption", "text-muted");
  });

  it("lets cells opt in to wrapping", () => {
    renderTable();

    const cell = screen.getByRole("cell", { name: "動画のタイトル" });

    expect(cell).toHaveClass("whitespace-normal");
    expect(cell).not.toHaveClass("whitespace-nowrap");
  });
});
