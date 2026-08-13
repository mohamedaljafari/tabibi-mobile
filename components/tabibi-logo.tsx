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
  // Brand logo aspect ratio ≈ 0.78 (width/height) → height = width / 0.78.
  // Fixed height is used instead of aspectRatio for reliable rendering on web.
  return <Image source={require("../assets/images/tabibi-brand.png")} style={[styles.brand, { width, height: Math.round(width / 0.78) }]} resizeMode="contain" accessibilityLabel="شعار طبيبي للرعاية الصحية المنزلية" />;
}

const styles = StyleSheet.create({
  markWrap: { alignItems: "center", justifyContent: "center" },
  mark: { height: "100%", width: "100%" },
  brand: { height: undefined },
});
