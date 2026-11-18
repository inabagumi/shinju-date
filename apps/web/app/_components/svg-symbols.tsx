import {
  LOGO_PATH,
  LOGO_VIEW_BOX,
  SEARCH_ICON_CIRCLE,
  SEARCH_ICON_PATH,
  SEARCH_ICON_VIEW_BOX,
} from "@/lib/svg-symbols";

export default function SVGSymbols() {
  return (
    <svg aria-hidden="true" className="hidden">
      <defs>
        <symbol id="svg-symbols-square-icon" viewBox={SEARCH_ICON_VIEW_BOX}>
          <circle
            {...SEARCH_ICON_CIRCLE}
            fill="transparent"
            stroke="currentColor"
          />
          <path d={SEARCH_ICON_PATH} fill="currentColor" />
        </symbol>
        <symbol id="svg-symbols-logo" viewBox={LOGO_VIEW_BOX}>
          <path d={LOGO_PATH} fill="currentColor" />
        </symbol>
      </defs>
    </svg>
  );
}
