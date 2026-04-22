import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sparkles, X, Check } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface FloatingLoaderState {
  isVisible: boolean;
  lookId: Id<"looks"> | null;
  isMinimized: boolean;
  status: "generating" | "completed" | "failed";
  mode: "single" | "workflow";
}

export interface FloatingLoaderRef {
  startLoading: (lookId: Id<"looks">) => void;
  startWorkflowLoading: () => void;
  dismiss: () => void;
  minimize: () => void;
  expand: () => void;
}

interface FloatingLookLoaderProps {
  onStatusChange?: (status: "generating" | "completed" | "failed") => void;
}

export const FloatingLookLoader = forwardRef<
  FloatingLoaderRef,
  FloatingLookLoaderProps
>(({ onStatusChange }, ref) => {
  const router = useRouter();
  const { isDark } = useTheme();
  const [state, setState] = useState<FloatingLoaderState>({
    isVisible: false,
    lookId: null,
    isMinimized: false,
    status: "generating",
    mode: "single",
  });

  // Animation values
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Start rotation animation
  useEffect(() => {
    if (state.status === "generating") {
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.start();
      return () => rotateLoop.stop();
    }
  }, [state.status, rotateAnim]);

  // Poll for single look status when we have a lookId
  const lookStatus = useQuery(
    api.looks.queries.getLookGenerationStatus,
    state.mode === "single" && state.lookId ? { lookId: state.lookId } : "skip"
  );

  // Poll for workflow status when in workflow mode
  const workflowStatus = useQuery(
    api.workflows.index.getOnboardingWorkflowStatus,
    state.mode === "workflow" && state.isVisible ? {} : "skip"
  );

  // Update status based on query result for single look mode
  useEffect(() => {
    if (state.mode === "single" && lookStatus) {
      if (lookStatus.status === "completed" && state.status !== "completed") {
        setState((prev) => ({ ...prev, status: "completed" }));
        onStatusChange?.("completed");
      } else if (lookStatus.status === "failed" && state.status !== "failed") {
        setState((prev) => ({ ...prev, status: "failed" }));
        onStatusChange?.("failed");
      }
    }
  }, [lookStatus, state.mode, state.status, onStatusChange]);

  // Update status based on workflow status for workflow mode
  useEffect(() => {
    if (state.mode === "workflow" && workflowStatus) {
      // Update progress animation
      if (workflowStatus.totalCount > 0) {
        const percent = workflowStatus.completedCount / workflowStatus.totalCount;
        Animated.timing(progressAnim, {
          toValue: percent,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }

      if (
        workflowStatus.isComplete &&
        workflowStatus.completedCount > 0 &&
        state.status !== "completed"
      ) {
        setState((prev) => ({ ...prev, status: "completed" }));
        onStatusChange?.("completed");
      } else if (
        workflowStatus.hasLooks &&
        workflowStatus.failedCount > 0 &&
        workflowStatus.completedCount === 0 &&
        state.status !== "failed"
      ) {
        setState((prev) => ({ ...prev, status: "failed" }));
        onStatusChange?.("failed");
      }
    }
  }, [workflowStatus, state.mode, state.status, onStatusChange, progressAnim]);

  // Slide in/out animation
  useEffect(() => {
    if (state.isVisible) {
      if (state.isMinimized) {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }).start();
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state.isVisible, state.isMinimized, slideAnim, scaleAnim]);

  const startLoading = useCallback((lookId: Id<"looks">) => {
    setState({
      isVisible: true,
      lookId,
      isMinimized: false,
      status: "generating",
      mode: "single",
    });
    progressAnim.setValue(0);
  }, [progressAnim]);

  const startWorkflowLoading = useCallback(() => {
    setState({
      isVisible: true,
      lookId: null,
      isMinimized: false,
      status: "generating",
      mode: "workflow",
    });
    progressAnim.setValue(0);
  }, [progressAnim]);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false, lookId: null }));
  }, []);

  const minimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startLoading,
    startWorkflowLoading,
    dismiss,
    minimize,
    expand,
  }));

  const handleViewLook = () => {
    dismiss();
    if (state.lookId) {
      router.push(`/look/${state.lookId}`);
    } else {
      // For workflow mode, just dismiss - user is already on discover page
      // They can scroll to see their looks
    }
  };

  if (!state.isVisible) return null;

  // Get progress info for workflow mode
  const progressInfo =
    state.mode === "workflow" && workflowStatus
      ? {
          completed: workflowStatus.completedCount,
          total: workflowStatus.totalCount,
          percent:
            workflowStatus.totalCount > 0
              ? (workflowStatus.completedCount / workflowStatus.totalCount) * 100
              : 0,
        }
      : null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const bgColor = isDark ? "#252220" : "#F5F0E8";
  const borderColor = isDark ? "#3D3835" : "#E0D8CC";
  const textColor = isDark ? "#FAF8F5" : "#2D2926";
  const mutedColor = isDark ? "#8C8078" : "#6B6662";
  const primaryColor = isDark ? "#C9A07A" : "#5C2A33";
  const surfaceColor = isDark ? "#1A1614" : "#FAF8F5";

  return (
    <>
      {state.isMinimized ? (
        // Minimized state - small floating button
        <Animated.View
          style={[
            styles.minimizedButton,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: primaryColor,
            },
          ]}
        >
          <TouchableOpacity
            onPress={expand}
            style={styles.minimizedTouchable}
            activeOpacity={0.8}
          >
            {state.status === "completed" ? (
              <Check size={24} color={surfaceColor} />
            ) : state.status === "failed" ? (
              <X size={24} color={surfaceColor} />
            ) : (
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Sparkles size={24} color={surfaceColor} />
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        // Expanded state - floating card
        <Animated.View
          style={[
            styles.floatingCard,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: bgColor,
              borderColor: borderColor,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerLeft}>
              {state.status === "completed" ? (
                <View style={[styles.iconContainer, { backgroundColor: "#10B98120" }]}>
                  <Check size={16} color="#10B981" />
                </View>
              ) : state.status === "failed" ? (
                <View style={[styles.iconContainer, { backgroundColor: "#EF444420" }]}>
                  <X size={16} color="#EF4444" />
                </View>
              ) : (
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${primaryColor}20` },
                  ]}
                >
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <Sparkles size={16} color={primaryColor} />
                  </Animated.View>
                </View>
              )}
              <View>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                  {state.status === "completed"
                    ? state.mode === "workflow"
                      ? "Looks Ready!"
                      : "Look Ready!"
                    : state.status === "failed"
                      ? "Generation Failed"
                      : state.mode === "workflow"
                        ? "Creating Your Looks..."
                        : "Generating Look..."}
                </Text>
                <Text style={[styles.headerSubtitle, { color: mutedColor }]}>
                  {state.status === "completed"
                    ? state.mode === "workflow"
                      ? `${progressInfo?.total || "Your"} looks are ready to view`
                      : "Your look is ready to view"
                    : state.status === "failed"
                      ? "Something went wrong"
                      : progressInfo
                        ? `${progressInfo.completed}/${progressInfo.total} looks complete`
                        : "This may take a moment"}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={minimize} style={styles.headerButton}>
                <View style={[styles.minimizeIcon, { backgroundColor: mutedColor }]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={dismiss} style={styles.headerButton}>
                <X size={16} color={mutedColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {state.status === "generating" && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarTrack,
                      { backgroundColor: `${primaryColor}20` },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: primaryColor,
                          width: progressInfo ? progressWidth : "0%",
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {state.status === "completed" && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={dismiss}
                  style={[
                    styles.button,
                    styles.buttonSecondary,
                    { backgroundColor: `${primaryColor}10` },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
                {state.lookId && (
                  <TouchableOpacity
                    onPress={handleViewLook}
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      { backgroundColor: primaryColor },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, { color: surfaceColor }]}>
                      View Look
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {state.status === "failed" && (
              <TouchableOpacity
                onPress={dismiss}
                style={[
                  styles.button,
                  styles.buttonFull,
                  { backgroundColor: `${primaryColor}10` },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: textColor }]}>
                  Dismiss
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  minimizedButton: {
    position: "absolute",
    top: 80,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 50,
  },
  minimizedTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingCard: {
    position: "absolute",
    top: 80,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 50,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerButton: {
    padding: 6,
    borderRadius: 12,
  },
  minimizeIcon: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  content: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {},
  buttonPrimary: {},
  buttonFull: {
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
