const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow @react-native-async-storage/async-storage to resolve on web (Metro
// defaults to a native-only module). Web gets a tiny localStorage-backed shim
// so browser previews, admin-web, and Vercel deployments can run the app
// with the same local-first data layer used by the mobile apps.
if (config.resolver) {
  // Map the native AsyncStorage package to a localStorage-backed shim on web.
  // extraNodeModules only affects the platform it is set for when Metro
  // resolves module names, which is exactly what we need here.
  const asyncShimPath = require("path").resolve(
    __dirname,
    "web-shims/async-storage.ts",
  );
  if (config.resolver.extraNodeModules) {
    config.resolver.extraNodeModules = {
      ...config.resolver.extraNodeModules,
      "@react-native-async-storage/async-storage": asyncShimPath,
    };
  } else {
    config.resolver.extraNodeModules = {
      "@react-native-async-storage/async-storage": asyncShimPath,
    };
  }
}

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Use the virtual CSS module during production export; the file-system mode
  // can fail in clean CI/Vercel builds when Metro hashes the generated file.
  forceWriteFileSystem: false,
});
