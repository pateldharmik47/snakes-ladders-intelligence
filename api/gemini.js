export default async function handler(req, res) {
  // CORS Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or restrict to specific domains in prod
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Payload Validation Security
  if (!req.body || typeof req.body !== 'object' || !req.body.contents) {
    return res.status(400).json({ error: 'Bad Request: Invalid payload structure. Expected contents array.' });
  }

  // Restrict payload sizes to prevent Denial-of-Wallet attacks
  const rawBody = JSON.stringify(req.body);
  if (rawBody.length > 50000) {
    return res.status(413).json({ error: 'Payload Too Large' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key.' });
  }

  // Set up the API URL explicitly here securely
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      // Proxy the identical request body constructed by the frontend
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      // Return upstream error status
      return res.status(response.status).json(data);
    }

    // Success
    return res.status(200).json(data);
  } catch (error) {
    console.error('Vercel Serverless Error:', error);
    return res.status(500).json({ error: 'Internal server error while connecting to Gemini API.' });
  }
}
