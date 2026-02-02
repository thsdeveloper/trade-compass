import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OPENAI_API_KEY not configured - Agent features will not work');
}

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
