"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = chatCompletion;
exports.listModels = listModels;
/**
 * Provider-agnostic proxy for LLM chat-completion and model-list requests.
 *
 * All providers are spoken to in the OpenAI chat-completion format; Anthropic is translated to/from
 * its native Messages API via {@link ./anthropicAdapter}. API keys are passed in by the caller (the
 * backend resolves them from the central credential store) and never leave the adapter process.
 *
 * Mirrors the request/response shapes of ioBroker.javascript's `chatCompletion` handler.
 */
const axios_1 = __importDefault(require("axios"));
const https = __importStar(require("node:https"));
const anthropicAdapter_1 = require("./anthropicAdapter");
const DEFAULT_TIMEOUT = 600_000;
const DEFAULT_MAX_TOKENS = 8192;
const OPENAI_BASE = 'https://api.openai.com/v1';
/**
 * Models that refuse function tools unless the reasoning is switched off explicitly.
 *
 * OpenAI answers such a request with "Function tools with reasoning_effort are not supported for
 * <model> in /v1/chat/completions ... or set reasoning_effort to 'none'". Which models behave that
 * way changes with every release, so they are not kept in a list here but learned from the error:
 * the first request of a session runs into it, is repeated, and every later one carries the
 * parameter right away.
 */
const needReasoningEffortNone = new Set();
/** Build an https agent that tolerates self-signed certs, but only for https URLs when requested. */
function httpsAgentFor(url, allowSelfSigned) {
    return allowSelfSigned && url.startsWith('https:') ? new https.Agent({ rejectUnauthorized: false }) : undefined;
}
/** Build the provider-specific URL, headers and request body for a chat completion. */
function buildChatRequest(params) {
    const { provider, model, apiKey, baseUrl, messages, tools } = params;
    const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        const { system, messages: anthropicMessages } = (0, anthropicAdapter_1.translateMessagesToAnthropic)(messages);
        const anthropicTools = tools?.length ? (0, anthropicAdapter_1.translateToolsToAnthropic)(tools) : [];
        return {
            url: 'https://api.anthropic.com/v1/messages',
            headers,
            body: {
                model,
                max_tokens: maxTokens,
                stream: false,
                ...(system ? { system } : {}),
                messages: anthropicMessages,
                ...(anthropicTools.length ? { tools: anthropicTools } : {}),
            },
        };
    }
    if (provider === 'gemini') {
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }
        return {
            url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            headers,
            body: { model, messages, stream: false, ...(tools?.length ? { tools } : {}) },
        };
    }
    if (provider === 'deepseek') {
        headers.Authorization = `Bearer ${apiKey}`;
        return {
            url: 'https://api.deepseek.com/chat/completions',
            headers,
            body: { model, messages, stream: false, ...(tools?.length ? { tools } : {}) },
        };
    }
    // openai or custom (OpenAI-compatible) endpoint. A base URL only applies to the "custom" provider;
    // ignore any value left over from a previous custom configuration so OpenAI always talks to its
    // official endpoint (https://api.openai.com) instead of the stale custom URL.
    const customBase = provider === 'custom' ? baseUrl : undefined;
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    const base = customBase || OPENAI_BASE;
    // Local models: switch reasoning off to save context and time. Hosted models: only when they
    // have already refused tools without it, see `needReasoningEffortNone`.
    const noReasoning = !!customBase || needReasoningEffortNone.has(`${provider}:${model}`);
    return {
        url: `${base}/chat/completions`,
        headers,
        body: {
            model,
            messages,
            stream: false,
            ...(tools?.length ? { tools } : {}),
            ...(noReasoning ? { reasoning_effort: 'none' } : {}),
        },
    };
}
/** Extract a short human-readable error detail from a failed provider response. */
function errorDetail(status, data) {
    if (data && typeof data === 'object') {
        const message = data.error?.message;
        if (message) {
            return message;
        }
    }
    if (typeof data === 'string' && data) {
        return data.substring(0, 300);
    }
    try {
        return JSON.stringify(data).substring(0, 300);
    }
    catch {
        return `HTTP ${status}`;
    }
}
/**
 * Send one chat-completion request to the configured provider.
 *
 * @param params provider, model, key, messages and (optional) tools
 * @returns the assistant content and any requested tool calls (OpenAI shape)
 * @throws {Error} with a human-readable message on connection or API errors
 */
async function chatCompletion(params) {
    const { url, headers, body } = buildChatRequest(params);
    const config = {
        headers,
        timeout: params.timeoutMs ?? DEFAULT_TIMEOUT,
        validateStatus: () => true,
        // Accepting self-signed certs only makes sense for a custom endpoint; never weaken TLS for the
        // official provider hosts even if the flag is left over from a previous custom configuration.
        httpsAgent: httpsAgentFor(url, params.provider === 'custom' && params.allowSelfSignedCerts),
    };
    const post = async (data) => {
        try {
            return await axios_1.default.post(url, data, config);
        }
        catch (e) {
            throw new Error(`Connection failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    };
    let response = await post(body);
    // The model rejects function tools while it is reasoning. It says so itself, so repeat the
    // request with the reasoning switched off and remember the model for the next time.
    if (response.status === 400 &&
        body.reasoning_effort === undefined &&
        /reasoning_effort/.test(errorDetail(response.status, response.data))) {
        needReasoningEffortNone.add(`${params.provider}:${params.model}`);
        response = await post({ ...body, reasoning_effort: 'none' });
    }
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`${errorDetail(response.status, response.data)} (${response.status})`);
    }
    if (params.provider === 'anthropic') {
        return (0, anthropicAdapter_1.translateAnthropicResponseToOpenAI)(response.data);
    }
    const message = response.data?.choices?.[0]?.message;
    return {
        content: message?.content || '',
        ...(message?.tool_calls ? { tool_calls: message.tool_calls } : {}),
    };
}
/**
 * List the models a provider offers — used by the settings "Test connection" button, which also
 * validates the API key.
 *
 * @param params provider, key and (optional) base URL
 * @returns sorted list of model ids
 * @throws {Error} on an invalid key or a connection/API error
 */
async function listModels(params) {
    const { provider, apiKey, baseUrl } = params;
    const headers = { 'Content-Type': 'application/json' };
    let url;
    if (provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/models';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    }
    else if (provider === 'gemini') {
        url = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }
    }
    else if (provider === 'deepseek') {
        url = 'https://api.deepseek.com/models';
        headers.Authorization = `Bearer ${apiKey}`;
    }
    else {
        // openai or custom — a base URL only applies to "custom"; ignore a stale custom URL so OpenAI
        // always lists its models from the official endpoint.
        url = `${(provider === 'custom' && baseUrl) || OPENAI_BASE}/models`;
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }
    }
    let response;
    try {
        response = await axios_1.default.get(url, {
            headers,
            timeout: params.timeoutMs ?? 10_000,
            validateStatus: () => true,
            httpsAgent: httpsAgentFor(url, provider === 'custom' && params.allowSelfSignedCerts),
        });
    }
    catch (e) {
        throw new Error(`Connection failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (response.status === 401) {
        throw new Error('Invalid API key (401)');
    }
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`${errorDetail(response.status, response.data)} (${response.status})`);
    }
    const list = (response.data?.data || []);
    return list
        .map(m => (m.id?.startsWith('models/') ? m.id.substring(7) : m.id))
        .filter((id) => !!id)
        .sort();
}
//# sourceMappingURL=llmProvider.js.map