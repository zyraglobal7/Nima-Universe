import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

interface NetworkContextValue {
  /** Whether the device has an active network connection (WiFi, cellular, etc.) */
  isConnected: boolean;
  /** Whether the internet is actually reachable (not just connected to WiFi with no internet) */
  isInternetReachable: boolean | null;
  /** Force a connectivity re-check */
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  refresh: async () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(true);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Initial fetch
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected ?? true);
    setIsInternetReachable(state.isInternetReachable);
  };

  return (
    <NetworkContext.Provider
      value={{ isConnected, isInternetReachable, refresh }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

