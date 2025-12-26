import readline from "readline";

export const countdown = async (seconds) => {
  return new Promise((resolve) => {
    let remaining = seconds;

    const updateCountdown = () => {
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        process.stdout.write(`⏳ Waiting ${timeString} before next wallet...`);

        remaining--;
        setTimeout(updateCountdown, 1000);
      } else {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        process.stdout.write("\n");
        resolve();
      }
    };

    updateCountdown();
  });
};

