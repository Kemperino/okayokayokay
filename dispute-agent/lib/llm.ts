import OpenAI from 'openai';
import { DisputeContext, LLMDecision } from '../types';
import { formatAmount } from './blockchain';
import { formatMetadataForPrompt } from './metadata';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Default system prompt for dispute resolution
const DEFAULT_SYSTEM_PROMPT = `You are an impartial dispute resolution agent for a decentralized payment platform. Your role is to analyze disputes between buyers and service providers regarding API service delivery.

When evaluating disputes, consider:
1. Whether the service provider delivered what was promised
2. Whether the API response data matches the expected service quality
3. Whether there were technical errors or service failures
4. Whether the buyer's complaint is reasonable and justified
5. The severity and impact of any issues identified

You must respond with a JSON object containing:
- "refund": boolean (true if buyer should be refunded, false if payment should go to seller)
- "reason": string (a brief explanation of your decision, max 200 characters)
- "confidence": number (0-1 scale indicating your confidence in the decision)

Be fair and objective. Look for clear evidence of service failure or success. If the evidence is ambiguous, lean towards the party that appears to have acted in good faith.`;

/**
 * Makes a dispute decision using the LLM
 */
export async function makeDisputeDecision(context: DisputeContext): Promise<LLMDecision> {
  try {
    // Prepare the user prompt with dispute context
    const userPrompt = prepareUserPrompt(context);

    // Make the LLM call
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent decisions
      max_tokens: 500
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from LLM');
    }

    const decision = JSON.parse(responseContent) as LLMDecision;

    // Validate the response structure
    if (typeof decision.refund !== 'boolean') {
      throw new Error('Invalid LLM response: missing or invalid refund field');
    }
    if (!decision.reason || typeof decision.reason !== 'string') {
      throw new Error('Invalid LLM response: missing or invalid reason field');
    }

    // Ensure reason is not too long
    if (decision.reason.length > 200) {
      decision.reason = decision.reason.substring(0, 197) + '...';
    }

    // Set default confidence if not provided
    if (typeof decision.confidence !== 'number') {
      decision.confidence = 0.85; // Default confidence
    }

    return decision;
  } catch (error) {
    console.error('Error making LLM decision:', error);

    // Fallback decision in case of error
    // Conservative approach: refund the buyer if we can't make a decision
    return {
      refund: true,
      reason: 'Unable to make automated decision - defaulting to buyer refund',
      confidence: 0.0
    };
  }
}

/**
 * Prepares the user prompt with dispute context
 */
function prepareUserPrompt(context: DisputeContext): string {
  const { serviceRequest, apiResponseData, serviceMetadata } = context;

  // Format the amount for readability
  const amount = formatAmount(serviceRequest.amount);

  // Format service metadata
  const metadataSection = formatMetadataForPrompt(serviceMetadata);

  // Build the prompt
  const prompt = `
DISPUTE DETAILS:
================
Request ID: ${context.requestId}
Buyer Address: ${serviceRequest.buyer}
Amount: ${amount} USDC
Service Provider: ${apiResponseData.service_provider}
Timestamp: ${apiResponseData.timestamp}

SERVICE INFORMATION:
====================
${metadataSection}

SERVICE REQUEST DATA:
=====================
${JSON.stringify(apiResponseData.request_data, null, 2)}

API RESPONSE DATA:
==================
${JSON.stringify(apiResponseData.response_data, null, 2)}

DISPUTE STATUS:
===============
- Buyer opened dispute within the allowed time window
- Seller either rejected the refund request or did not respond
- Buyer escalated the dispute for agent resolution

Please analyze the above information and determine whether the buyer should receive a refund or the payment should go to the service provider. Consider:
1. Whether the service was delivered as described in the service metadata
2. Whether the API response data indicates successful service delivery
3. Whether any failures or errors justify a refund
4. Whether the service met the expectations set by its description

Provide your decision in the required JSON format.`;

  return prompt;
}

/**
 * Gets a custom system prompt if configured
 */
export function getSystemPrompt(): string {
  return process.env.CUSTOM_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
}

/**
 * Validates that the LLM decision is reasonable
 */
export function validateDecision(decision: LLMDecision, context: DisputeContext): boolean {
  // Basic validation checks
  if (decision.confidence && decision.confidence < 0.5) {
    console.warn('Low confidence decision:', decision.confidence);
  }

  // Check if the amount is within acceptable limits
  const maxAmount = parseFloat(process.env.MAX_DISPUTE_AMOUNT_USD || '10000');
  const amountUSD = parseFloat(formatAmount(context.serviceRequest.amount));

  if (amountUSD > maxAmount) {
    console.warn(`Dispute amount ${amountUSD} exceeds max limit ${maxAmount}`);
    return false;
  }

  return true;
}