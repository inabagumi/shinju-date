import { Slot } from "@radix-ui/react-slot";
import { twMerge } from "@shinju-date/ui";
import type { ComponentPropsWithRef } from "react";

interface TextLinkProps extends ComponentPropsWithRef<"a"> {
  /** Render the child, such as `next/link`, instead of `<a>` */
  asChild?: boolean;
}

/** A link in the accent color, such as to a channel or a calendar */
export const TextLink = ({
  asChild = false,
  className,
  ...props
}: TextLinkProps) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      className={twMerge(
        "inline-flex items-center gap-1 rounded-control font-semibold text-accent underline-offset-4 focus-ring hover:underline",
        className
      )}
      {...props}
    />
  );
};

/** The icon next to the text of `TextLink`. Pass the icon as the child */
export const TextLinkIcon = ({
  className,
  ...props
}: ComponentPropsWithRef<typeof Slot>) => (
  <Slot
    aria-hidden="true"
    className={twMerge("size-4", className)}
    {...props}
  />
);
