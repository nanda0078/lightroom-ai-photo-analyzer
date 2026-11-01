const { validateAndNormalizeGeminiResult } = require('../src/services/geminiValidator.ts');

console.log('================================================================');
console.log('  RUNNING QA SUITE: HIGHLIGHT CLIPPING DETECTION & RECOVERY');
console.log('================================================================\n');

const testCases = [
  {
    name: 'Kasus 1: Dinding Putih Studio (Natural White - Tekstur Terjaga)',
    raw: {
      overallQuality: 'Baik',
      technicalSummary: 'Latar studio putih dengan pencahayaan terkontrol merata, tekstur dinding terlihat jelas.',
      highlightClippingAssessment: {
        status: 'Tidak mengalami clipping',
        severityLevel: 'Normal',
        affectedAreas: ['Dinding Latar Belakang Putih'],
        estimatedClippingPercentage: 0.3,
        isNaturalWhiteProtected: true,
        recoveryAssessment: 'Detail masih tersedia dan berpotensi dipulihkan',
        rootCauseAnalysis: 'Warna putih alami pada dinding studio memiliki rentang tonal sehat dan bukan overexposure.',
        recommendedHighlights: -5,
        recommendedWhites: 0,
        permanentDataLossWarning: false
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: 0.05, status: 'NORMAL' },
          highlights: { recommendedValue: -5, status: 'NORMAL' },
          whites: { recommendedValue: 0, status: 'NORMAL' },
          shadows: { recommendedValue: 10, status: 'NORMAL' }
        }
      }
    },
    validate: (res) => {
      if (!res.highlightClippingAssessment.isNaturalWhiteProtected) throw new Error('isNaturalWhiteProtected must be true');
      if (res.highlightClippingAssessment.permanentDataLossWarning) throw new Error('Should not have data loss warning');
      if (res.adjustments.light.exposure.recommendedValue < 0) throw new Error('Exposure must not be lowered for natural white wall');
      return 'Natural white protected, zero false clipping detected.';
    }
  },
  {
    name: 'Kasus 2: Wajah Subjek Mengalami Overexposure (Flash Silau)',
    raw: {
      overallQuality: 'Cukup',
      technicalSummary: 'Sorotan blitz keras menyebabkan hilangnya sebagian gradasi pada dahi dan pipi subjek.',
      highlightClippingAssessment: {
        status: 'Clipping sedang',
        severityLevel: 'Sedang',
        affectedAreas: ['Dahi dan Pipi Subjek'],
        estimatedClippingPercentage: 4.8,
        isNaturalWhiteProtected: true,
        recoveryAssessment: 'Detail sebagian tersedia',
        rootCauseAnalysis: 'Pantulan blitz langsung pada jarak dekat memotong kurva sorotan midtone kulit.',
        recommendedHighlights: -35,
        recommendedWhites: -20,
        recommendedLocalMasking: 'Gunakan radial mask lembut di area wajah untuk mereduksi sorotan tanpa menggelapkan mata',
        permanentDataLossWarning: false
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: -0.15, status: 'TOO_HIGH' },
          highlights: { recommendedValue: -35, status: 'TOO_HIGH' },
          whites: { recommendedValue: -20, status: 'TOO_HIGH' },
          shadows: { recommendedValue: 15, status: 'TOO_LOW' }
        }
      }
    },
    validate: (res) => {
      if (res.highlightClippingAssessment.recommendedHighlights > -25) throw new Error('Highlights must be lowered significantly');
      if (!res.highlightClippingAssessment.affectedAreas.some(a => a.includes('Wajah') || a.includes('Dahi'))) throw new Error('Affected area must pinpoint face');
      return 'Facial highlights tamed (-35) with local radial mask advice.';
    }
  },
  {
    name: 'Kasus 3: Jendela Latar Sangat Terang (Sky / Window Blown Highlight)',
    raw: {
      overallQuality: 'Cukup',
      technicalSummary: 'Subjek di dalam ruangan dengan jendela latar belakang tembus cahaya matahari kuat.',
      highlightClippingAssessment: {
        status: 'Clipping berat',
        severityLevel: 'Berat',
        affectedAreas: ['Jendela dan Sumber Cahaya Luar'],
        estimatedClippingPercentage: 11.2,
        isNaturalWhiteProtected: true,
        recoveryAssessment: 'Detail sangat terbatas',
        rootCauseAnalysis: 'Rasio kontras cahaya matahari luar ruangan melampaui rentang dinamis kamera dalam ruangan.',
        recommendedHighlights: -55,
        recommendedWhites: -25,
        recommendedLocalMasking: 'Terapkan linear gradient mask pada jendela agar exposure tubuh subjek tetap terjaga',
        permanentDataLossWarning: false
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: 0.1, status: 'TOO_LOW' }, // Face is underexposed, do not lower!
          highlights: { recommendedValue: -55, status: 'TOO_HIGH' },
          whites: { recommendedValue: -25, status: 'TOO_HIGH' },
          shadows: { recommendedValue: 30, status: 'TOO_LOW' }
        }
      }
    },
    validate: (res) => {
      if (res.adjustments.light.exposure.recommendedValue < 0) throw new Error('Exposure global must NOT be negative when subject is inside room');
      if (res.highlightClippingAssessment.recommendedHighlights > -40) throw new Error('Highlights should be strongly reduced');
      return 'Global exposure preserved (+0.1 EV) while Window highlights reduced (-55).';
    }
  },
  {
    name: 'Kasus 4: Gaun Putih Pengantin (White Attire Detail Preservation)',
    raw: {
      overallQuality: 'Baik',
      technicalSummary: 'Gaun renda putih dengan detail bordir halus dan pencahayaan lembut.',
      highlightClippingAssessment: {
        status: 'Tidak mengalami clipping',
        severityLevel: 'Normal',
        affectedAreas: ['Pakaian dan Gaun Pengantin'],
        estimatedClippingPercentage: 0.6,
        isNaturalWhiteProtected: true,
        recoveryAssessment: 'Detail masih tersedia dan berpotensi dipulihkan',
        rootCauseAnalysis: 'Gaun putih memiliki detail mikro renda yang utuh, Whites ditahan agar bordir tidak rata.',
        recommendedHighlights: -10,
        recommendedWhites: -5,
        permanentDataLossWarning: false
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: 0, status: 'NORMAL' },
          highlights: { recommendedValue: -10, status: 'NORMAL' },
          whites: { recommendedValue: -5, status: 'NORMAL' },
          shadows: { recommendedValue: 5, status: 'NORMAL' }
        }
      }
    },
    validate: (res) => {
      if (res.highlightClippingAssessment.recommendedWhites < -15) throw new Error('Whites should not be aggressively cut on bride dress');
      return 'White lace fabric details preserved without aggressive whites penalty.';
    }
  },
  {
    name: 'Kasus 5: Foto dengan Clipping Ekstrem (Permanent Sensor Blown-out)',
    raw: {
      overallQuality: 'Perlu Perbaikan Signifikan',
      technicalSummary: 'Overexposure parah dengan sorotan blitz dan lampu sorot membakar 22% bidang foto.',
      highlightClippingAssessment: {
        status: 'Clipping ekstrem',
        severityLevel: 'Ekstrem',
        affectedAreas: ['Area Langit', 'Wajah Sebagian', 'Baju Putih'],
        estimatedClippingPercentage: 22.4,
        isNaturalWhiteProtected: false,
        recoveryAssessment: 'Detail sudah hilang akibat clipping',
        rootCauseAnalysis: 'Piksel mencapai saturasi maksimum digital 255/255/255 tanpa informasi warna tersisa.',
        recommendedHighlights: -75,
        recommendedWhites: -40,
        permanentDataLossWarning: true
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: -0.4, status: 'TOO_HIGH' },
          highlights: { recommendedValue: -75, status: 'TOO_HIGH' },
          whites: { recommendedValue: -40, status: 'TOO_HIGH' },
          shadows: { recommendedValue: 10, status: 'NORMAL' }
        }
      }
    },
    validate: (res) => {
      if (!res.highlightClippingAssessment.permanentDataLossWarning) throw new Error('Permanent data loss warning must be active');
      if (res.highlightClippingAssessment.recoveryAssessment !== 'Detail sudah hilang akibat clipping') throw new Error('Recovery assessment must reflect irreversible loss');
      return 'Permanent data loss warning correctly triggered with extreme highlights cut (-75).';
    }
  },
  {
    name: 'Kasus 6: Foto dengan Pencahayaan Normal Seimbang',
    raw: {
      overallQuality: 'Sangat Baik',
      technicalSummary: 'Pencahayaan terdistribusi harmonis dengan dynamic range ideal dan tanpa clipping.',
      highlightClippingAssessment: {
        status: 'Tidak mengalami clipping',
        severityLevel: 'Normal',
        affectedAreas: ['Pencahayaan Normal Merata'],
        estimatedClippingPercentage: 0.1,
        isNaturalWhiteProtected: true,
        recoveryAssessment: 'Detail masih tersedia dan berpotensi dipulihkan',
        rootCauseAnalysis: 'Seluruh kurva tonal berada dalam rentang aman histogram.',
        recommendedHighlights: 0,
        recommendedWhites: 0,
        permanentDataLossWarning: false
      },
      adjustments: {
        light: {
          exposure: { recommendedValue: 0, status: 'NORMAL' },
          highlights: { recommendedValue: 0, status: 'NORMAL' },
          whites: { recommendedValue: 0, status: 'NORMAL' },
          shadows: { recommendedValue: 0, status: 'NORMAL' }
        }
      }
    },
    validate: (res) => {
      if (res.highlightClippingAssessment.status !== 'Tidak mengalami clipping') throw new Error('Status must be Tidak mengalami clipping');
      return 'Balanced normal photo verified with 0 clipping adjustment.';
    }
  }
];

let allPassed = true;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  try {
    const norm = validateAndNormalizeGeminiResult(tc.raw, {
      fileName: 'test.jpg',
      fileSize: 1024 * 1024,
      mimeType: 'image/jpeg',
      sha256Hash: 'dummyhash',
      modelName: 'gemini-3.5-flash-lite'
    }, true, 'Kulit natural dan lebih bersih');

    const res = norm.result;
    const msg = tc.validate(res);
    console.log(`✅ ${tc.name}`);
    console.log(`   - Status: ${res.highlightClippingAssessment.status} (Tingkat: ${res.highlightClippingAssessment.severityLevel})`);
    console.log(`   - Pemulihan: ${res.highlightClippingAssessment.recoveryAssessment}`);
    console.log(`   - Rekomendasi: Highlights=${res.highlightClippingAssessment.recommendedHighlights}, Whites=${res.highlightClippingAssessment.recommendedWhites}`);
    console.log(`   - Hasil Uji: ${msg}\n`);
  } catch (err) {
    console.error(`❌ ${tc.name} FAILED: ${err.message}\n`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('================================================================');
  console.log('  ALL 6 HIGHLIGHT CLIPPING TEST CASES PASSED WITH 100% ACCURACY! ');
  console.log('================================================================');
}
