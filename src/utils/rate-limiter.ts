interface RateLimitInfo {
  count: number;
  timestamp: number;
}

export class RateLimiter {
  private static limits: Map<string, RateLimitInfo> = new Map();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_REQUESTS = 30; // From API headers

  static async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimit = this.limits.get(userId) || { count: 0, timestamp: now };

    // Reset if window has passed
    if (now - userLimit.timestamp > this.WINDOW_MS) {
      userLimit.count = 0;
      userLimit.timestamp = now;
    }

    // Check if limit exceeded
    if (userLimit.count >= this.MAX_REQUESTS) {
      return false;
    }

    // Increment counter
    userLimit.count++;
    this.limits.set(userId, userLimit);
    return true;
  }

  static getRemainingRequests(userId: string): number {
    const userLimit = this.limits.get(userId);
    if (!userLimit) return this.MAX_REQUESTS;
    return Math.max(0, this.MAX_REQUESTS - userLimit.count);
  }

  static getResetTime(userId: string): number {
    const userLimit = this.limits.get(userId);
    if (!userLimit) return 0;
    return Math.max(0, this.WINDOW_MS - (Date.now() - userLimit.timestamp));
  }
} 