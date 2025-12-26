import axios from "axios";
import Logger from "../utils/logger.js";

const HUGGING_FACE_API = "https://huggingface.co/api";

class HuggingFaceService {
  async getRandomModel() {
    try {
      Logger.debug("Fetching random model from Hugging Face...");
      
      const response = await axios.get(`${HUGGING_FACE_API}/models?limit=1000`);
      const models = response.data;

      if (!Array.isArray(models) || models.length === 0) {
        Logger.warning("No models found");
        return null;
      }

      const random = models[Math.floor(Math.random() * models.length)];
      const modelId = random?.modelId;

      if (modelId) {
        Logger.debug(`Selected model: ${modelId}`);
      }

      return modelId;
    } catch (error) {
      Logger.error(`Error fetching model: ${error.message}`);
      throw error;
    }
  }

  async getRandomDataset() {
    try {
      Logger.debug("Fetching random dataset from Hugging Face...");
      
      const response = await axios.get(`${HUGGING_FACE_API}/datasets?limit=100`);
      const datasets = response.data;

      if (!Array.isArray(datasets) || datasets.length === 0) {
        Logger.warning("No datasets found");
        return null;
      }

      const random = datasets[Math.floor(Math.random() * datasets.length)];
      const datasetId = random?.id;

      if (datasetId) {
        Logger.debug(`Selected dataset: ${datasetId}`);
      }

      return datasetId;
    } catch (error) {
      Logger.error(`Error fetching dataset: ${error.message}`);
      throw error;
    }
  }
}

export default new HuggingFaceService();

