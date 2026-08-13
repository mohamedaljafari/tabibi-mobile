import { Image, StyleSheet, View } from "react-native";

type TabibiLogoProps = {
  size?: number;
};

type TabibiBrandProps = {
  width?: number;
};

export function TabibiLogo({ size = 72 }: TabibiLogoProps) {
  return (
    <View style={[styles.markWrap, { height: size, width: size }]}>
      <Image source={require("../assets/images/tabibi-mark.png")} style={styles.mark} resizeMode="contain" accessibilityLabel="رمز طبيبي" />
    </View>
  );
}

export function TabibiBrand({ width = 220 }: TabibiBrandProps) {
  return <Image source={require("../assets/images/tabibi-brand.png")} style={[styles.brand, { width }]} resizeMode="contain" accessibilityLabel="شعار طبيبي للرعاية الصحية المنزلية" />;
}

const styles = StyleSheet.create({
  markWrap: { alignItems: "center", justifyContent: "center" },
  mark: { height: "100%", width: "100%" },
  brand: { aspectRatio: 0.78, height: undefined },
});
