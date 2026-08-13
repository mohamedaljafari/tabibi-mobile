import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { getPatientProfile } from "@/lib/patient-profile";

export default function EntryScreen() {
  useEffect(() => {
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
