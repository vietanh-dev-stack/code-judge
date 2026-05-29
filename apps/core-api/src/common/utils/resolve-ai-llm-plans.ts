import type { ConfigService } from '@nestjs/config';
import { EnvKeys } from '../config/env.keys';
import {
  type AiLlmProvider,
  resolveAiDefaultModel,
  resolveAiDefaultProvider,
} from './resolve-ai-provider';

export type AiLlmPlan = { provider: AiLlmProvider; model: string };

/** Mặc định khi không set AI_FALLBACK_MODELS_GOOGLE — ưu tiên model còn RPD cao trên free tier. */
const DEFAULT_GOOGLE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
] as const;

/**
 * Chuỗi model Google: primary trước, rồi AI_FALLBACK_MODELS_GOOGLE (phẩy), dedupe.
 */
export function resolveGoogleModelFallbackChain(
  config: ConfigService,
  primaryModel: string,
): string[] {
  const configured = config.get<string>(EnvKeys.AI_FALLBACK_MODELS_GOOGLE)?.trim();
  const extras = configured
    ? configured
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [...DEFAULT_GOOGLE_MODEL_FALLBACKS];

  const chain: string[] = [];
  for (const name of [primaryModel, ...extras]) {
    if (!chain.includes(name)) {
      chain.push(name);
    }
  }
  return chain;
}

function dedupePlans(plans: AiLlmPlan[]): AiLlmPlan[] {
  const seen = new Set<string>();
  const out: AiLlmPlan[] = [];
  for (const plan of plans) {
    const key = `${plan.provider}:${plan.model}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(plan);
  }
  return out;
}

/**
 * Thứ tự gọi LLM: (cùng provider) thử lần lượt các model Google → (tuỳ chọn) đổi sang OpenAI/Google kia.
 */
export function buildAiLlmPlans(
  config: ConfigService,
  options: {
    provider?: AiLlmProvider;
    model?: string;
    /** Chỉ thử các model Google / một model OpenAI — không nhảy sang provider kia (fast mode). */
    sameProviderOnly?: boolean;
  } = {},
): AiLlmPlan[] {
  const primaryProvider = options.provider ?? resolveAiDefaultProvider(config);
  const primaryModel = options.model ?? resolveAiDefaultModel(config, primaryProvider);
  const plans: AiLlmPlan[] = [];

  if (primaryProvider === 'google') {
    for (const model of resolveGoogleModelFallbackChain(config, primaryModel)) {
      plans.push({ provider: 'google', model });
    }
  } else {
    plans.push({ provider: 'openai', model: primaryModel });
  }

  if (!options.sameProviderOnly) {
    const altProvider: AiLlmProvider = primaryProvider === 'google' ? 'openai' : 'google';
    const altKey = config.get<string>(
      altProvider === 'google' ? EnvKeys.GOOGLE_GENERATIVE_AI_API_KEY : EnvKeys.OPENAI_API_KEY,
    );
    if (altKey?.trim()) {
      plans.push({
        provider: altProvider,
        model: resolveAiDefaultModel(config, altProvider),
      });
    }
  }

  return dedupePlans(plans);
}

/** 429 / quota / RESOURCE_EXHAUSTED — nên thử model hoặc provider khác, không chỉ retry cùng model. */
export function isAiQuotaOrRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /(429|RESOURCE_EXHAUSTED|quota|rate.?limit|too many requests|exceeded)/i.test(
    error.message,
  );
}
