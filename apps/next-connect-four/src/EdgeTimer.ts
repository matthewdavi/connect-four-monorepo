export class EdgeTimer {
  private static timers = new Map<string, number>();
  private static fetchStartTime: number | null = null;

  static async timeStart(label: string): Promise<void> {
    const startTime = Date.now();
    this.fetchStartTime = startTime;

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    try {
      await fetch(`${baseUrl}/api/time?time=${startTime}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (error) {
      console.error("Error in EdgeTimer.timeStart:", error);
    }

    const fetchEndTime = Date.now();
    const fetchDuration = fetchEndTime - startTime;
    this.timers.set(label, startTime + fetchDuration);
  }

  static async timeEnd(label: string): Promise<number> {
    const endTime = Date.now();
    const startTime = this.timers.get(label);

    if (startTime === undefined) {
      console.warn(`Timer "${label}" does not exist.`);
      return 0;
    }

    const duration = endTime - startTime;
    this.timers.delete(label);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    try {
      await fetch(`${baseUrl}/api/time?time=${endTime}&duration=${duration}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (error) {
      console.error("Error in EdgeTimer.timeEnd:", error);
    }

    return duration;
  }
}
