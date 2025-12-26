import chalk from "chalk";

class Logger {
  static info(message, ...args) {
    console.log(chalk.blue("ℹ"), chalk.blue(message), ...args);
  }

  static success(message, ...args) {
    console.log(chalk.green("✓"), chalk.green(message), ...args);
  }

  static error(message, ...args) {
    console.error(chalk.red("✗"), chalk.red(message), ...args);
  }

  static warning(message, ...args) {
    console.log(chalk.yellow("⚠"), chalk.yellow(message), ...args);
  }

  static debug(message, ...args) {
    if (process.env.DEBUG === "true") {
      console.log(chalk.gray("🔍"), chalk.gray(message), ...args);
    }
  }

  static wallet(message, walletAddress, ...args) {
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    console.log(chalk.cyan("👛"), chalk.cyan(`[${shortAddress}]`), message, ...args);
  }

  static progress(message, ...args) {
    console.log(chalk.magenta("📊"), chalk.magenta(message), ...args);
  }
}

export default Logger;

