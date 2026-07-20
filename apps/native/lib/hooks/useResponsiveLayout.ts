import { useWindowDimensions } from "react-native";

/**
 * Breakpoint above which we treat the device as a tablet (iPad).
 * iPad mini portrait ≈ 744pt, iPad Air 11" portrait ≈ 820pt, so 700 safely
 * catches every iPad in portrait while never triggering on phones.
 */
export const TABLET_BREAKPOINT = 700;

/** Max content width for centered, non-grid layouts on large screens. */
export const CONTENT_MAX_WIDTH = 720;

export interface ResponsiveLayout {
  /** Current window width in points. */
  width: number;
  /** True on iPad-class screens. */
  isTablet: boolean;
  /** Number of grid columns to render (2 on phone, more on tablet). */
  columns: number;
  /** Horizontal screen padding to apply (larger on tablet). */
  horizontalPadding: number;
}

/**
 * Shared responsive layout values so grids and screens fill the iPad screen
 * instead of rendering a narrow 2-column phone layout (App Store Guideline 4).
 *
 * @param phoneColumns  columns on phones (default 2)
 * @param tabletColumns columns on tablets (default 3)
 */
export function useResponsiveLayout(
  phoneColumns = 2,
  tabletColumns = 3,
): ResponsiveLayout {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  // On very wide screens (landscape iPad / large iPad Pro) allow one extra column.
  const columns = isTablet
    ? width >= 1000
      ? tabletColumns + 1
      : tabletColumns
    : phoneColumns;

  return {
    width,
    isTablet,
    columns,
    horizontalPadding: isTablet ? 24 : 16,
  };
}
