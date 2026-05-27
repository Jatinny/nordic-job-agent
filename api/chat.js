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
      return res.status(500).json({ error: 'ADZUNA_APP_ID or ADZUNA_APP_KEY not set' });
    }

    const CC = { Netherlands: 'nl', Sweden: 'se', Finland: 'fi' };
    const cc = CC[country] || 'nl';
    const pageNum = page || 1;

    let url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/${pageNum}`;
    url += `?app_id=${ADZUNA_ID}`;
    url += `&app_key=${ADZUNA_KEY}`;
    url += `&results_per_page=10`;
    url += `&what=${encodeURIComponent(query || 'Java Backend Engineer')}`;
    url += `&sort_by=date`;
    if (salary_min) url += `&salary_min=${salary_min}`;
    if (date_posted) url += `&days_old=${date_posted}`;

    try {
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      const text = await r.text();

      // Return full debug info so we can see exactly what Adzuna sends
      if (!text.startsWith('{') && !text.startsWith('[')) {
        return res.status(500).json({
          error: 'Adzuna non-JSON response',
          status: r.status,
          headers: Object.fromEntries(r.headers.entries()),
          body: text.substring(0, 500),
          url: url.replace(ADZUNA_KEY, '***')
        });
      }

      const data = JSON.parse(text);
      if (!r.ok) return res.status(r.status).json({ error: 'Adzuna error', detail: data });
      return res.status(200).json({ jobs: data.results || [], total: data.count || 0 });

    } catch (e) {
      return res.status(500).json({ error: 'Adzuna fetch failed', detail: e.message });
    }
  }

  // ── Groq AI ────────────────────────────────────────────────────
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

  return res.status(400).json({ error: 'Invalid type. Use "jobs" or "ai".' });
}
