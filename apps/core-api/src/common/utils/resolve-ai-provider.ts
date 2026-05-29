import type { ConfigService } from '@nestjs/config';
import { EnvKeys } from '../config/env.keys';

export type AiLlmProvider = 'openai' | 'google';

/**
 * Chuẩn hóa AI_DEFAULT_PROVIDER.
 * Chấp nhận `google` hoặc alias `gemini`; giá trị khác → openai.
 * Khi biến trống: ưu tiên google nếu chỉ có GOOGLE_GENERATIVE_AI_API_KEY.
 */
export function resolveAiDefaultProvider(config: ConfigService): AiLlmProvider {
  const configured = (config.get<string>(EnvKeys.AI_DEFAULT_PROVIDER) ?? '').trim().toLowerCase();
  if (configured === 'google' || configured === 'gemini') {
    return 'google';
  }
  if (configured === 'openai') {
    return 'openai';
  }

  const hasGoogle = Boolean(config.get<string>(EnvKeys.GOOGLE_GENERATIVE_AI_API_KEY)?.trim());
  const hasOpenai = Boolean(config.get<string>(EnvKeys.OPENAI_API_KEY)?.trim());
  if (hasGoogle && !hasOpenai) {
    return 'google';
  }

  return 'openai';
}

export function resolveAiDefaultModel(config: ConfigService, provider: AiLlmProvider): string {
  if (provider === 'google') {
    return config.get<string>(EnvKeys.AI_DEFAULT_MODEL_GOOGLE) ?? 'gemini-2.5-flash';
  }
  return config.get<string>(EnvKeys.AI_DEFAULT_MODEL_OPENAI) ?? 'gpt-4.1-mini';
}
