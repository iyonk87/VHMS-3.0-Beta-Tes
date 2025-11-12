// netlify/functions/gemini-proxy.js

// Kunci-kunci API tim Anda disimpan di environment variable Netlify (sisi server)
// Kita akan menyimpan ini di Netlify dengan nama 'GEMINI_KEY_POOL'
const GEMINI_KEYS = process.env.GEMINI_KEY_POOL ? process.env.GEMINI_KEY_POOL.split(',') : [];

// Variabel untuk melacak kunci mana yang terakhir digunakan (Shared state)
// Catatan: Dalam production, state ini harus disimpan di database, 
// tapi untuk percobaan ini, kita akan menggunakan array sederhana
let keyIndex = 0;

// Logika Round-Robin Rotation
function getNextApiKey() {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('GEMINI_KEY_POOL environment variable not set or empty.');
  }
  
  const key = GEMINI_KEYS[keyIndex];
  
  // Update index ke kunci berikutnya, kembali ke 0 jika sudah sampai di akhir array
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  
  return key;
}

// Handler utama untuk Netlify Function
exports.handler = async (event) => {
  // Pastikan metode adalah POST (karena VHMS mengirim data Analisis)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body); // Ambil prompt dari frontend VHMS
    const apiKey = getNextApiKey();      // Dapatkan kunci berikutnya dari pool

    // Pastikan kunci didapatkan
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API Key rotation failed.' }),
        };
    }

    // --- Panggilan ke API Gemini ---
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.promptBody), // Kirim body prompt dari frontend
    });

    const result = await response.json();

    // Jika terjadi error dari Google (e.g., 429), kita bisa log untuk debug
    if (!response.ok) {
      console.error('Google API Error:', result);
    }
    
    // Kirim respons kembali ke frontend VHMS
    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error (Function Failed)', details: error.message }),
    };
  }
};
