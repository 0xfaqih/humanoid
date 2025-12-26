import { delay } from "./delay.js";
import Logger from "./logger.js";

export const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isNetworkError = 
        error.message?.includes("socket hang up") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("network socket disconnected") ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (attempt < maxRetries && isNetworkError) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1);
        Logger.warning(`Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else if (attempt < maxRetries) {
        const waitTime = baseDelay * attempt;
        Logger.warning(`Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        Logger.error(`All ${maxRetries} attempts failed. Last error: ${error.message}`);
      }
    }
  }

  throw lastError;
};

