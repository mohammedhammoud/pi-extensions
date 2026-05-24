import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreDependencies: [
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-tui",
  ],
  workspaces: {
    "extensions/pi-local-model-options": {
      project: ["src/**/*.ts", "*.ts"],
    },
  },
};

export default config;
