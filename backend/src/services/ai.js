const { openAiApiKey, openAiModel } = require('../config/env');

async function summarizeExpenseNote(text) {
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openAiApiKey
    },
    body: JSON.stringify({
      model: openAiModel,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente financiero que resume observaciones de gastos en español de forma clara y breve.'
        },
        {
          role: 'user',
          content: `Resume este texto en 2-3 viñetas con recomendaciones prácticas:\n\n${text}`
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error('Fallo al consultar API de IA');
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || '';
}

module.exports = { summarizeExpenseNote };
