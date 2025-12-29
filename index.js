import "dotenv/config";
import Logger from "./utils/logger.js";
import WalletService from "./services/wallet.js";
import HumanoidService from "./services/humanoid.js";
import HuggingFaceService from "./services/huggingFace.js";
import RegistrationService from "./services/registration.js";
import { delay } from "./utils/delay.js";
import { question, close } from "./utils/input.js";
import { shuffleArray, randomDelay } from "./utils/random.js";
import { scheduleDaily } from "./utils/scheduler.js";
import { countdown } from "./utils/countdown.js";
import { retry } from "./utils/retry.js";

const runTasks = async () => {
  try {
    Logger.info("🚀 Starting Humanoid Bot...");

    let walletAddresses = WalletService.getWalletAddresses();
    walletAddresses = shuffleArray(walletAddresses);
    
    Logger.info(`📋 Found ${walletAddresses.length} wallet(s) to process (randomized)`);

    for (let i = 0; i < walletAddresses.length; i++) {
      const walletAddress = walletAddresses[i];
      try {
        Logger.wallet(`Processing wallet ${i + 1}/${walletAddresses.length}...`, walletAddress);

        const token = await HumanoidService.getAuthToken(walletAddress);

        let userProgress = await HumanoidService.getUserProgress(walletAddress, token);
        Logger.progress(
          `Progress: ${userProgress.total.models} models, ${userProgress.total.datasets} datasets`
        );

        while (userProgress?.daily?.models?.remaining > 0) {
          Logger.wallet(
            `Remaining models: ${userProgress.daily.models.remaining}`,
            walletAddress
          );

          let modelSubmitted = false;
          let retryCount = 0;
          const maxModelRetries = 5;

          while (!modelSubmitted && retryCount < maxModelRetries) {
            retryCount++;
            const modelId = await HuggingFaceService.getRandomModel();
            if (!modelId) {
              Logger.error("Cannot get model, skipping...");
              break;
            }

            try {
              const captcha = "";
              const model = await retry(
                async () => {
                  return await HumanoidService.submitModel(
                    walletAddress,
                    token,
                    modelId,
                    captcha
                  );
                },
                3,
                2000
              );

              if (model?.verified) {
                Logger.success(`Model ${model.fileName} submitted successfully`);
                modelSubmitted = true;
              } else {
                Logger.warning(`Model ${model?.fileName ?? "(unknown)"} submission failed`);
                modelSubmitted = true;
              }
            } catch (error) {
              if (error.message === "INVALID_URL") {
                Logger.warning(`Invalid model URL, trying another model... (${retryCount}/${maxModelRetries})`);
                await delay(1000);
                continue;
              }
              
              const isNetworkError = 
                error.message?.includes("socket hang up") ||
                error.message?.includes("ECONNRESET") ||
                error.message?.includes("ETIMEDOUT") ||
                error.message?.includes("network socket disconnected") ||
                error.message?.includes("TLS connection") ||
                error.code === "ECONNRESET" ||
                error.code === "ETIMEDOUT";

              if (isNetworkError && retryCount < maxModelRetries) {
                Logger.warning(`Network error, trying another model... (${retryCount}/${maxModelRetries})`);
                await delay(2000);
                continue;
              }

              throw error;
            }
          }

          if (!modelSubmitted) {
            Logger.error("Failed to submit model after multiple attempts with different models");
            break;
          }

          await delay(2000);
          try {
            userProgress = await HumanoidService.getUserProgress(walletAddress, token);
          } catch (error) {
            if (error?.response?.status === 400) {
              Logger.warning(`Failed to get progress after model submission: ${error?.response?.data?.error || error.message}`);
              Logger.warning("Continuing to next wallet...");
              break;
            }
            throw error;
          }
        }

        while (userProgress?.daily?.datasets?.remaining > 0) {
          Logger.wallet(
            `Remaining datasets: ${userProgress.daily.datasets.remaining}`,
            walletAddress
          );

          let datasetSubmitted = false;
          let retryCount = 0;
          const maxDatasetRetries = 5;

          while (!datasetSubmitted && retryCount < maxDatasetRetries) {
            retryCount++;
            const datasetId = await HuggingFaceService.getRandomDataset();
            if (!datasetId) {
              Logger.error("Cannot get dataset, skipping...");
              break;
            }

            try {
              const captcha = "";
              const dataset = await retry(
                async () => {
                  return await HumanoidService.submitDataset(
                    walletAddress,
                    token,
                    datasetId,
                    captcha
                  );
                },
                3,
                2000
              );

              if (dataset?.verified) {
                Logger.success(`Dataset ${dataset.fileName} submitted successfully`);
                datasetSubmitted = true;
              } else {
                Logger.warning(`Dataset ${dataset?.fileName ?? "(unknown)"} submission failed`);
                datasetSubmitted = true;
              }
            } catch (error) {
              if (error.message === "INVALID_URL") {
                Logger.warning(`Invalid dataset URL, trying another dataset... (${retryCount}/${maxDatasetRetries})`);
                await delay(1000);
                continue;
              }
              
              const isNetworkError = 
                error.message?.includes("socket hang up") ||
                error.message?.includes("ECONNRESET") ||
                error.message?.includes("ETIMEDOUT") ||
                error.message?.includes("network socket disconnected") ||
                error.message?.includes("TLS connection") ||
                error.code === "ECONNRESET" ||
                error.code === "ETIMEDOUT";

              if (isNetworkError && retryCount < maxDatasetRetries) {
                Logger.warning(`Network error, trying another dataset... (${retryCount}/${maxDatasetRetries})`);
                await delay(2000);
                continue;
              }

              throw error;
            }
          }

          if (!datasetSubmitted) {
            Logger.error("Failed to submit dataset after multiple attempts with different datasets");
            break;
          }

          await delay(2000);
          try {
            userProgress = await HumanoidService.getUserProgress(walletAddress, token);
          } catch (error) {
            if (error?.response?.status === 400) {
              Logger.warning(`Failed to get progress after dataset submission: ${error?.response?.data?.error || error.message}`);
              Logger.warning("Continuing to next wallet...");
              break;
            }
            throw error;
          }
        }

        if (userProgress) {
          if (
            userProgress?.daily?.models?.remaining === 0 &&
            userProgress?.daily?.datasets?.remaining === 0
          ) {
            Logger.wallet("Daily quota fulfilled", walletAddress);
          }
        }

        if (i < walletAddresses.length - 1) {
          const waitSeconds = Math.floor(randomDelay(30, 600) / 1000);
          await countdown(waitSeconds);
        }
      } catch (error) {
        const errorDetails = error?.response?.data?.error || error?.response?.data?.message || error.message;
        const statusCode = error?.response?.status;
        
        if (statusCode === 400) {
          Logger.warning(`Error 400 processing wallet ${walletAddress}: ${errorDetails}`);
        } else {
          Logger.error(`Error processing wallet ${walletAddress}: ${errorDetails}`);
        }
        continue;
      }
    }

    Logger.success("✅ All wallets processed");
  } catch (error) {
    Logger.error(`Fatal error: ${error.message}`);
    throw error;
  }
};

const registerAccounts = async (count, referralCode) => {
  try {
    Logger.info(`🚀 Starting registration for ${count} account(s)...`);

    for (let i = 1; i <= count; i++) {
      try {
        Logger.info(`\n📝 Registering account ${i}/${count}...`);

        const result = await RegistrationService.registerWithReferral(referralCode);
        
        if (result.success) {
          Logger.success(`Account ${i} registered successfully: ${result.address}`);
        }

        if (i < count) {
          Logger.info("Waiting before next registration...");
          await delay(5000);
        }
      } catch (error) {
        Logger.error(`Failed to register account ${i}: ${error.message}`);
        continue;
      }
    }

    Logger.success(`✅ Registration completed for ${count} account(s)`);
  } catch (error) {
    Logger.error(`Fatal error during registration: ${error.message}`);
    process.exit(1);
  }
};

const main = async () => {
  try {
    Logger.info("🤖 Humanoid Bot");
    Logger.info("================\n");

    Logger.info("Select mode:");
    Logger.info("1. Run tasks (submit models/datasets)");
    Logger.info("2. Register with referral code\n");

    const mode = await question("Enter choice (1 or 2): ");

    if (mode === "2") {
      const accountCount = await question("How many accounts to create? (default: 1): ");
      const count = parseInt(accountCount) || 1;

      const referralCode = await question("Enter referral code: ");
      if (!referralCode.trim()) {
        Logger.error("Referral code is required");
        close();
        process.exit(1);
      }
      await registerAccounts(count, referralCode.trim());
      close();
    } else if (mode === "1") {
      Logger.info("\n🔄 Running in daily schedule mode (00:00-02:00 UTC)");
      Logger.info("Bot will run daily and repeat after all wallets are processed\n");
      
      close();
      
      scheduleDaily(async () => {
        await runTasks();
      }, 0, 2);
      
      Logger.info("Bot is running in the background. Press Ctrl+C to stop.\n");
    } else {
      Logger.error("Invalid choice");
      close();
      process.exit(1);
    }
  } catch (error) {
    Logger.error(`Fatal error: ${error.message}`);
    close();
    process.exit(1);
  }
};

main();
