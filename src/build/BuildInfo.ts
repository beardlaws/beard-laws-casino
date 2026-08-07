export interface BuildInfo {
  version: string;
  commit: string;
  branch: string;
  builtAt: string;
  mathMode: string;
}

const fallback = (value: string | undefined, replacement: string): string =>
  value && value.trim().length > 0 ? value.trim() : replacement;

export const BUILD_INFO: Readonly<BuildInfo> = Object.freeze({
  version: fallback(import.meta.env.VITE_BUILD_VERSION, "PROJECT-BEARD-M8-DEV"),
  commit: fallback(import.meta.env.VITE_BUILD_COMMIT, "local"),
  branch: fallback(import.meta.env.VITE_BUILD_BRANCH, "working-tree"),
  builtAt: fallback(import.meta.env.VITE_BUILD_TIME, new Date(0).toISOString()),
  mathMode: fallback(import.meta.env.VITE_MATH_MODE, "production-rules"),
});

export const buildFingerprint = (): string =>
  `${BUILD_INFO.version} • ${BUILD_INFO.commit} • ${BUILD_INFO.mathMode}`;
