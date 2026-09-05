import { Inject, Injectable } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../../redis/redis.constants";

/**
 * Throttle storage berbasis Redis (OWASP A07): limit berlaku lintas replika API.
 * Fixed-window per (throttler, tracker-key). Redis down → fail-open + log
 * (ketersediaan didahulukan; abuse masih dibatasi max-unpaid/duplikat di service).
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:blocked`;
    try {
      if (blockDuration > 0 && (await this.redis.exists(blockKey))) {
        const bttl = await this.redis.pttl(blockKey);
        return { totalHits: limit + 1, timeToExpire: 0, isBlocked: true, timeToBlockExpire: Math.max(0, Math.ceil(bttl / 1000)) };
      }
      const res = (await this.redis.multi().incr(hitsKey).pttl(hitsKey).exec()) as unknown as
        [[Error | null, number], [Error | null, number]];
      const totalHits = res[0][1];
      const pttl = res[1][1];
      if (pttl < 0) await this.redis.pexpire(hitsKey, ttl);
      const timeToExpire = Math.max(0, Math.ceil((pttl < 0 ? ttl : pttl) / 1000));
      if (totalHits > limit) {
        if (blockDuration > 0) {
          await this.redis.set(blockKey, "1", "PX", blockDuration);
          return { totalHits, timeToExpire, isBlocked: true, timeToBlockExpire: Math.ceil(blockDuration / 1000) };
        }
        return { totalHits, timeToExpire, isBlocked: true, timeToBlockExpire: 0 };
      }
      return { totalHits, timeToExpire, isBlocked: false, timeToBlockExpire: 0 };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[throttle] redis unavailable, fail-open:", (err as Error).message);
      return { totalHits: 0, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
