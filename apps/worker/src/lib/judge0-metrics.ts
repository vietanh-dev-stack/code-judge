export type Judge0ResultMetrics = {
  time?: string | number | null;
  wall_time?: string | number | null;
  memory?: number | string | null;
  created_at?: string | null;
  finished_at?: string | null;
};

/** Convert Judge0 response fields to runtime in milliseconds. */
export function parseJudge0RuntimeMs(
  result: Judge0ResultMetrics,
  cpuTimeLimitSec?: number,
): number {
  const wallSec = parseFloat(String(result.wall_time ?? ''));
  if (Number.isFinite(wallSec) && wallSec > 0) {
    return Math.max(1, Math.round(wallSec * 1000));
  }

  if (result.created_at && result.finished_at) {
    const elapsedMs =
      new Date(result.finished_at).getTime() - new Date(result.created_at).getTime();
    if (Number.isFinite(elapsedMs) && elapsedMs > 0) {
      return Math.max(1, elapsedMs);
    }
  }

  const cpuSec = parseFloat(String(result.time ?? '0'));
  if (!Number.isFinite(cpuSec) || cpuSec <= 0) {
    return 0;
  }

  // Some dev setups (isolate stub / no cgroups) report cpu_time_limit as `time`.
  if (
    cpuTimeLimitSec != null &&
    Math.abs(cpuSec - cpuTimeLimitSec) < 0.001 &&
    result.created_at &&
    result.finished_at
  ) {
    const elapsedMs =
      new Date(result.finished_at).getTime() - new Date(result.created_at).getTime();
    if (elapsedMs > 0 && elapsedMs < cpuSec * 1000) {
      return Math.max(1, elapsedMs);
    }
  }

  return Math.max(1, Math.round(cpuSec * 1000));
}

/** Convert Judge0 memory (kilobytes) to megabytes for storage/display. */
export function parseJudge0MemoryMb(result: Pick<Judge0ResultMetrics, 'memory'>): number {
  const memoryKb = Number(result.memory ?? 0);
  if (!Number.isFinite(memoryKb) || memoryKb <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(memoryKb / 1024));
}
