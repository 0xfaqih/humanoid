import fs from "fs/promises";
import path from "path";

const PRIVATE_KEY_FILE = "private.key";

export const readPrivateKeys = async () => {
  try {
    const content = await fs.readFile(PRIVATE_KEY_FILE, "utf-8");
    return content.trim();
  } catch (error) {
    return "";
  }
};

export const appendPrivateKey = async (privateKey) => {
  try {
    const existing = await readPrivateKeys();
    const newContent = existing ? `${existing},${privateKey}` : privateKey;
    await fs.writeFile(PRIVATE_KEY_FILE, newContent, "utf-8");
    return true;
  } catch (error) {
    throw new Error(`Failed to save private key: ${error.message}`);
  }
};

