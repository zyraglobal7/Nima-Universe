const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(projectRoot);

// Monorepo: merge workspace root into watchFolders (don't replace defaults)
config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Resolve @/convex/* → local convex/ copy (self-contained within apps/native)
  if (moduleName.startsWith("@/convex/")) {
    const rest = moduleName.slice("@/convex/".length);
    const resolved = path.resolve(projectRoot, "convex", rest);
    return context.resolveRequest(context, resolved, platform);
  }
  // Alias react-native-pager-view to a web shim on web platform
  if (platform === "web" && moduleName === "react-native-pager-view") {
    return {
      filePath: path.resolve(__dirname, "shims/react-native-pager-view.web.js"),
      type: "sourceFile",
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });