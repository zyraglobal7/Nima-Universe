import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Alert,
  Linking,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Save, Users, ChevronRight, X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { FriendsList } from "@/components/friends/FriendsList";
import { useTheme } from "@/lib/contexts/ThemeContext";

export function AccountTab() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const updateProfile = useMutation(api.users.mutations.updateProfile);

  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  // Update local state when user loads
  React.useEffect(() => {
    if (currentUser) {
      if (!firstName && currentUser.firstName)
        setFirstName(currentUser.firstName);
      if (!lastName && currentUser.lastName) setLastName(currentUser.lastName);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) return;

    setSaving(true);
    try {
      await updateProfile({ firstName, lastName });
      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your information has been saved successfully.",
      });
      setIsEditingProfile(false);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: "Could not save changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditingProfile(false);
    if (currentUser) {
      setFirstName(currentUser.firstName || "");
      setLastName(currentUser.lastName || "");
    }
  };

  const { isDark } = useTheme();

  const btnFg = isDark ? "#1A1614" : "#fff";

  if (!currentUser) return <ActivityIndicator color={isDark ? "#C9A07A" : "#5C2A33"} />;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Profile Info Tile */}
      <View className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-medium text-foreground dark:text-foreground-dark font-serif">
            Profile Information
          </Text>
          <TouchableOpacity
            onPress={
              isEditingProfile ? cancelEdit : () => setIsEditingProfile(true)
            }
            className="px-3 py-1.5 rounded-lg bg-surface-alt dark:bg-surface-alt-dark"
          >
            <Text className="text-sm font-medium text-foreground dark:text-foreground-dark font-sans">
              {isEditingProfile ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditingProfile ? (
          <View className="space-y-4">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
                  First Name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={isDark ? "#8C8078" : "#9CA3AF"}
                  className="bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg px-3 py-2 text-foreground dark:text-foreground-dark font-sans h-10"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground dark:text-foreground-dark mb-1.5 font-sans">
                  Last Name
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={isDark ? "#8C8078" : "#9CA3AF"}
                  className="bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-lg px-3 py-2 text-foreground dark:text-foreground-dark font-sans h-10"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="bg-primary dark:bg-primary-dark rounded-lg py-2.5 items-center flex-row justify-center space-x-2"
            >
              {saving ? (
                <ActivityIndicator color={btnFg} size="small" />
              ) : (
                <>
                  <Save size={16} color={btnFg} />
                  <Text className="text-primary-foreground dark:text-primary-dark-foreground font-medium font-sans">
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-muted-foreground dark:text-muted-dark-foreground text-sm font-sans">
                Name
              </Text>
              <Text className="text-foreground dark:text-foreground-dark text-sm font-sans font-medium">
                {currentUser.firstName || "-"} {currentUser.lastName || ""}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-muted-foreground dark:text-muted-dark-foreground text-sm font-sans">
                Email
              </Text>
              <Text className="text-foreground dark:text-foreground-dark text-sm font-sans font-medium">
                {currentUser.email}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-muted-foreground dark:text-muted-dark-foreground text-sm font-sans">
                Country
              </Text>
              <Text className="text-foreground dark:text-foreground-dark text-sm font-sans font-medium">
                {currentUser.country || "-"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Friends Card */}
      <TouchableOpacity
        onPress={() => setShowFriends(true)}
        className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-full">
            <Users size={20} className="text-primary dark:text-primary-dark" />
          </View>
          <View>
            <Text className="font-medium text-foreground dark:text-foreground-dark text-base font-serif">
              Friends
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
              Manage your connections
            </Text>
          </View>
        </View>
        <ChevronRight size={20} className="text-muted-foreground dark:text-muted-dark-foreground" />
      </TouchableOpacity>

      {/* Delete account link — subtle, at bottom */}
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            "Delete Account",
            "This will open your email client to send an account deletion request. Are you sure?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                style: "destructive",
                onPress: () => {
                  const email = encodeURIComponent(currentUser.email || "");
                  const subject = encodeURIComponent("Account Deletion Request");
                  const body = encodeURIComponent(
                    `Hi,\n\nI would like to request deletion of my account and all associated data.\n\nEmail: ${currentUser.email || ""}\n\nThank you.`
                  );
                  Linking.openURL(
                    `mailto:support@nimaai.com?subject=${subject}&body=${body}`
                  );
                },
              },
            ]
          );
        }}
        className="mt-8 items-center py-3"
      >
        <Text
          className="text-xs font-sans"
          style={{ color: isDark ? "#8C8078" : "#9C948A" }}
        >
          Delete my account
        </Text>
      </TouchableOpacity>

      {/* Friends Modal */}
      <Modal
        visible={showFriends}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriends(false)}
      >
        <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
          <View className="px-4 py-4 border-b border-border dark:border-border-dark flex-row items-center justify-between">
            <Text className="text-xl font-serif font-medium text-foreground dark:text-foreground-dark">
              Friends
            </Text>
            <TouchableOpacity
              onPress={() => setShowFriends(false)}
              className="p-2 bg-surface-alt dark:bg-surface-alt-dark rounded-full"
            >
              <X size={24} className="text-foreground dark:text-foreground-dark" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 px-4 pt-4">
            <FriendsList />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}
