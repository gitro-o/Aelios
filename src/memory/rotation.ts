// 记忆轮休: 防止同一批高分记忆每轮召回都霸座。
// 两个独立乘子, 都只动本次排序分, 不动库里的 importance/score:
//   decay   = 闸三, last_injected_at 在窗口内的打折扣 (近期已注入, 模型上下文里还热着)
//   fatigue = 过曝疲劳, recall_count 越高折扣越深 (log 缓坡, 只压常客不封杀)
// pinned 记忆由调用方自行豁免。

import type { Env } from "../types";

export function injectDecayWindowMs(env: Env): number {
  const mins = Number(env.MEMORY_INJECT_DECAY_WINDOW_MIN);
  return Number.isFinite(mins) && mins > 0 ? mins * 60 * 1000 : 240 * 60 * 1000;
}

export function injectDecayFactor(env: Env): number {
  const f = Number(env.MEMORY_INJECT_DECAY_FACTOR);
  return Number.isFinite(f) && f > 0 && f < 1 ? f : 0.35;
}

export function fatigueAlpha(env: Env): number {
  const a = Number(env.MEMORY_FATIGUE_ALPHA);
  return Number.isFinite(a) && a >= 0 ? a : 0.15;
}

export function decayForLastInjected(
  lastInjectedAt: string | null | undefined,
  windowMs: number,
  factor: number,
  now = Date.now()
): number {
  if (!lastInjectedAt) return 1;
  const ts = Date.parse(lastInjectedAt);
  if (!Number.isFinite(ts)) return 1;
  if (now - ts > windowMs) return 1;
  return factor;
}

export function fatigueForRecallCount(
  recallCount: number | null | undefined,
  alpha: number
): number {
  const rc = Number(recallCount);
  if (!Number.isFinite(rc) || rc <= 0 || alpha <= 0) return 1;
  return 1 / (1 + alpha * Math.log10(1 + rc));
}
