import Logger from "./logger.js";
import { randomTimeBetween } from "./random.js";

export const scheduleDaily = async (callback, startHour = 0, endHour = 2) => {
  const runAndSchedule = async () => {
    try {
      await callback();
    } catch (error) {
      Logger.error(`Error in scheduled task: ${error.message}`);
    }

    const nextRun = getNextRunTime(startHour, endHour);
    const now = Date.now();
    const msUntilNext = nextRun.getTime() - now;

    const hours = Math.floor(msUntilNext / 1000 / 60 / 60);
    const minutes = Math.floor((msUntilNext / 1000 / 60) % 60);
    Logger.info(`Next run scheduled at: ${nextRun.toISOString()} (in ${hours}h ${minutes}m)`);
    
    setTimeout(() => {
      runAndSchedule();
    }, msUntilNext);
  };

  const getNextRunTime = (startHour, endHour) => {
    const now = new Date();
    const randomMinutes = randomTimeBetween(startHour, endHour);
    
    const nextRun = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      randomMinutes,
      0,
      0
    ));

    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    return nextRun;
  };

  Logger.info("Starting first run immediately...");
  runAndSchedule();
};

