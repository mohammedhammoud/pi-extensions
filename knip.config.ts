import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreDependencies: [
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-tui",
  ],
  ignoreExportsUsedInFile: true,
  workspaces: {
    "extensions/pi-local-model-options": {
      project: ["src/**/*.ts", "*.ts"],
    },
    "extensions/pi-worker": {
      project: ["src/**/*.ts", "*.ts", "!src/**/*.test.ts"],
    },
  },
};

export default config;
