module.exports = function (api) {
  const isTest = api.env("test");
  api.cache.using(() => isTest);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Metro handles `import()` natively for code-splitting, but Jest runs on
    // plain Node/CommonJS, so dynamic imports (e.g. the lazy Google Sign-In
    // module load in lib/auth.ts) need converting to `require()` under test.
    plugins: isTest ? ["babel-plugin-dynamic-import-node"] : [],
  };
};
