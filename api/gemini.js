export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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
