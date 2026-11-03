import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORIES = [
  "b2b_lead",
  "b2c_lead",
  "pre_sales_question",
  "support_issue",
  "complaint_refund",
  "spam",
  "job_seeker",
  "other",
];
const PRIORITIES = ["urgent", "high", "normal", "low"];

const SYSTEM_PROMPT = `You triage incoming enquiries for a training company. Messages are in Bangla (Bangla script), Banglish (Bangla written in English letters) or English.

Return ONLY a JSON object, no markdown, no commentary, with exactly these keys:
{
  "language": "bn" | "banglish" | "en",
  "category": one of ${JSON.stringify(CATEGORIES)},
  "summary": "one short English sentence",
  "lead_score": integer 0-100 (only meaningful for b2b_lead and b2c_lead, otherwise 0),
  "score_reason": "one short English sentence",
  "priority": one of ${JSON.stringify(PRIORITIES)},
  "entities": {
    "person": string|null, "role": string|null, "organisation": string|null,
    "headcount": number|null, "product_interest": string|null,
    "payment_method": string|null, "callback_time": string|null, "deadline": string|null
  },
  "needs_human": boolean,
  "flags": array of strings from ["possible_minor","legal_or_reputation_threat","unverified_claim","payment_problem","duplicate_contact"],
  "recommended_next_action": "one short English sentence for the sales/support team",
  "suggested_reply": string|null,
  "confidence": number 0-1
}

Category rules:
- b2b_lead: a company or organisation asking about training for staff or a team. Highest lead scores; mention headcount and organisation.
- b2c_lead: an individual who wants to enrol or asks about price, discounts, instalments or fit for a course.
- pre_sales_question: general questions (format, location, refund policy, certificates) with no clear intent to buy yet.
- support_issue: an existing customer with a problem (for example payment made but no confirmation). Not a lead.
- complaint_refund: an unhappy customer asking for a refund or threatening to complain. Always priority "urgent" and needs_human true.
- spam: irrelevant promotions or scams. suggested_reply must be null.
- job_seeker: someone asking for a job. Not a lead; reply politely pointing to the careers contact.
- other: anything else.

Safety rules:
- NEVER invent prices, discounts, dates, policies, locations, certificates or government approvals. If you do not know a fact, say the team will confirm it. Do not use placeholder numbers.
- If the facts needed to answer are not in the message (for example "is it government approved?"), set needs_human true and flag "unverified_claim".
- If the sender says they are in school or under 18, flag "possible_minor", set needs_human true, and keep the reply neutral and friendly.
- For complaint_refund and support_issue, the reply is only a short, empathetic acknowledgement draft that a human will review.
- suggested_reply must be written in the sender's own language and script (Bangla script for Bangla, Banglish for Banglish, English for English), short and polite.
- Priority guide: urgent = angry customer or payment problem; high = B2B lead or ready-to-buy individual; normal = ordinary question; low = spam, job seeker, vague.`;

function normalize(raw) {
  const entities = raw.entities ?? {};
  return {
    language: raw.language ?? "en",
    category: CATEGORIES.includes(raw.category) ? raw.category : "other",
    summary: raw.summary ?? "",
    lead_score: Math.max(
      0,
      Math.min(100, Math.round(Number(raw.lead_score) || 0)),
    ),
    score_reason: raw.score_reason ?? "",
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : "normal",
    entities: {
      person: entities.person ?? null,
      role: entities.role ?? null,
      organisation: entities.organisation ?? null,
      headcount: entities.headcount ?? null,
      product_interest: entities.product_interest ?? null,
      payment_method: entities.payment_method ?? null,
      callback_time: entities.callback_time ?? null,
      deadline: entities.deadline ?? null,
    },
    needs_human: Boolean(raw.needs_human),
    flags: Array.isArray(raw.flags) ? raw.flags : [],
    recommended_next_action: raw.recommended_next_action ?? "",
    suggested_reply: raw.suggested_reply ?? null,
    confidence: Number(raw.confidence) || 0,
  };
}

export async function classifyEnquiry(enquiry) {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: JSON.stringify({
      channel: enquiry.channel,
      received_at: enquiry.received_at,
      sender_name: enquiry.sender_name,
      phone: enquiry.phone || null,
      message: enquiry.message,
    }),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const clean = response.text.replace(/```json|```/g, "").trim();
  return normalize(JSON.parse(clean));
}
