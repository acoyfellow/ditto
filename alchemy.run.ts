import alchemy from "alchemy";

import {
  SvelteKit,
  Worker,
  DurableObjectNamespace,
  D1Database,
  Ai
} from "alchemy/cloudflare";

import type { DittoJob } from "./worker/index.ts";

const projectName = "ditto";

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD || "default-password"
});

const MY_DO = DurableObjectNamespace(`${projectName}-do`, {
  className: "MyDO",
  scriptName: `${projectName}-worker`,
  sqlite: true
});

const DITTO_JOB = DurableObjectNamespace(`${projectName}-job`, {
  className: "DittoJob",
  scriptName: `${projectName}-worker`,
  sqlite: true
});

const DB = await D1Database(`${projectName}-db`, {
  name: `${projectName}-db`,
  migrationsDir: "migrations",
  adopt: true,
});

export const MODEL_WORKER = await Worker(`${projectName}-model-runner`, {
  name: `${projectName}-model-runner`,
  entrypoint: "./worker/model-runner.ts",
  adopt: true,
  bindings: {
    AI: Ai(),
  },
  url: false,
});

export const WORKER = await Worker(`${projectName}-worker`, {
  name: `${projectName}-worker`,
  entrypoint: "./worker/index.ts",
  adopt: true,
  bindings: {
    MY_DO,
    DITTO_JOB,
    MODEL_RUNNER: MODEL_WORKER,
    AI: Ai(),
  },
  url: false
});

export const APP = await SvelteKit(`${projectName}-app`, {
  name: `${projectName}-app`,
  bindings: {
    MY_DO,
    DITTO_JOB,
    WORKER,
    DB,
  },
  url: true,
  adopt: true,
  env: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "85000968f86b5d30510b5b73186b914c430f8e1573614a6d75ed4cc53383517a",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
  }
});

await project.finalize();
