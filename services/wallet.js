import { ethers } from "ethers";
import Logger from "../utils/logger.js";

class WalletService {
  constructor() {
    this.wallets = null;
    this.provider = null;
    this.initialize();
  }

  initialize() {
    const rpcUrl = process.env.RPC_URL;
    this.provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
    this.loadWallets();
  }

  loadWallets(envName = "PRIVATE_KEY") {
    const raw = process.env[envName];
    if (!raw) {
      throw new Error(
        `ENV ${envName} is not set. Example: ${envName}=pv1,pv2`
      );
    }

    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      throw new Error(`ENV ${envName} is empty after parsing`);
    }

    this.wallets = keys.map((pk) => 
      new ethers.Wallet(pk, this.provider ?? undefined)
    );

    Logger.info(`Loaded ${this.wallets.length} wallet(s)`);
  }

  getWalletAddresses() {
    if (!this.wallets) {
      this.loadWallets();
    }
    return this.wallets.map((w) => w.address);
  }

  getWalletByAddress(walletAddress) {
    if (!this.wallets) {
      this.loadWallets();
    }

    const target = String(walletAddress).toLowerCase();
    const wallet = this.wallets.find(
      (w) => w.address.toLowerCase() === target
    );

    if (!wallet) {
      throw new Error(`Wallet not found for address: ${walletAddress}`);
    }

    return wallet;
  }

  async signMessage(walletAddress, message) {
    const wallet = this.getWalletByAddress(walletAddress);
    return await wallet.signMessage(String(message));
  }
}

export default new WalletService();

