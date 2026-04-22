import { useRef } from "react";
import { View, PanResponder, LayoutChangeEvent } from "react-native";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
}: SliderProps) {
  const trackWidth = useRef(0);
  // Keep latest props in a ref so panResponder callbacks are always current
  const stateRef = useRef({ value, min, max, step, onValueChange });
  stateRef.current = { value, min, max, step, onValueChange };

  const getValueFromX = (x: number) => {
    const { min, max, step, onValueChange } = stateRef.current;
    if (trackWidth.current === 0) return;
    const ratio = Math.min(Math.max(x / trackWidth.current, 0), 1);
    const raw = ratio * (max - min) + min;
    const snapped = Math.round((raw - min) / step) * step + min;
    const clamped = Math.min(Math.max(snapped, min), max);
    onValueChange(clamped);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => getValueFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => getValueFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const { min: _min, max: _max } = stateRef.current;
  const fillPercent = _max === _min ? 0 : ((value - _min) / (_max - _min)) * 100;

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      className="h-10 justify-center"
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {/* Track */}
      <View className="h-1.5 rounded-full bg-border overflow-hidden">
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${fillPercent}%` }}
        />
      </View>
      {/* Thumb */}
      <View
        className="absolute w-5 h-5 rounded-full bg-primary border-2 border-background"
        style={{
          left: `${fillPercent}%`,
          marginLeft: -10,
          top: "50%",
          marginTop: -10,
        }}
        pointerEvents="none"
      />
    </View>
  );
}
