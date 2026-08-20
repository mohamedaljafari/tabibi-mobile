export const Platform = { OS: "ios", select: (obj: Record<string, unknown>) => obj.ios } as const;
export const StyleSheet = { create: (styles: unknown) => styles } as const;
