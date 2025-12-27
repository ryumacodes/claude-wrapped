// ============================================
// CLAUDE WRAPPED - LOCAL LLM (Transformers.js)
// ============================================
// Runs SmolLM2-135M-Instruct entirely in-browser
// No API key needed - model cached in IndexedDB

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct';
const MODEL_SIZE_MB = 150; // Approximate for progress display

let generator = null;
let modelLoading = false;
let modelReady = false;

// ============================================
// MODEL LOADING
// ============================================

async function loadModel(onProgress) {
    if (modelReady && generator) return generator;
    if (modelLoading) {
        // Wait for existing load to complete
        while (modelLoading) {
            await new Promise(r => setTimeout(r, 100));
        }
        return generator;
    }

    modelLoading = true;

    try {
        // Try WebGPU first, fall back to WASM
        let device = 'webgpu';
        if (!navigator.gpu) {
            console.log('WebGPU not available, using WASM');
            device = 'wasm';
        }

        generator = await pipeline('text-generation', MODEL_ID, {
            dtype: 'q4', // 4-bit quantization for smaller size
            device: device,
            progress_callback: (progress) => {
                if (onProgress && progress.status === 'progress') {
                    const percent = progress.progress || 0;
                    const loaded = (percent / 100 * MODEL_SIZE_MB).toFixed(1);
                    onProgress({
                        percent,
                        loaded,
                        total: MODEL_SIZE_MB,
                        status: progress.status,
                        file: progress.file
                    });
                } else if (onProgress && progress.status === 'ready') {
                    onProgress({ percent: 100, loaded: MODEL_SIZE_MB, total: MODEL_SIZE_MB, status: 'ready' });
                }
            }
        });

        modelReady = true;
        return generator;
    } catch (err) {
        console.error('Failed to load model:', err);
        throw new Error('Failed to load AI model. Your browser may not support WebGPU/WASM.');
    } finally {
        modelLoading = false;
    }
}

function isModelReady() {
    return modelReady;
}

// ============================================
// TEXT GENERATION
// ============================================

async function generate(prompt, maxTokens = 200) {
    const gen = await loadModel();

    const messages = [
        { role: 'user', content: prompt }
    ];

    const output = await gen(messages, {
        max_new_tokens: maxTokens,
        temperature: 0.8,
        do_sample: true,
        return_full_text: false,
        repetition_penalty: 1.2,
        no_repeat_ngram_size: 3
    });

    console.log('Model output:', output);

    // Handle different output formats
    let result = output[0]?.generated_text;

    // If result is an array of messages, get the last assistant message
    if (Array.isArray(result)) {
        const assistantMsg = result.find(m => m.role === 'assistant');
        result = assistantMsg?.content || result[result.length - 1]?.content || '';
    }

    // If result is an object with content
    if (result && typeof result === 'object' && result.content) {
        result = result.content;
    }

    return String(result || '');
}

function hasWordRepetition(text) {
    const words = text.toLowerCase().split(/\s+/);
    if (words.length < 4) return false;

    // Check for repeated words (same word 3+ times)
    const wordCounts = {};
    for (const word of words) {
        if (word.length < 3) continue;
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        if (wordCounts[word] >= 3) return true;
    }

    // Check for repeated bigrams (e.g., "learn to learn to")
    for (let i = 0; i < words.length - 3; i++) {
        const bigram = words[i] + ' ' + words[i + 1];
        const nextBigram = words[i + 2] + ' ' + words[i + 3];
        if (bigram === nextBigram) return true;
    }

    return false;
}

// ============================================
// POEM & PREDICTIONS GENERATION
// ============================================

async function generatePoem(wrappedData, onProgress) {
    const { stats, archetype, themes, phrases } = wrappedData;

    const archetypeName = archetype?.name || 'Ranger';

    // Get top 3 themes instead of just one
    const allThemes = (themes || [])
        .slice(0, 3)
        .map(t => t.title)
        .join(', ') || 'various topics';

    // Get top 5 phrases/words the user actually uses
    const topPhrases = (phrases?.unigrams || [])
        .slice(0, 5)
        .map(p => p.phrase)
        .join(', ') || '';

    const firstTheme = allThemes.split(',')[0]?.trim() || 'learning';

    const prompt = `Write a 3-line haiku about ${firstTheme}. Keep it simple and natural.

Morning light arrives
Coffee steams beside keyboard
New ideas bloom

Autumn leaves falling
Code flows like a gentle stream
Wisdom takes its time

${firstTheme.charAt(0).toUpperCase() + firstTheme.slice(1)} inspires me`;

    await loadModel(onProgress);

    // Retry up to 5 times
    const MAX_RETRIES = 5;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const response = await generate(prompt, 40);

        // Get lines for haiku - clean up common issues
        let lines = response.trim().split('\n')
            .map(l => l.trim())
            // Remove line number prefixes like "1.", "Line 1:", etc.
            .map(l => l.replace(/^(\d+[\.\):]?\s*|Line\s*\d+:?\s*)/i, ''))
            .filter(l => {
                if (l.length < 4 || l.length > 50) return false;
                // Skip meta-text
                if (/^(example|haiku|write|now|here|sure|i |i'm|okay|let)/i.test(l)) return false;
                // Skip lines with special chars
                if (/[\[\]<>{}|\\]|:$/.test(l)) return false;
                return true;
            });

        // Validation
        const hasGibberish = lines.some(l =>
            /R\.I\.|Refract|Cléau|SmolLM|https?:/i.test(l) ||
            /(.)\1{3,}/.test(l)  // Repeated chars
        );

        // Check for reasonable word counts per line (2-7 words)
        const validLineLengths = lines.every(l => {
            const wordCount = l.split(/\s+/).length;
            return wordCount >= 2 && wordCount <= 8;
        });

        if (lines.length >= 3 && !hasGibberish && validLineLengths) {
            const haiku = lines.slice(0, 3).join('\n');
            console.log(`Haiku generated successfully on attempt ${attempt}`);
            return haiku;
        }

        console.log(`Haiku attempt ${attempt}/${MAX_RETRIES} invalid:`, response.substring(0, 100));
    }

    console.log('All haiku attempts failed, using fallback');
    return getFallbackPoem(wrappedData);
}

async function generatePredictions(wrappedData, onProgress) {
    const { themes, archetype, phrases } = wrappedData;
    const topTheme = themes?.[0]?.title || 'learning';
    const secondTheme = themes?.[1]?.title || 'creating';
    const style = archetype?.name || 'Explorer';
    const topWord = phrases?.unigrams?.[0]?.phrase || 'ideas';

    await loadModel(onProgress);

    // Generate each prediction separately with simple prompts
    const prompts = [
        { start: `In 2026, your ${topTheme} skills will`, fallback: `Your ${topTheme} obsession will reach new heights` },
        { start: `As a ${style}, you'll discover`, fallback: `As a true ${style}, you'll discover 3 new use cases` },
        { start: `Your favorite word "${topWord}" will`, fallback: `"${topWord}" will become your catchphrase` },
        { start: `Next year in ${secondTheme}, you'll`, fallback: `Your ${secondTheme} journey will surprise you` }
    ];

    const MAX_RETRIES = 5;
    const predictions = [];
    for (const { start, fallback } of prompts) {
        let generated = false;
        for (let attempt = 1; attempt <= MAX_RETRIES && !generated; attempt++) {
            try {
                const prompt = `Complete each sentence with a short, fun prediction (5-15 words):

Example: In 2026, your Coding skills will → unlock new creative possibilities
Example: As a Sage, you'll discover → the joy of mentoring others
Example: Your favorite word "debug" will → become your superpower at work

Now complete: ${start} →`;

                const response = await generate(prompt, 20);
                let completion = response.trim().split('\n')[0].trim();

                // Remove leading arrow if model included it
                completion = completion.replace(/^→\s*/, '').trim();

                // Validation - check for bad patterns
                const words = completion.split(/\s+/);
                const isValid = completion.length >= 5 && completion.length <= 80 &&
                    words.length >= 3 && words.length <= 20 &&
                    !/\d{3,}|level up|you will be|you'll be a \d/i.test(completion) &&
                    !/(.)\1{4,}/.test(completion) &&
                    !hasWordRepetition(completion) &&
                    !/^(I |I'm |I'll |I've |Here|Please|Sure|Let me)/i.test(completion) &&
                    !/\?|!{2,}/.test(completion) &&
                    !/help|assist|provide|question/i.test(completion);

                if (isValid) {
                    predictions.push(start + ' ' + completion);
                    generated = true;
                } else {
                    console.log(`Prediction attempt ${attempt}/${MAX_RETRIES} invalid:`, completion);
                }
            } catch (err) {
                console.error(`Prediction attempt ${attempt}/${MAX_RETRIES} failed:`, err);
            }
        }
        if (!generated) {
            console.log('All prediction attempts failed, using fallback');
            predictions.push(fallback);
        }
    }

    console.log('Predictions generated:', predictions);
    return predictions;
}

// ============================================
// FALLBACK (Template-based)
// ============================================

function getFallbackPredictions(wrappedData) {
    const { stats, themes, archetype, phrases } = wrappedData;
    const topTheme = themes?.[0]?.title || 'exploring ideas';
    const secondTheme = themes?.[1]?.title || 'creative projects';
    const style = archetype?.name || 'Ranger';
    const msgCount = stats?.messages_sent || 0;
    const topWord = phrases?.unigrams?.[0]?.phrase || 'curiosity';

    return [
        `Your ${topTheme} obsession will reach new heights in 2026`,
        `As a true ${style}, you'll discover at least 3 new AI use cases`,
        `Your message count will double - ${msgCount * 2}+ messages incoming`,
        `"${topWord}" will become your catchphrase in ${secondTheme} discussions`
    ];
}

function getFallbackPoem(wrappedData) {
    const { archetype, themes, phrases } = wrappedData;
    const style = archetype?.name?.toLowerCase() || 'seeker';
    const topTheme = themes?.[0]?.title?.toLowerCase() || 'ideas';
    const topWord = phrases?.unigrams?.[0]?.phrase || 'wonder';

    return `${style.charAt(0).toUpperCase() + style.slice(1)} of ${topTheme}
${topWord.charAt(0).toUpperCase() + topWord.slice(1)} guides the path forward
Claude lights the way`;
}

// ============================================
// BROWSER SUPPORT CHECK
// ============================================

function checkBrowserSupport() {
    const hasWebGPU = !!navigator.gpu;
    const hasWASM = typeof WebAssembly !== 'undefined';

    return {
        supported: hasWebGPU || hasWASM,
        webgpu: hasWebGPU,
        wasm: hasWASM,
        recommended: hasWebGPU ? 'webgpu' : 'wasm'
    };
}

// ============================================
// EXPORT
// ============================================

window.LocalAI = {
    loadModel,
    isModelReady,
    generate,
    generatePoem,
    generatePredictions,
    getFallbackPoem,
    getFallbackPredictions,
    checkBrowserSupport,
    MODEL_SIZE_MB
};

export {
    loadModel,
    isModelReady,
    generate,
    generatePoem,
    generatePredictions,
    getFallbackPoem,
    getFallbackPredictions,
    checkBrowserSupport
};
