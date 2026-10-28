import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (_req, res) => {
  res.json({ configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'coloque_sua_chave_aqui'), model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' });
});

app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'Envie pelo menos uma mensagem.' });
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'coloque_sua_chave_aqui') {
    return res.status(503).json({ error: 'A IA ainda não está conectada. Configure OPENAI_API_KEY no arquivo .env e reinicie o servidor.' });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt || 'Você é JARVIS, um assistente útil, claro, proativo e respeitoso. Responda em português brasileiro por padrão.' },
          ...messages.slice(-24).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) }))
        ],
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'A API de IA retornou um erro.' });
    res.json({ reply: data.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Não foi possível conectar à IA. Verifique sua conexão e tente novamente.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`JARVIS disponível em http://localhost:${port}`));
