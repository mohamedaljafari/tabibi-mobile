import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { getPatientProfile } from "@/lib/patient-profile";

export default function EntryScreen() {
  useEffect(() => {
    getPatientProfile().then((profile) => {
      router.replace((profile ? "/home" : "/register") as never);
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#0B6E99" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: "#F5FAFC", flex: 1, justifyContent: "center" },
});
