import Logger from "../utils/logger.js";
import HumanoidService from "./humanoid.js";
import { generateWallet } from "../utils/walletGenerator.js";
import { appendPrivateKey } from "../utils/fileManager.js";
import { delay } from "../utils/delay.js";
import UserAgentManager from "../utils/userAgent.js";
import { retry } from "../utils/retry.js";

class RegistrationService {
  async registerWithReferral(referralCode) {
    return await retry(
      async () => {
        Logger.info(`Generating new wallet...`);
        const { address, privateKey, wallet } = generateWallet();

        Logger.wallet("New wallet generated", address);

        UserAgentManager.getUserAgent(address);

        const message = await HumanoidService.getMessage(address);
        const signature = await wallet.signMessage(message);

        Logger.wallet("Registering with referral code...", address);

        const result = await HumanoidService.register(
          address,
          signature,
          message,
          referralCode
        );

        if (result.success && result.token) {
          Logger.success(`Registration successful for ${address}`);
          await appendPrivateKey(privateKey);
          Logger.info(`Private key saved to private.key`);

          const token = result.token;
          await this.completeTasks(address, token);

          return { success: true, address, privateKey, token };
        }

        throw new Error("Registration failed");
      },
      3,
      3000
    );
  }

  async completeTasks(walletAddress, token) {
    try {
      Logger.wallet("Fetching tasks...", walletAddress);
      const tasks = await HumanoidService.getTasks(walletAddress, token);

      const tasksWithUrl = tasks.filter(
        (task) => task.requirements?.url && task.isActive && task.id !== "3" && task.id !== "4"
      );
      const task3 = tasks.find((task) => task.id === "3" && task.isActive);
      const task4 = tasks.find((task) => task.id === "4" && task.isActive);

      for (const task of tasksWithUrl) {
        try {
          Logger.wallet(`Completing task ${task.id}: ${task.title}`, walletAddress);
          await HumanoidService.completeTask(walletAddress, token, task.id, {
            url: task.requirements.url,
          });
          Logger.success(`Task ${task.id} completed`);
          await delay(2000);
        } catch (error) {
          Logger.warning(`Failed to complete task ${task.id}: ${error.message}`);
        }
      }

      if (task3) {
        try {
          Logger.wallet(`Completing task ${task3.id}: ${task3.title}`, walletAddress);
          await HumanoidService.completeTask(walletAddress, token, task3.id, {});
          Logger.success(`Task ${task3.id} completed`);
          await delay(2000);
        } catch (error) {
          Logger.warning(`Failed to complete task ${task3.id}: ${error.message}`);
        }
      }

      if (task4) {
        try {
          Logger.wallet(`Completing task ${task4.id}: ${task4.title}`, walletAddress);
          const tweetId = this.generateTweetId();
          await HumanoidService.completeTask(walletAddress, token, task4.id, {
            tweetId: tweetId,
          });
          Logger.success(`Task ${task4.id} completed`);
          await delay(2000);
        } catch (error) {
          Logger.warning(`Failed to complete task ${task4.id}: ${error.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Error completing tasks: ${error.message}`);
    }
  }

  generateTweetId() {
    const randomUsername = this.generateRandomUsername();
    const randomStatusId = Math.floor(Math.random() * 10000000000000);
    return `(https://twitter.com/${randomUsername}/status/${randomStatusId}`;
  }

  generateRandomUsername() {
    const adjectives = [
      "cool",
      "awesome",
      "great",
      "super",
      "mega",
      "ultra",
      "pro",
      "elite",
    ];
    const nouns = [
      "user",
      "gamer",
      "player",
      "coder",
      "dev",
      "hacker",
      "ninja",
      "master",
    ];
    const numbers = Math.floor(Math.random() * 10000);

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj}${noun}${numbers}`;
  }
}

export default new RegistrationService();

