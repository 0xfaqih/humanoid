import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.loadProxies();
  }

  loadProxies() {
    const proxyEnv = process.env.PROXY;
    if (!proxyEnv) {
      return;
    }

    const proxyList = proxyEnv.split(",").map((p) => p.trim()).filter(Boolean);
    this.proxies = proxyList;
  }

  getProxyAgent(proxyUrl) {
    if (!proxyUrl) return null;

    try {
      if (proxyUrl.startsWith("socks5://") || proxyUrl.startsWith("socks4://")) {
        return new SocksProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith("http://") || proxyUrl.startsWith("https://")) {
        return new HttpsProxyAgent(proxyUrl);
      }
    } catch (error) {
      console.error(`Error creating proxy agent: ${error.message}`);
      return null;
    }

    return null;
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  getNextProxyAgent() {
    const proxyUrl = this.getNextProxy();
    return this.getProxyAgent(proxyUrl);
  }

  getProxyUrlForWallet(walletAddress) {
    if (this.proxies.length === 0) return null;

    const hash = this.simpleHash(walletAddress);
    const index = hash % this.proxies.length;
    return this.proxies[index];
  }

  getProxyForWallet(walletAddress) {
    const proxyUrl = this.getProxyUrlForWallet(walletAddress);
    if (!proxyUrl) return null;
    return this.getProxyAgent(proxyUrl);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export default new ProxyManager();

