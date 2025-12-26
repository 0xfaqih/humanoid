import UserAgent from "user-agents";

class UserAgentManager {
  constructor() {
    this.userAgents = new Map();
  }

  getUserAgent(walletAddress) {
    if (!this.userAgents.has(walletAddress)) {
      const userAgent = new UserAgent();
      const uaString = userAgent.toString();
      this.userAgents.set(walletAddress, uaString);
    }
    return this.userAgents.get(walletAddress);
  }

  resetUserAgent(walletAddress) {
    this.userAgents.delete(walletAddress);
  }

  resetAll() {
    this.userAgents.clear();
  }
}

export default new UserAgentManager();

