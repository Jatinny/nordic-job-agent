export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, prompt, query, country, page, salary_min, date_posted } = req.body;

  // ── ADZUNA job search ──────────────────────────────────────────
  if (type === 'jobs') {
    const ADZUNA_ID  = process.env.ADZUNA_APP_ID;
    const ADZUNA_KEY = process.env.ADZUNA_APP_KEY;
    if (!ADZUNA_ID || !ADZUNA_KEY) {
      return res.status(500).json({ error: 'Adzuna credentials not set in environment variables' });
    }

    // Adzuna country codes
    const CC = { Netherlands: 'nl', Sweden: 'se', Finland: 'fi', Germany: 'de', UK: 'gb' };
    const cc = CC[country] || 'nl';
    const pageNum = page || 1;

    const params = new URLSearchParams({
      app_id: ADZUNA_ID,
      app_key: ADZUNA_KEY,
      results_per_page: 10,
      what: query || 'Java Backend Engineer',
      content_type: 'application/json',
      ...(salary_min ? { salary_min } : {}),
      ...(date_posted ? { days_old: date_posted } : {})
    });

    const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/${pageNum}?${params}`;

    try {
      const r = await fetch(url);
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: 'Adzuna error', detail: data });
      return res.status(200).json({ jobs: data.results || [], total: data.count || 0 });
    } catch (e) {
      return res.status(500).json({ error: 'Adzuna fetch failed', detail: e.message });
    }
  }

  // ── Groq AI (cover letter / resume / linkedin) ─────────────────
  if (type === 'ai') {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set' });
    }
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 8000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const gd = await gr.json();
      if (!gr.ok) return res.status(gr.status).json({ error: 'Groq error', detail: gd });
      const text = gd.choices?.[0]?.message?.content || '';
      return res.status(200).json({ content: [{ type: 'text', text }] });
    } catch (e) {
      return res.status(500).json({ error: 'Groq error', detail: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid request type. Use "jobs" or "ai".' });
}
