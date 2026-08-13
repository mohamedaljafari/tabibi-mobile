import Svg, { Path, Rect } from "react-native-svg";

type TabibiLogoProps = {
  size?: number;
};

export function TabibiLogo({ size = 72 }: TabibiLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityLabel="شعار طبيبي">
      <Rect width="72" height="72" rx="22" fill="#E8F5F7" />
      <Path d="M16 35.5 36 18l20 17.5v18.7c0 2.1-1.7 3.8-3.8 3.8H19.8A3.8 3.8 0 0 1 16 54.2V35.5Z" fill="#0B6E99" />
      <Path d="M35.9 26.1c-5.7-5.4-14.4 3.4-5.1 10.2l5.1 4.2 5.1-4.2c9.4-6.8.6-15.6-5.1-10.2Z" fill="#FFFFFF" />
      <Path d="M35.9 29.7v7.5M32.15 33.45h7.5" stroke="#31A9A1" strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M25.2 47.7h5.6l2.5-4.3 4.1 7.2 2.5-3.3h6.9" stroke="#31A9A1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
