// Web shim for react-native-pager-view
// PagerView is native-only; on web we render children in a simple View
import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";

const PagerView = forwardRef(function PagerView(
  { children, style, initialPage = 0, onPageSelected, ...rest },
  ref
) {
  const [page, setPage] = React.useState(initialPage);
  const childArray = React.Children.toArray(children);

  useImperativeHandle(ref, () => ({
    setPage: (index) => {
      setPage(index);
      onPageSelected?.({ nativeEvent: { position: index } });
    },
    setPageWithoutAnimation: (index) => {
      setPage(index);
      onPageSelected?.({ nativeEvent: { position: index } });
    },
  }));

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]}>
      {childArray[page] ?? null}
    </View>
  );
});

export default PagerView;
