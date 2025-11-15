// File: netlify/functions/gemini-proxy.js

// IMPORTANT: This proxy requires the 'node-fetch' package to be installed for Netlify functions.
// Run: npm install node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 1. Dapatkan Kunci dari Environment Pool
    const keyPoolString = process.env.GEMINI_KEY_POOL;
    const KEY_POOL = keyPoolString ? keyPoolString.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];

    if (KEY_POOL.length === 0) {
        console.error("[Proxy FATAL] GEMINI_KEY_POOL environment variable is empty or not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "FATAL: GEMINI_KEY_POOL environment variable is empty." }),
        };
    }
    
    // 2. Acak Urutan Kunci untuk Distribusi Beban
    const shuffledKeys = [...KEY_POOL].sort(() => 0.5 - Math.random());

    // 3. Persiapan Payload
    let payload;
    let modelName;
    try {
        const body = JSON.parse(event.body);
        payload = body.promptBody; // The main payload for Google API
        modelName = body.modelName; // The model name (e.g., 'gemini-2.5-flash')
        if (!payload || !modelName) {
            throw new Error("Request body must include 'promptBody' and 'modelName'.");
        }
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload.", details: e.message }) };
    }

    let lastError = null;

    // 4. Loop Retry Kritis
    for (const apiKey of shuffledKeys) {
        const shortKey = `${apiKey.substring(0, 5)}...${apiKey.slice(-4)}`;
        console.log(`[Proxy] Mencoba Kunci: ${shortKey}`);
        
        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            const fetchResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const responseText = await fetchResponse.text();

            if (!fetchResponse.ok) {
                // Throw an error to be caught by the catch block, triggering a retry with the next key.
                throw new Error(`Google API Error (Status: ${fetchResponse.status}): ${responseText}`);
            }
            
            // Berhasil!
            console.log(`[Proxy] Berhasil menggunakan Kunci: ${shortKey}`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: responseText,
            };
            
        } catch (error) {
            // Gagal. Simpan error dan biarkan loop berlanjut untuk mencoba kunci berikutnya.
            const errorMessage = error.message || JSON.stringify(error);
            lastError = errorMessage;
            
            console.warn(`[Proxy] Kunci ${shortKey} gagal: ${errorMessage}`);
        }
    }
    
    // 5. Gagal Total
    console.error("[Proxy FATAL] Semua kunci di pool gagal setelah percobaan.");
    return {
        statusCode: 429, // "Too Many Requests" is a fitting error code for this situation.
        body: JSON.stringify({
            error: "Semua Kunci API di Pool Gagal atau Mencapai Batas Kuota.",
            details: lastError || "Tidak ada detail error yang tersedia.",
        }),
    };
};