import React, { Component, type ErrorInfo, type ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

/* ─── Types ─── */

interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback component. Receives error + retry callback. */
  fallback?: (props: { error: Error; retry: () => void }) => ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ─── Error Boundary (class component — required by React) ─── */

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary] Caught error:", error);
    console.error("[AppErrorBoundary] Component stack:", info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback takes priority
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
        });
      }

      return <ErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/* ─── Default Fallback UI ─── */

function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const bg = isDark ? "#1A1614" : "#FAF8F5";
  const surface = isDark ? "#252220" : "#F5F0E8";
  const textPrimary = isDark ? "#F5F0E8" : "#2D2926";
  const textSecondary = isDark ? "#C4B8A8" : "#6B635B";
  const textMuted = isDark ? "#8C8078" : "#9C948A";
  const accent = isDark ? "#C9A07A" : "#5C2A33";
  const accentFg = isDark ? "#1A1614" : "#FAF8F5";
  const border = isDark ? "#3D3835" : "#E0D8CC";
  const errorColor = isDark ? "#D4807A" : "#B85C5C";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <AlertTriangle size={28} color={errorColor} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: textPrimary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Something went wrong
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 14,
            color: textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          An unexpected error occurred. You can try again and it should go away.
        </Text>

        {/* Error detail (collapsed) */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            width: "100%",
            marginBottom: 32,
          }}
        >
          <Text
            style={{ fontSize: 12, color: textMuted, fontFamily: "monospace" }}
            numberOfLines={3}
          >
            {error.message}
          </Text>
        </View>

        {/* Retry Button */}
        <TouchableOpacity
          onPress={retry}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accent,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <RefreshCw size={16} color={accentFg} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: accentFg }}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ─── Expo Router-compatible ErrorBoundary export ─── */

/**
 * A styled error boundary screen for use as an Expo Router `ErrorBoundary`
 * export from route / layout files.
 *
 * Usage:
 *   export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";
 */
export function RouteErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <ErrorFallback error={error} retry={retry} />;
}

/* ─── Navigation-Safe Error Boundary ─── */

/**
 * An auto-retrying error boundary that specifically catches transient
 * "Couldn't find a navigation context" errors thrown by React Navigation
 * during hot reload or mount race conditions.
 *
 * - Shows a branded loader (not an error screen) since the error is transient
 * - Automatically resets after ~150ms to re-attempt the render
 * - Caps retries at 5 to prevent infinite loops; falls back to the normal
 *   error fallback if exhausted
 * - Non-navigation errors pass through to the existing AppErrorBoundary
 */

const MAX_NAV_RETRIES = 5;

interface NavigationSafeBoundaryProps {
  children: ReactNode;
}

interface NavigationSafeBoundaryState {
  hasError: boolean;
  error: Error | null;
  isNavError: boolean;
  retries: number;
}

export class NavigationSafeBoundary extends Component<
  NavigationSafeBoundaryProps,
  NavigationSafeBoundaryState
> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: NavigationSafeBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, isNavError: false, retries: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<NavigationSafeBoundaryState> {
    const isNavError =
      error.message.includes("navigation context") ||
      error.message.includes("navigation state");
    return { hasError: true, error, isNavError };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (
      error.message.includes("navigation context") ||
      error.message.includes("navigation state")
    ) {
      console.warn(
        `[NavigationSafeBoundary] Navigation context error (retry ${this.state.retries + 1}/${MAX_NAV_RETRIES}):`,
        error.message,
      );
    } else {
      console.error("[NavigationSafeBoundary] Non-navigation error:", error);
      console.error("[NavigationSafeBoundary] Component stack:", info.componentStack);
    }
  }

  componentDidUpdate(
    _prevProps: NavigationSafeBoundaryProps,
    prevState: NavigationSafeBoundaryState,
  ): void {
    // If we just caught a navigation error and haven't exhausted retries, schedule auto-retry
    if (
      this.state.hasError &&
      this.state.isNavError &&
      this.state.retries < MAX_NAV_RETRIES &&
      !prevState.hasError
    ) {
      this.retryTimer = setTimeout(() => {
        this.setState((s) => ({
          hasError: false,
          error: null,
          isNavError: false,
          retries: s.retries + 1,
        }));
      }, 150);
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, isNavError: false, retries: 0 });
  };

  render(): ReactNode {
    // Navigation error + retries remaining → show loader
    if (this.state.hasError && this.state.isNavError && this.state.retries < MAX_NAV_RETRIES) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#A67C52" />
        </View>
      );
    }

    // Exhausted retries or non-navigation error → show the standard error fallback
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

