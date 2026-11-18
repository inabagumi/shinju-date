import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const IMAGE = { blur_data_url: "data:image/png;base64,AAAA", id: "icon" };

describe("Avatar", () => {
  test("should show the image as a decoration by default", () => {
    const { container } = render(
      <Avatar data-testid="avatar" size={20}>
        <AvatarImage image={IMAGE} sizes="20px" />
      </Avatar>
    );
    const image = container.querySelector("img");

    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("sizes", "20px");
    expect(image?.getAttribute("src")).toContain("profile-images%2Ficon");
    expect(screen.getByTestId("avatar")).toHaveStyle({
      height: "20px",
      width: "20px",
    });
  });

  test("should leave the size to the class names without a size", () => {
    render(
      <Avatar className="size-20" data-testid="avatar">
        <AvatarImage image={IMAGE} sizes="80px" />
      </Avatar>
    );
    const avatar = screen.getByTestId("avatar");

    expect(avatar).toHaveClass("size-20", "rounded-full");
    expect(avatar).not.toHaveAttribute("style");
  });

  test("should announce the alternative text of the image", () => {
    render(
      <Avatar>
        <AvatarImage alt="朝霧ミオ" image={IMAGE} sizes="20px" />
      </Avatar>
    );

    expect(screen.getByRole("img", { name: "朝霧ミオ" })).toBeInTheDocument();
  });

  test("should show the default icon as a decoration", () => {
    const { container } = render(
      <Avatar size={20}>
        <AvatarFallback data-testid="fallback" />
      </Avatar>
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("fallback")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  test("should show the given fallback", () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">A</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByTestId("fallback")).toHaveTextContent("A");
  });
});
