// support-chat-server.js — OpenAI-driven assistant + Airtable tool
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Airtable from 'airtable';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ----- OpenAI -----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `
You are Rollupim's friendly support assistant.
- Greet warmly on first contact; keep replies concise and helpful.
- Detect Hebrew vs. English and reply in the user's language.
- Main goals:
  1) Help with order status and docs.
  2) If the user provides an order number, email or phone, call getOrderStatus.
  3) If not provided, ask politely for ONE identifier (order number OR email OR phone).
- Never invent data. If a record isn't found, say so and ask for a different identifier.
- Use short paragraphs and bullets when helpful. Use an emoji occasionally.
- If the user just says "hi"/"שלום" etc., greet and explain how to check status.
`.trim();

// Tool schema the model can call
const tools = [
  {
    type: 'function',
    function: {
      name: 'getOrderStatus',
      description:
        'Lookup order status in Airtable by orderId, email, or phone (any one is enough). Returns status and doc links if found.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order number (digits/letters as used in Airtable)' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number, preferably including country code' }
        },
        additionalProperties: false
      }
    }
  }
];

// ----- Airtable -----
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);
const STATUS_TABLE = process.env.AIRTABLE_STATUS_TABLE || 'Full View';

const F = {
  ORDER_ID: process.env.AIRTABLE_F_ORDER_ID || 'Order ID',
  EMAIL: process.env.AIRTABLE_F_EMAIL || 'Email',
  PHONE: process.env.AIRTABLE_F_PHONE || 'Phone',
  STATUS: process.env.AIRTABLE_F_STATUS || 'Status',
  LAST_UPDATE: process.env.AIRTABLE_F_LAST_UPDATE || 'Last Update',
  INVOICE_URL: process.env.AIRTABLE_F_INVOICE_URL || 'Invoice URL',
  DELIVERY_URL: process.env.AIRTABLE_F_DELIVERY_URL || 'Delivery Cert URL'
};

async function findOrder({ orderId, email, phone }) {
  const clauses = [];
  if (orderId) clauses.push(`{${F.ORDER_ID}} = '${orderId.replace(/'/g, "''")}'`);
  if (email) clauses.push(`LOWER({${F.EMAIL}}) = '${email.toLowerCase().replace(/'/g, "''")}'`);
  if (phone) {
    const normalized = phone.replace(/\s+/g, '');
    clauses.push(`SUBSTITUTE({${F.PHONE}}, ' ', '') = '${normalized.replace(/'/g, "''")}'`);
  }

  if (!clauses.length) return null;

  const filterByFormula = clauses.join(' OR ');
  const recs = await base(STATUS_TABLE).select({ maxRecords: 5, filterByFormula }).all();
  if (!recs.length) return null;

  const r = recs[0];
  return {
    orderId: r.get(F.ORDER_ID) || r.id,
    status: r.get(F.STATUS) || 'Unknown',
    lastUpdate: r.get(F.LAST_UPDATE) || null,
    invoiceUrl: r.get(F.INVOICE_URL) || null,
    deliveryCertUrl: r.get(F.DELIVERY_URL) || null
  };
}

// Tool implementation the server will run if the model calls it
async function getOrderStatusTool(args = {}) {
  const result = await findOrder(args);
  if (!result) return { found: false };
  return { found: true, ...result };
}

// ----- Chat route -----
// Minimal stateless turn: we send system + user; model can call the tool; we respond.
app.post('/api/chat', async (req, res) => {
  const userText = String(req.body?.text || '').trim();

  try {
    // First pass: allow tool calling
    let response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText }
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2
    });

    let msg = response.choices[0].message;

    // If model called a tool, run it and send results back to the model for a final, friendly reply
    if (msg.tool_calls?.length) {
      const call = msg.tool_calls[0];
      const name = call.function?.name;
      const args = safeParseJSON(call.function?.arguments);

      let toolResult = {};
      if (name === 'getOrderStatus') {
        toolResult = await getOrderStatusTool(args);
      }

      // Second pass: give the tool result so the model can phrase the final answer nicely
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
          msg, // the tool call message
          {
            role: 'tool',
            tool_call_id: call.id,
            name,
            content: JSON.stringify(toolResult)
          }
        ],
        temperature: 0.2
      });
      msg = response.choices[0].message;
    }

    // Return final assistant text
    const finalText = msg.content || 'סליחה, לא הצלחתי להבין. אפשר לנסח שוב?';
    return res.json({ reply: finalText });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ reply: 'תקלה זמנית. נסו שוב בעוד רגע.' });
  }
});

function safeParseJSON(s) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

// ----- Start -----
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Support server (assistant mode) on :${port}`));
// Health check
app.get('/api/ping', (req, res) => {
  res.type('text/plain').send('pong');
});