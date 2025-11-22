-- Seed file for local development
-- This file contains sample data for testing

-- Insert sample x402 resource
INSERT INTO resources (name, description, base_url, well_known_url, is_active)
VALUES
  (
    'WindyBay Weather',
    'Mock weather API providing weather data for any location and date. Returns temperature, conditions, humidity, and wind speed. Costs $0.01 USDC per request.',
    'https://windybay.okay3.xyz',
    'https://windybay.okay3.xyz/.well-known/x402',
    true
  )
ON CONFLICT DO NOTHING;
