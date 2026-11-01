const fs = require('fs');

// 1. Update ApiSettingsModal.tsx
let modalCode = fs.readFileSync('src/components/ApiSettingsModal.tsx', 'utf8');
if (!modalCode.includes('CONFIGURED_GEMINI_MODEL')) {
  modalCode = modalCode.replace(
    "import {\r\n  getStoredApiKey,\r\n  setStoredApiKey,\r\n  removeStoredApiKey,\r\n  getMaskedKey,\r\n  testGeminiApiKey\r\n} from '../services/geminiClient';",
    "import {\r\n  getStoredApiKey,\r\n  setStoredApiKey,\r\n  removeStoredApiKey,\r\n  getMaskedKey,\r\n  testGeminiApiKey,\r\n  CONFIGURED_GEMINI_MODEL\r\n} from '../services/geminiClient';"
  );
  modalCode = modalCode.replace(
    "import {\n  getStoredApiKey,\n  setStoredApiKey,\n  removeStoredApiKey,\n  getMaskedKey,\n  testGeminiApiKey\n} from '../services/geminiClient';",
    "import {\n  getStoredApiKey,\n  setStoredApiKey,\n  removeStoredApiKey,\n  getMaskedKey,\n  testGeminiApiKey,\n  CONFIGURED_GEMINI_MODEL\n} from '../services/geminiClient';"
  );
}
modalCode = modalCode.replaceAll("'gemini-2.5-flash'", "CONFIGURED_GEMINI_MODEL");
modalCode = modalCode.replaceAll("gemini-2.5-flash", "gemini-3.5-flash-lite");
fs.writeFileSync('src/components/ApiSettingsModal.tsx', modalCode, 'utf8');

// 2. Update App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes('CONFIGURED_GEMINI_MODEL')) {
  appCode = appCode.replace(
    "import { getStoredApiKey, getMaskedKey, analyzePhotoWithGeminiClient } from './services/geminiClient';",
    "import { getStoredApiKey, getMaskedKey, analyzePhotoWithGeminiClient, CONFIGURED_GEMINI_MODEL } from './services/geminiClient';"
  );
}
appCode = appCode.replaceAll("'gemini-2.5-flash'", "CONFIGURED_GEMINI_MODEL");
appCode = appCode.replaceAll("gemini-2.5-flash", "gemini-3.5-flash-lite");
fs.writeFileSync('src/App.tsx', appCode, 'utf8');

console.log('Model names updated to gemini-3.5-flash-lite successfully!');
