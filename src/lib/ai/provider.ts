import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { aiConfig, parseModel, type ModelSpec } from "./config";
import type { LanguageModel } from "ai";

/**
 * Vercel AI SDK için universal language model factory.
 * Provider'a göre doğru istemciyi döner.
 *
 * Kullanım:
 *   const model = getModel("openai:gpt-4o");
 *   const result = streamText({ model, prompt: "..." });
 */
export function getModel(spec?: string | ModelSpec): LanguageModel {
  const ms = typeof spec === "string" || !spec ? parseModel(spec) : spec;

  if (ms.provider === "openai") {
    // Custom API key ile factory
    const client = aiConfig.openaiKey
      ? createOpenAI({ apiKey: aiConfig.openaiKey })
      : openai;
    return client(ms.model);
  }

  if (ms.provider === "anthropic") {
    const client = aiConfig.anthropicKey
      ? createAnthropic({ apiKey: aiConfig.anthropicKey })
      : anthropic;
    return client(ms.model);
  }

  throw new Error(`Desteklenmeyen sağlayıcı: ${ms.provider}`);
}
