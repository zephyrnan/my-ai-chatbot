import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export function shouldUseSecureCookies(requestUrl: string) {
  return new URL(requestUrl).protocol === "https:";
}

export const guestRegex = /^guest-[a-z0-9-]+$/i;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "Break this product idea into an execution plan",
  "Read this error and explain the root cause",
  "Summarize this project as a resume-ready experience",
  "Turn this rough idea into a clearer product spec",
];
