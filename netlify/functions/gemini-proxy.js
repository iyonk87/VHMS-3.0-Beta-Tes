// File: netlify/functions/gemini-proxy.js

// [ENHANCEMENT] Import crypto for unique request IDs
import { randomUUID } from 'crypto';

// IMPORTANT: This proxy requires the 'node-fetch' package to be installed for Netlify functions.
// Run: npm install node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


export const handler = async (event) => {
    // [LOGGING] Generate a unique ID for this request for traceability.
    const requestId = randomUUID();
    
    console.log(`[Proxy Request START: ${requestId}] Method: ${event.httpMethod}`);

    if (event.httpMethod !== 'POST') {
        console.warn(`[Proxy Request END: ${requestId}] Blocked due to invalid method.`);
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 1. Dapatkan Kunci dari Environment Pool
    const keyPoolString = process.env.GEMINI_KEY_POOL;
    const KEY_POOL = keyPoolString ? keyPoolString.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];

    if (KEY_POOL.length === 0) {
        console.error(`[Proxy FATAL: ${requestId}] GEMINI_KEY_POOL environment variable is empty or not set.`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "FATAL: GEMINI_KEY_POOL environment variable is empty." }),
        };
    }
    
    // 2. Acak Urutan Kunci untuk Distribusi Beban
    const shuffledKeys = [...KEY_POOL].sort(() => 0.5 - Math.random());
    console.log(`[Proxy INFO: ${requestId}] Key pool loaded. ${shuffledKeys.length} keys available. Shuffling for distribution.`);

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
        console.error(`[Proxy ERROR: ${requestId}] Invalid JSON payload.`, e.message);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload.", details: e.message }) };
    }

    let lastError = null;

    // 4. Loop Retry Kritis
    for (const apiKey of shuffledKeys) {
        const shortKey = `${apiKey.substring(0, 5)}...${apiKey.slice(-4)}`;
        // [LOGGING] Log which key is being attempted.
        console.log(`[Proxy ATTEMPT: ${requestId}] Trying Key: ${shortKey} for model ${modelName}`);
        
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
            // [LOGGING] Log the successful key.
            console.log(`[Proxy SUCCESS: ${requestId}] Successfully used Key: ${shortKey}`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: responseText,
            };
            
        } catch (error) {
            // Gagal. Simpan error dan biarkan loop berlanjut untuk mencoba kunci berikutnya.
            const errorMessage = error.message || JSON.stringify(error);
            lastError = errorMessage;
            
            // [LOGGING] Log the specific failure for this key.
            console.warn(`[Proxy FAILED_ATTEMPT: ${requestId}] Key ${shortKey} failed: ${errorMessage}`);
        }
    }
    
    // 5. Gagal Total
    // [LOGGING] Log that all keys in the pool failed.
    console.error(`[Proxy FATAL: ${requestId}] All keys in the pool failed. Last recorded error: ${lastError}`);
    return {
        statusCode: 429, // "Too Many Requests" is a fitting error code for this situation.
        body: JSON.stringify({
            error: "Semua Kunci API di Pool Gagal atau Mencapai Batas Kuota.",
            details: lastError || "Tidak ada detail error yang tersedia.",
        }),
    };
};
