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

          const modelId = await HuggingFaceService.getRandomModel();
          if (!modelId) {
            Logger.error("Cannot get model, skipping...");
            break;
          }

          const captcha = "";
          const model = await HumanoidService.submitModel(
            walletAddress,
            token,
            modelId,
            captcha
          );

          if (model?.verified) {
            Logger.success(`Model ${model.fileName} submitted successfully`);
          } else {
            Logger.warning(`Model ${model?.fileName ?? "(unknown)"} submission failed`);
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

          const datasetId = await HuggingFaceService.getRandomDataset();
          if (!datasetId) {
            Logger.error("Cannot get dataset, skipping...");
            break;
          }

          const captcha = "";
          const dataset = await HumanoidService.submitDataset(
            walletAddress,
            token,
            datasetId,
            captcha
          );

          if (dataset?.verified) {
            Logger.success(`Dataset ${dataset.fileName} submitted successfully`);
          } else {
            Logger.warning(`Dataset ${dataset?.fileName ?? "(unknown)"} submission failed`);
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
      
      scheduleDaily(async () => {
        await runTasks();
      }, 0, 2);
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
