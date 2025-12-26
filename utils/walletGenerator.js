import { ethers } from "ethers";

export const generateWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    wallet: wallet,
  };
};

