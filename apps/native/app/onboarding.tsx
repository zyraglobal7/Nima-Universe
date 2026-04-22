import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { OnboardingWizard } from "@/components/onboarding";
import { Loader } from "@/components/ui/Loader";

function UnauthenticatedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <Loader />;
}

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <AuthLoading>
        <Loader />
      </AuthLoading>

      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>

      <Authenticated>
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
          <OnboardingWizard
            onComplete={() => router.replace("/(tabs)/discover")}
          />
        </SafeAreaView>
      </Authenticated>
    </View>
  );
}
