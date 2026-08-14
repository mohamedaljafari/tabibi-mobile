import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useSegments } from "expo-router";

import { getPatientProfile } from "@/lib/patient-profile";

export default function EntryScreen() {
  const segments = useSegments();

  useEffect(() => {
    // لوحة التحكم المستقلة لها مسار مخصص على الويب ولا تمر بحارس تسجيل دخول المريض.
    const isAdminRoute = segments[0] === "admin-web";
    if (isAdminRoute) return;
    getPatientProfile().then((profile) => {
      router.replace((profile ? (profile.isSetupComplete ? "/home" : "/profile") : "/login") as never);
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#6B7B3F" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: "#F5F0E6", flex: 1, justifyContent: "center" },
});
