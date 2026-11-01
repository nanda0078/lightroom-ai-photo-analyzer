# AI Photo Analyzer — Lightroom Parameter Recommender

Sistem analisis foto profesional bertenaga Gemini AI multimodal untuk menganalisis kondisi teknis fotografi dan menghasilkan rekomendasi parameter Adobe Lightroom yang presisi, tanpa mengubah satu piksel pun dari foto asli pengguna.

> [!IMPORTANT]
> **Keputusan Kunci & Konfirmasi Pengguna**:
> - **Tema Visual**: Dark Studio profesional khas Adobe Lightroom (palet abu-abu gelap `#0e1117`, aksen amber/emas `#f59e0b`, tipografi teknis presisi).
> - **Preset Foto Sampel**: Bersih tanpa preset bawaan — pengguna langsung mengunggah foto miliknya ke area upload interaktif.
> - **Integritas File Asli**: Zero-compression, zero-re-encoding, zero-downscaling. File asli disimpan sebagai Blob murni dengan verifikasi SHA-256 checksum otomatis sebelum dan sesudah pengunduhan.
> - **Peran AI**: Analis murni (*AI Photo Analyst & Quality Inspector*). Tidak ada proses editing generatif, penghalusan kulit, atau modifikasi wajah.

---

## 1. Ringkasan & Konsep Utama

- **Fungsi Utama**: Menganalisis foto secara otomatis menggunakan model Gemini 3.8 Flash multimodal, mengevaluasi parameter fotografi (Light, Color, Effects, Detail), serta memberikan rekomendasi angka koreksi Lightroom, arah penyesuaian (Increase / Decrease / Hold), tingkat kepastian (confidence), dan alasan teknis.
- **Target Pengguna**: Fotografer pemula hingga profesional, content creator, dan photo retoucher yang membutuhkan panduan grading Lightroom yang objektif dan cepat.
- **Nilai Unggul**:
  - Rekomendasi parameter Adobe Lightroom lengkap: Basic Tone, Curves, White Balance, HSL 8-channel mixer, Color Grading wheels, Clarity/Texture, Sharpening, hingga Noise Reduction.
  - Verifikasi integritas file SHA-256 untuk membuktikan foto asli tidak mengalami degradasi atau kompresi.
  - Fasilitas salin instan: Salin Semua Rekomendasi, Salin per Kategori, dan Format Teks Pengaturan Lightroom.

---

## 2. Pengalaman Pengguna & Desain Visual

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  LIGHTROOM AI ANALYZER         [Status: Gemini 3.8 Flash]   [Pengaturan & Status API]  │
├──────────────────────────────────────┬─────────────────────────────────────────────────┤
│                                      │  RINGKASAN ANALISIS AI                          │
│         PREVIEW FOTO ASLI            │  Kondisi: Sedikit Underexposed · Cast Hangat    │
│                                      │  Masalah: Dynamic Range Rendah · Shadow Noise   │
│   [Area Foto Resolusi Asli]          ├─────────────────────────────────────────────────┤
│                                      │  [LIGHT]   [COLOR]   [EFFECTS]   [DETAIL]       │
│   Metadata Asli:                     ├─────────────────────────────────────────────────┤
│   - Nama: IMG_8920.CR3 / .JPG        │  Exposure        [TOO_LOW]       +0.45 EV       │
│   - Dimensi: 4000 x 6000 px          │  Contrast        [NORMAL]           0           │
│   - Ukuran: 12.4 MB                  │  Highlights      [TOO_HIGH]       -25           │
│   - Checksum: a8f4...91c0 (SHA-256)  │  Shadows         [TOO_LOW]        +30           │
│                                      │  Alasan: "Shadow clipping pada latar belakang"  │
│   [Unduh File Asli (Zero Comp)]      ├─────────────────────────────────────────────────┤
│   [Verifikasi Integritas SHA-256]    │  [Salin Semua]  [Salin Kategori]  [Ulangi AI]   │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

### A. Alur Interaksi Pengguna
1. **Upload & Analisis Otomatis**: Pengguna mengunggah foto melalui *drag-and-drop* atau *file picker*. File asli dibaca sebagai `File`/`Blob` murni, ukuran dan dimensi diekstrak, dan SHA-256 checksum dihitung secara asinkron.
2. **Pengiriman ke Gemini Server Route**: Backend membaca buffer gambar dan memanggil Gemini 3.8 Flash dengan JSON Schema terstruktur mencakup seluruh parameter Lightroom.
3. **Penyajian Data Interaktif**: Hasil analisis disajikan dalam 4 tab kategori utama dengan indikator warna:
   - **Merah**: Perlu Koreksi (`TOO_LOW` / `TOO_HIGH`)
   - **Kuning**: Perlu Perhatian (`SLIGHT_VARIATION`)
   - **Hijau**: Kondisi Optimal (`NORMAL`)
   - **Abu-abu**: Tidak Terdeteksi / Netral (`NOT_DETECTABLE`)
4. **Tindakan Pengguna**:
   - Salin rekomendasi per kategori atau seluruh parameter sekaligus ke clipboard.
   - Unduh foto asli (100% biner identik) dengan verifikasi hash SHA-256 instan.
   - Analisis ulang foto jika diperlukan dengan parameter tambahan.

### B. Identitas Visual & Tema
- **Aesthetic**: Dark Room & Studio Grading Console terinspirasi antarmuka Adobe Lightroom Classic / Camera Raw.
- **Palet Warna**:
  - Background Canvas: `#0f1117` (Deep Dark Obsidian)
  - Card & Surfaces: `#181b22` & `#212631` dengan garis batas halus `#2d3343`
  - Aksen Primer: Amber Lightroom Gold (`#f59e0b`) & Cool Cyan (`#06b6d4`)
  - Status Semantik: Emerald `#10b981` (Normal), Rose `#f43f5e` (Perlu Koreksi), Amber `#f59e0b` (Perhatian), Slate `#64748b` (Netral)
- **Tipografi**:
  - Display/Judul: `Plus Jakarta Sans` berbobot tebal dan bersih.
  - Data & Angka Parameter: `font-mono tabular-nums` untuk perataan angka desimal Lightroom (EV, persentase, channel).

---

## 3. Keputusan Teknis & Arsitektur Sistem

```
┌────────────────────────────────────────────────────────┐
│                   BROWSER FRONTEND                     │
│  - File Input Handler (Preserves Original Blob)        │
│  - Web Crypto API (SHA-256 Checksum Calculator)        │
│  - Interactive Tabs: Light, Color, Effects, Detail     │
│  - Copy Engine (Plain Text & XMP Settings Format)      │
│  - Download Manager (Zero-Compression FileSaver)       │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/analyze-photo (multipart/base64)
┌───────────────────────────▼────────────────────────────┐
│                  EXPRESS BACKEND PROXY                 │
│  - Validasi File (MIME types, buffer boundary)         │
│  - Gemini SDK Server-Side Client (@google/genai)       │
│  - Model: gemini-3.8-flash (Multimodal JSON Schema)    │
│  - Structured Output Parser & Response Validator       │
└────────────────────────────────────────────────────────┘
```

### A. Strategi Integrasi Gemini API
- **Model**: `gemini-3.8-flash` dengan `responseMimeType: "application/json"` dan skema ketat.
- **Server-Side Execution**: Semua pemanggilan `@google/genai` dilakukan pada server Express via route `/api/analyze-photo` sesuai panduan keamanan AI Studio (kunci API aman di `process.env.GEMINI_API_KEY`).
- **Prompt Analisis Khusus**: Berisi aturan ketat:
  - Hanya bertindak sebagai pengamat teknis fotografi.
  - Jangan merekomendasikan perubahan pada parameter yang sudah seimbang.
  - Jangan menyarankan modifikasi bentuk wajah, pori-pori kulit, atau rekonstruksi generatif.

### B. Skema Analisis Lengkap
1. **Light**: Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Auto Tone, Tone Curve, Parametric Curve, RGB Curves (Red, Green, Blue).
2. **Color**: White Balance (Temp, Tint), Global (Vibrance, Saturation), HSL Mixer (8 channel: Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta masing-masing memiliki Hue, Saturation, Luminance), Point Color, Color Grading (Shadows, Midtones, Highlights, Global, Blending, Balance).
3. **Effects**: Texture, Clarity, Dehaze, Vignette, Grain (Amount, Size, Roughness).
4. **Detail**: Sharpening (Amount, Radius, Detail, Masking), Noise Reduction (Luminance, Detail, Contrast), Color Noise Reduction (Reduction, Detail, Smoothness).

### C. Jaminan Keaslian File & SHA-256 Checksum
- Browser menggunakan `window.crypto.subtle.digest("SHA-256", arrayBuffer)` untuk menghitung hash file asli saat pertama kali diunggah.
- Tombol unduh menggunakan referensi `File` / `Blob` asli yang tersimpan di state memori browser via `URL.createObjectURL(originalFile)`.
- Sedia alat verifikasi langsung: modal verifikasi yang membandingkan hash file awal dengan hash download.

---

## 4. Rencana Tahapan Eksekusi

1. **Konfigurasi Server & Backend Endpoint**:
   - Buat server Express `server.ts` dengan endpoint `POST /api/analyze-photo` dan `GET /api/status`.
   - Setup `@google/genai` dengan model `gemini-3.8-flash` dan structured schema.
   - Konfigurasi Vite server proxy agar dev server meneruskan `/api` ke Express.
2. **Model Data & Tipe TypeScript**:
   - Definisikan tipe untuk setiap parameter Lightroom (`LightroomParameter`, `PhotoAnalysisResponse`, `StatusKondisi`, `KategoriAnalisis`).
3. **Komponen Antarmuka Pengguna**:
   - `Header`: Wordmark studio, indikator model AI, dan modal status API & Pengaturan.
   - `PhotoUploadZone`: Area drag-and-drop responsif, menampilkan thumbnail preview resolusi asli, dimensi, ukuran file, format, dan SHA-256 hash.
   - `AnalysisSummaryCard`: Ringkasan kondisi foto, highlight masalah fotografi, dan skor kualitas teknis.
   - `ParameterCategories`: Tabulasi 4 kategori (Pencahayaan, Warna, Efek, Detail) dengan visual card, slider posisi relatif, badge status warna, arah perubahan, nilai rekomendasi, dan alasan fotografi.
   - `ActionToolbar`: Tombol Salin Semua, Salin per Kategori, Analisis Ulang, dan Unduh Foto Asli.
   - `ChecksumModal`: Modal verifikasi integritas file SHA-256.
4. **Pengujian & Validasi**:
   - Uji dengan berbagai tipe foto (underexposed, warm cast, portrait, landscape).
   - Validasi SHA-256 hash match antara file upload dan download.
   - Jalankan `compile_applet` untuk memastikan build bersih tanpa error TypeScript.
