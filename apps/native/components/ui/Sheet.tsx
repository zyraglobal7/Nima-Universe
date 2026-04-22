import React, { forwardRef, useCallback, useMemo } from "react";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetProps as GorhomBottomSheetProps,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface SheetProps extends Partial<GorhomBottomSheetProps> {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export const Sheet = forwardRef<BottomSheet, SheetProps>(
  ({ children, snapPoints = ["50%", "90%"], ...props }, ref) => {
    const { isDark } = useTheme();

    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#E0D8CC" : "#9C948A",
        }}
        {...props}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
          {children}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

Sheet.displayName = "Sheet";
