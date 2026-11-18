import { defineConfig } from "oxlint";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

import root from "../../oxlint.config.ts";

export default defineConfig({
  // The root comes last, so that its rules win over the presets
  extends: [react, next, root],
  rules: {
    // Label of components/form.tsx takes htmlFor from FormField, which the
    // rule cannot see. Only checks the label elements.
    "jsx-a11y/label-has-associated-control": [
      "error",
      {
        controlComponents: ["Input", "Select", "Textarea", "Checkbox", "Radio"],
        depth: 3,
        labelComponents: [],
      },
    ],
  },
});
