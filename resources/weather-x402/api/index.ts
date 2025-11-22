import express from 'express';
import { paymentMiddleware } from 'x402-express';
import { facilitator } from '@coinbase/x402';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const payTo = process.env.ADDRESS as `0x${string}`;

if (!payTo) {
  throw new Error('Missing required environment variable: ADDRESS');
}

const app = express();

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(
  paymentMiddleware(
    payTo,
    {
      'GET /weather': {
        price: '$0.01',
        network: 'base',
      },
    },
    facilitator
  )
);

// Mock weather data generator
function generateMockWeather(location: string, date: string) {
  const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy', 'stormy', 'snowy'];
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const seed = hashCode(location + date);
  const conditionIndex = seed % conditions.length;
  const temperature = 32 + (seed % 68);
  const humidity = 30 + (seed % 70);
  const windSpeed = seed % 30;

  return {
    location,
    date,
    conditions: conditions[conditionIndex],
    temperature,
    temperatureUnit: 'F',
    humidity,
    windSpeed,
    windSpeedUnit: 'mph',
  };
}

// x402 metadata endpoint
app.get('/.well-known/x402', (req, res) => {
  // Dynamically construct the resource URL based on the request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const resourceUrl = `${protocol}://${host}/weather`;

  res.json({
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: '10000', // 0.01 USDC (6 decimals)
        resource: resourceUrl,
        description:
          'Mock weather API providing weather data for any location and date. Returns temperature, conditions, humidity, and wind speed.',
        mimeType: 'application/json',
        payTo,
        maxTimeoutSeconds: 60,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        outputSchema: {
          input: {
            type: 'http',
            method: 'GET',
            discoverable: true,
            queryParams: {
              location: {
                type: 'string',
                description: 'City or location name for weather data (e.g., "San Francisco", "Tokyo")',
                required: true,
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format for weather data',
                required: true,
              },
            },
          },
          output: {
            report: {
              type: 'object',
              description: 'Weather report data',
              properties: {
                location: {
                  type: 'string',
                  description: 'The queried location',
                },
                date: {
                  type: 'string',
                  description: 'The queried date',
                },
                conditions: {
                  type: 'string',
                  description: 'Weather conditions (e.g., sunny, cloudy, rainy)',
                },
                temperature: {
                  type: 'number',
                  description: 'Temperature value',
                },
                temperatureUnit: {
                  type: 'string',
                  description: 'Temperature unit (F for Fahrenheit)',
                },
                humidity: {
                  type: 'number',
                  description: 'Humidity percentage',
                },
                windSpeed: {
                  type: 'number',
                  description: 'Wind speed value',
                },
                windSpeedUnit: {
                  type: 'string',
                  description: 'Wind speed unit (mph)',
                },
              },
            },
          },
        },
        extra: {
          name: 'USD Coin',
          version: '2',
        },
      },
    ],
  });
});

app.get('/weather', (req, res) => {
  const location = req.query.location as string;
  const date = req.query.date as string;

  if (!location || !date) {
    return res.status(400).send({
      error: 'Missing required parameters: location and date',
    });
  }

  const weatherData = generateMockWeather(location, date);

  res.send({
    report: weatherData,
  });
});

// Export handler for Vercel serverless
export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore - Express types don't match Vercel exactly but work fine
  return app(req, res);
}
