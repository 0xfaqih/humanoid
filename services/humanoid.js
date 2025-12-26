import axios from "axios";
import Logger from "../utils/logger.js";
import ProxyManager from "../utils/proxy.js";
import UserAgentManager from "../utils/userAgent.js";
import WalletService from "./wallet.js";
import { retry } from "../utils/retry.js";

const HUMANOID_API_BASE = "https://app.humanoidnetwork.org/api";

class HumanoidService {
  constructor() {
    this.instances = new Map();
  }

  getAxiosConfig(walletAddress) {
    const proxyUrl = ProxyManager.getProxyUrlForWallet(walletAddress);
    const userAgent = UserAgentManager.getUserAgent(walletAddress);

    const config = {
      headers: {
        "User-Agent": userAgent,
      },
    };

    if (proxyUrl) {
      const proxyAgent = ProxyManager.getProxyAgent(proxyUrl);
      if (proxyAgent) {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
        Logger.debug(`Using proxy for wallet ${walletAddress.slice(0, 6)}...`);
      }
    }

    return config;
  }

  getAxiosInstance(walletAddress) {
    if (this.instances.has(walletAddress)) {
      return this.instances.get(walletAddress);
    }

    const config = this.getAxiosConfig(walletAddress);
    const instance = axios.create(config);
    this.instances.set(walletAddress, instance);

    return instance;
  }

  async makeRequest(walletAddress, method, url, data = null, headers = {}) {
    const config = this.getAxiosConfig(walletAddress);
    const instance = axios.create(config);

    const requestConfig = {
      method,
      url,
      headers: { ...config.headers, ...headers },
    };

    if (data) {
      requestConfig.data = data;
    }

    return await instance.request(requestConfig);
  }

  async getMessage(walletAddress) {
    return await retry(
      async () => {
        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/auth/nonce`,
          { walletAddress: walletAddress }
        );
        return response.data.message;
      },
      3,
      2000
    );
  }

  async getAuthToken(walletAddress) {
    return await retry(
      async () => {
        Logger.wallet("Authenticating wallet...", walletAddress);

        const message = await this.getMessage(walletAddress);
        const signature = await WalletService.signMessage(walletAddress, message);

        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/auth/authenticate`,
          {
            walletAddress: walletAddress,
            signature: signature,
            message: message,
          }
        );

        Logger.wallet("Authentication successful", walletAddress);
        return response.data.token;
      },
      3,
      2000
    );
  }

  async getUserProgress(walletAddress, token) {
    return await retry(
      async () => {
        try {
          const response = await this.makeRequest(
            walletAddress,
            "GET",
            `${HUMANOID_API_BASE}/training/progress`,
            null,
            {
              Authorization: `Bearer ${token}`,
            }
          );
          return response.data;
        } catch (error) {
          if (error?.response?.status === 400) {
            const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error.message;
            Logger.warning(`getUserProgress 400 error: ${errorMsg}`);
            throw error;
          }
          throw error;
        }
      },
      3,
      2000
    );
  }

  async submitModel(walletAddress, token, modelId, captcha, maxRetry = 5) {
    let attempt = 0;
    const fileUrl = `https://huggingface.co/${modelId}`;

    while (attempt < maxRetry) {
      attempt++;

      try {
        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/training`,
          {
            fileName: modelId,
            fileUrl: fileUrl,
            fileType: "model",
            recaptchaToken: captcha,
          },
          {
            Authorization: `Bearer ${token}`,
          }
        );

        return response.data;
      } catch (err) {
        const errorMessage = err?.response?.data?.error || err?.response?.data?.message;
        const status = err?.response?.status;

        if (status === 400 && errorMessage === "You have already submitted this URL") {
          Logger.warning(
            `Model already submitted, retrying (${attempt}/${maxRetry})...`
          );
          continue;
        }

        if (status === 400) {
          Logger.warning(`Submit model 400 error: ${errorMessage || err.message}`);
          Logger.warning(`URL sent: ${fileUrl}`);
          if (attempt < maxRetry) {
            continue;
          }
        }

        throw err;
      }
    }

    throw new Error("Failed to submit model after multiple attempts");
  }

  async submitDataset(walletAddress, token, datasetId, captcha, maxRetry = 5) {
    let attempt = 0;
    const fileUrl = `https://huggingface.co/datasets/${datasetId}`;

    while (attempt < maxRetry) {
      attempt++;

      try {
        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/training`,
          {
            fileName: `${datasetId}`,
            fileUrl: fileUrl,
            fileType: "dataset",
            recaptchaToken: captcha,
          },
          {
            Authorization: `Bearer ${token}`,
          }
        );

        return response.data;
      } catch (err) {
        const errorMessage = err?.response?.data?.error || err?.response?.data?.message;
        const status = err?.response?.status;

        if (status === 400 && errorMessage === "You have already submitted this URL") {
          Logger.warning(
            `Dataset already submitted, retrying (${attempt}/${maxRetry})...`
          );
          continue;
        }

        if (status === 400) {
          Logger.warning(`Submit dataset 400 error: ${errorMessage || err.message}`);
          Logger.warning(`URL sent: ${fileUrl}`);
          if (attempt < maxRetry) {
            continue;
          }
        }

        throw err;
      }
    }

    throw new Error("Failed to submit dataset after multiple attempts");
  }

  async register(walletAddress, signature, message, referralCode) {
    return await retry(
      async () => {
        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/auth/authenticate`,
          {
            walletAddress: walletAddress,
            signature: signature,
            message: message,
            referralCode: referralCode,
          }
        );
        return response.data;
      },
      3,
      2000
    );
  }

  async getTasks(walletAddress, token) {
    return await retry(
      async () => {
        const response = await this.makeRequest(
          walletAddress,
          "GET",
          `${HUMANOID_API_BASE}/tasks`,
          null,
          {
            Authorization: `Bearer ${token}`,
          }
        );
        return response.data;
      },
      3,
      2000
    );
  }

  async completeTask(walletAddress, token, taskId, data) {
    return await retry(
      async () => {
        const response = await this.makeRequest(
          walletAddress,
          "POST",
          `${HUMANOID_API_BASE}/tasks`,
          {
            taskId: taskId,
            data: data,
          },
          {
            Authorization: `Bearer ${token}`,
          }
        );
        return response.data;
      },
      3,
      2000
    );
  }
}

export default new HumanoidService();

