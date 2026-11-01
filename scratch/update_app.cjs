const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
const importTarget = "import { generatePhotographicAnalysis } from './services/photoHeuristics';";
const importReplacement = "import { generatePhotographicAnalysis } from './services/photoHeuristics';\r\nimport { getStoredApiKey, getMaskedKey, analyzePhotoWithGeminiClient } from './services/geminiClient';";
code = code.replace(importTarget, importReplacement);

// 2. Update initial mount useEffect
const oldEffectIndex = code.indexOf("// Load API status on initial mount");
const oldEffectEnd = code.indexOf("const imagePreviewUrlRef = useRef<string | null>(null);");

if (oldEffectIndex !== -1 && oldEffectEnd !== -1) {
  const newEffect = `// Load API status on initial mount
  useEffect(() => {
    const clientKey = getStoredApiKey();

    fetch('/api/status', { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.hasApiKey) {
          setApiStatus(data);
        } else if (clientKey) {
          setApiStatus({
            status: 'connected',
            statusMessage: 'API Terhubung (Client BYOK)',
            hasApiKey: true,
            maskedKey: getMaskedKey(clientKey),
            provider: 'Google Gemini',
            model: 'gemini-2.5-flash',
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        } else {
          setApiStatus({
            status: 'not_configured',
            statusMessage: 'API Belum Dikonfigurasi (Klik untuk memasang Gemini API Key)',
            hasApiKey: false,
            provider: 'Google Gemini',
            model: 'gemini-2.5-flash',
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        }
      })
      .catch(() => {
        if (clientKey) {
          setApiStatus({
            status: 'connected',
            statusMessage: 'API Terhubung (Client BYOK)',
            hasApiKey: true,
            maskedKey: getMaskedKey(clientKey),
            provider: 'Google Gemini',
            model: 'gemini-2.5-flash',
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        } else {
          setApiStatus({
            status: 'not_configured',
            statusMessage: 'API Belum Dikonfigurasi (Klik untuk memasang Gemini API Key)',
            hasApiKey: false,
            provider: 'Google Gemini',
            model: 'gemini-2.5-flash',
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        }
      });
  }, []);

  `;

  code = code.slice(0, oldEffectIndex) + newEffect + code.slice(oldEffectEnd);
}

// 3. Update executeAnalysis
const oldExecuteStart = code.indexOf("let data: PhotoAnalysisResult;");
const oldExecuteEnd = code.indexOf("setAnalysisResult(data);");

if (oldExecuteStart !== -1 && oldExecuteEnd !== -1) {
  const newExecute = `let data: PhotoAnalysisResult | null = null;

      try {
        const response = await fetch('/api/analyze-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error('BACKEND_UNAVAILABLE');
        }
      } catch (networkErr: any) {
        if (networkErr.name === 'AbortError') {
          console.log('Analisis foto dibatalkan.');
          return;
        }
        // If backend proxy is unavailable (e.g. GitHub Pages or Android APK)
        const clientKey = getStoredApiKey();
        if (clientKey) {
          try {
            console.log('Menggunakan Google Gemini API langsung dari client...');
            data = await analyzePhotoWithGeminiClient({
              imageBase64: base64Data,
              mimeType: file.type || 'image/jpeg',
              fileName: file.name,
              fileSize: file.size,
              width: dims?.width,
              height: dims?.height,
              sha256Hash: hash,
              customInstructions: activeInstructions,
              useCustomInstructions: true,
              apiKey: clientKey,
              signal: controller.signal
            });
          } catch (geminiErr: any) {
            if (geminiErr.name === 'AbortError') {
              console.log('Analisis foto dibatalkan.');
              return;
            }
            console.warn('Gemini client call gagal, beralih ke Mesin Kalibrasi Fotografi Camera Raw:', geminiErr);
          }
        }

        // Fallback to local Camera Raw Calibration Engine if data is still null
        if (!data) {
          data = generatePhotographicAnalysis({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'image/jpeg',
            width: dims?.width,
            height: dims?.height,
            sha256Hash: hash,
            rawBase64: base64Data,
            reasonForFallback: clientKey
              ? 'Analisis dialihkan ke Engine Kalibrasi Fotografi Camera Raw (Kendala kuota/jaringan Gemini API).'
              : 'Analisis diselesaikan menggunakan Engine Kalibrasi Fotografi Camera Raw (Mode Standalone/Web/APK).',
            customInstructions: activeInstructions,
            useCustomInstructions: true
          });
        }
      }

      `;

  code = code.slice(0, oldExecuteStart) + newExecute + code.slice(oldExecuteEnd);
}

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log('Successfully updated src/App.tsx!');
