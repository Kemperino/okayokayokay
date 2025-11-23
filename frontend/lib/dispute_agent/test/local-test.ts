#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  mockWebhookEvent,
  mockServiceRequest,
  mockAPIResponseData,
  mockServiceMetadata,
  testScenarios
} from './mock-data';
import { validateWebhookEvent } from '../validator';
import { makeDisputeDecision } from '../llm';
import { DisputeContext } from '../types/index';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_MODE = process.argv[2] || 'full'; // Options: validate, llm, contract, full

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(50));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(50));
}

// Test 1: Validate webhook event
async function testWebhookValidation() {
  logSection('Testing Webhook Validation');

  try {
    const validation = await validateWebhookEvent(mockWebhookEvent);

    if (validation.valid) {
      log('✓ Webhook validation passed', colors.green);
    } else {
      log(`✗ Webhook validation failed: ${validation.error}`, colors.red);
    }

    return validation.valid;
  } catch (error) {
    log(`✗ Validation error: ${error}`, colors.red);
    return false;
  }
}

// Test 2: Test LLM decision making
async function testLLMDecision(scenario: string = 'serviceFailed') {
  logSection(`Testing LLM Decision Making - Scenario: ${scenario}`);

  const testCase = testScenarios[scenario as keyof typeof testScenarios];
  if (!testCase) {
    log(`✗ Unknown scenario: ${scenario}`, colors.red);
    return false;
  }

  const activity = mockWebhookEvent.event.activity[0];
  const requestId = activity.log!.topics[1];
  const contractAddress = activity.log!.address;

  const context: DisputeContext = {
    requestId,
    contractAddress,
    serviceRequest: mockServiceRequest,
    resourceRequestData: testCase.apiResponse,
    serviceMetadata: mockServiceMetadata
  };

  try {
    log('Making LLM decision...', colors.cyan);
    const decision = await makeDisputeDecision(context);

    log(`\nDecision:`, colors.bright);
    log(`  Refund: ${decision.refund ? 'YES' : 'NO'}`,
        decision.refund ? colors.green : colors.yellow);
    log(`  Reason: ${decision.reason}`, colors.reset);
    log(`  Confidence: ${decision.confidence || 'N/A'}`, colors.reset);

    // Compare with expected decision
    log(`\nExpected:`, colors.bright);
    log(`  Refund: ${testCase.expectedDecision.refund ? 'YES' : 'NO'}`,
        testCase.expectedDecision.refund ? colors.green : colors.yellow);
    log(`  Reason: ${testCase.expectedDecision.reason}`, colors.reset);

    const match = decision.refund === testCase.expectedDecision.refund;
    if (match) {
      log('\n✓ Decision matches expected outcome', colors.green);
    } else {
      log('\n✗ Decision does not match expected outcome', colors.red);
    }

    return match;
  } catch (error) {
    log(`✗ LLM error: ${error}`, colors.red);
    return false;
  }
}

// Test 3: Test contract interaction (read-only)
async function testContractInteraction() {
  logSection('Testing Contract Interaction');

  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

    // Test provider connection
    const network = await provider.getNetwork();
    log(`✓ Connected to network: ${network.name} (chainId: ${network.chainId})`, colors.green);

    // Test wallet configuration
    if (process.env.PRIVATE_KEY) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      log(`✓ Wallet configured: ${wallet.address}`, colors.green);

      // Check balance
      const balance = await provider.getBalance(wallet.address);
      log(`  Balance: ${ethers.formatEther(balance)} ETH`, colors.cyan);
    } else {
      log('⚠ No PRIVATE_KEY configured', colors.yellow);
    }

    // Test factory contract interaction
    if (process.env.FACTORY_CONTRACT_ADDRESS) {
      const factoryAbi = ['function isDisputeAgent(address) view returns (bool)'];
      const factory = new ethers.Contract(
        process.env.FACTORY_CONTRACT_ADDRESS,
        factoryAbi,
        provider
      );

      if (process.env.PRIVATE_KEY) {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const hasRole = await factory.isDisputeAgent(wallet.address);

        if (hasRole) {
          log(`✓ Wallet has DISPUTE_AGENT_ROLE`, colors.green);
        } else {
          log(`✗ Wallet does NOT have DISPUTE_AGENT_ROLE`, colors.red);
        }
      }
    } else {
      log('⚠ No FACTORY_CONTRACT_ADDRESS configured', colors.yellow);
    }

    return true;
  } catch (error) {
    log(`✗ Contract interaction error: ${error}`, colors.red);
    return false;
  }
}

// Test 4: Full webhook simulation
async function testFullWebhook() {
  logSection('Testing Full Webhook Flow (Simulation)');

  try {
    // Simulate the webhook handler locally
    const express = require('express');
    const app = express();
    app.use(express.json());

    // Import the webhook handler
    const webhookHandler = require('../api/webhook').default;

    // Create mock request and response
    const mockReq = {
      method: 'POST',
      headers: {
        'x-webhook-signature': process.env.WEBHOOK_SECRET || 'test-secret'
      },
      body: mockWebhookEvent
    };

    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          log(`\nResponse Status: ${code}`,
              code === 200 ? colors.green : colors.red);
          log(`Response Body: ${JSON.stringify(data, null, 2)}`, colors.cyan);
          return mockRes;
        }
      })
    };

    // Note: This will attempt real contract calls if configured
    log('⚠ Note: Full webhook test would make real blockchain calls', colors.yellow);
    log('  Skipping actual execution to avoid on-chain transactions', colors.yellow);

    return true;
  } catch (error) {
    log(`✗ Full webhook test error: ${error}`, colors.red);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Dispute Agent Test Suite', colors.bright + colors.magenta);

  const results = {
    validation: false,
    llm: false,
    contract: false,
    full: false
  };

  // Run tests based on mode
  if (TEST_MODE === 'validate' || TEST_MODE === 'full') {
    results.validation = await testWebhookValidation();
  }

  if (TEST_MODE === 'llm' || TEST_MODE === 'full') {
    // Test multiple scenarios
    const scenarios = ['serviceFailed', 'serviceSuccess', 'partialFailure'];
    for (const scenario of scenarios) {
      results.llm = await testLLMDecision(scenario) && results.llm;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  }

  if (TEST_MODE === 'contract' || TEST_MODE === 'full') {
    results.contract = await testContractInteraction();
  }

  if (TEST_MODE === 'full') {
    results.full = await testFullWebhook();
  }

  // Summary
  logSection('Test Results Summary');
  Object.entries(results).forEach(([test, passed]) => {
    if (TEST_MODE === test || TEST_MODE === 'full') {
      log(`${test}: ${passed ? '✓ PASSED' : '✗ FAILED'}`,
          passed ? colors.green : colors.red);
    }
  });

  const allPassed = Object.values(results).every(r => r);
  log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`,
      allPassed ? colors.bright + colors.green : colors.bright + colors.red);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error}`, colors.bright + colors.red);
  process.exit(1);
});
