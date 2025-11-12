// netlify/functions/gemini-proxy.js

// Kunci-kunci API tim Anda disimpan di environment variable Netlify (sisi server)
// Kita akan menyimpan ini di Netlify dengan nama 'GEMINI_KEY_POOL'
const GEMINI_KEYS = process.env.GEMINI_KEY_POOL ? process.env.GEMINI_KEY_POOL.split(',').filter(k => k.trim() !== '') : [];

// Variabel untuk melacak kunci mana yang terakhir digunakan (Shared state)
let keyIndex = 0;

// Logika Round-Robin Rotation
function getNextApiKey() {
  if (GEMINI_KEYS.length === 0) {
    // Tidak melempar error di sini, agar bisa ditangani di handler utama
    return null;
  }
  
  const key = GEMINI_KEYS[keyIndex];
  
  // Update index ke kunci berikutnya, kembali ke 0 jika sudah sampai di akhir array
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  
  return key;
}

// Handler utama untuk Netlify Function
exports.handler = async (event) => {
  // Pastikan metode adalah POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (GEMINI_KEYS.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Configuration Error', details: 'GEMINI_KEY_POOL environment variable not set or is empty on the server.' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    let lastError = null;

    // --- LOGIKA AUTO-RETRY ---
    // Coba setiap kunci di pool sekali per permintaan.
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      const apiKey = getNextApiKey();
      if (!apiKey) continue; // Seharusnya tidak terjadi jika pemeriksaan di atas lolos

      // UPGRADE LOGGING: Sertakan 4 digit terakhir kunci untuk identifikasi yang mudah
      const currentIndex = (keyIndex - 1 + GEMINI_KEYS.length) % GEMINI_KEYS.length;
      const keyIdentifier = `...${apiKey.slice(-4)} (index ${currentIndex})`;

      console.log(`[Proxy] Attempting call with key ${keyIdentifier}...`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.promptBody),
      });

      const result = await response.json();

      // KASUS 1: Panggilan Berhasil
      if (response.ok) {
        console.log(`[Proxy] Call successful with key ${keyIdentifier}.`);
        return {
          statusCode: 200,
          body: JSON.stringify(result),
        };
      }

      // KASUS 2: Kunci API Tidak Valid, coba kunci berikutnya
      if (response.status === 400 && result.error?.message?.includes('API key not valid')) {
        console.warn(`[Proxy] Key ${keyIdentifier} is invalid. Trying next key...`);
        lastError = result; // Simpan error terakhir untuk dilaporkan jika semua kunci gagal
        continue; // Lanjutkan ke iterasi loop berikutnya
      }
      
      // KASUS 3: Error Lain (mis. 429 Quota, 500 Server Error), langsung gagal
      console.error(`[Proxy] Unrecoverable Google API Error with key ${keyIdentifier}. Aborting.`, result);
      return {
        statusCode: response.status,
        body: JSON.stringify(result),
      };
    }

    // Jika loop selesai tanpa ada yang berhasil, berarti semua kunci gagal.
    console.error('[Proxy] All API keys in the pool failed validation.');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'All API keys in the pool are invalid.',
        details: lastError || 'No successful response from API after trying all keys.'
      }),
    };

  } catch (error) {
    console.error('[Proxy] Internal function error.', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error (Function Failed)', details: error.message }),
    };
  }
};
