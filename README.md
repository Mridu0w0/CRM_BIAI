# Enquiry CRM

An AI-assisted CRM dashboard that triages incoming customer enquiries. It reads enquiries from a CSV (WhatsApp, Facebook, website and phone-call notes, in Bangla, Banglish and English), uses an LLM to classify and enrich each one, stores the results in Firestore, and shows them in a Next.js dashboard.

**Live demo:**[(https://crm-biai-seven.vercel.app/)]
**Repository:** [(https://github.com/Mridu0w0/CRM_BIAI)]

> All people and phone numbers in the sample data are fictional.

## What it does

Not every enquiry is a sales lead. The CRM triages first and scores second.

| Category             | Meaning                                                          | Handling                                               |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `b2b_lead`           | A company asking about training for staff                        | Highest priority, headcount and organisation extracted |
| `b2c_lead`           | An individual asking about enrolment, price or instalments       | Scored by buying intent                                |
| `pre_sales_question` | General questions with no clear intent to buy yet                | Reply drafted where the answer is safe                 |
| `support_issue`      | An existing customer with a problem (e.g. payment not confirmed) | Urgent, routed to a human                              |
| `complaint_refund`   | An unhappy customer or refund request                            | Urgent, routed to a human                              |
| `spam`               | Irrelevant promotions                                            | No reply                                               |
| `job_seeker`         | Someone asking for a job                                         | Not a lead, polite redirect drafted                    |
| `other`              | Anything else                                                    | Normal priority                                        |

For each enquiry the AI returns:

- language (Bangla, Banglish or English)
- category, one-line summary and priority (`urgent`, `high`, `normal`, `low`)
- lead score (0 to 100) with a reason
- extracted details: person, role, organisation, headcount, product interest, payment method, callback time, deadline
- flags such as `possible_minor`, `legal_or_reputation_threat`, `unverified_claim`, `payment_problem`
- a `needs_human` marker, a recommended next action and a **draft** reply in the sender's own language

Replies are drafts only. Nothing is sent automatically.

## Tech stack

- **Next.js** (App Router, JavaScript) and **Tailwind CSS** for the dashboard
- **Firebase Cloud Firestore** (via the Firebase Admin SDK, server-side only) for storage
- **Google Gemini** (Flash model) for classification and extraction
- **csv-parse** to read the CSV
- **Vercel** for deployment

## How it works

```
data/sample-enquiries.csv
        |
        v
scripts/ingest.js  --->  LLM classifies each row  --->  Firestore "enquiries" collection
                                                                |
                                                                v
                                       Next.js dashboard (src/app/page.js) reads Firestore
```

Design decisions:

- **Idempotent ingestion:** the CSV `id` is the Firestore document ID, so running ingestion twice never creates duplicates. Already-saved rows are skipped unless you pass `--force`.
- **Repeat contacts:** phone numbers are normalised into a `contact_key` (falling back to name and channel), and each document stores `contact_enquiry_count`, so repeat enquiries from the same person are visible.
- **Validated AI output:** the model must return JSON only. A `normalize` step forces valid categories and priorities, clamps the score to 0 to 100 and fills missing keys, so the dashboard never breaks on a bad response.
- **No invented facts:** the prompt forbids making up prices, policies, dates or approvals. Questions that need facts the system doesn't have are marked `needs_human`.
- **Retries:** ingestion retries a row a few times when the model API is temporarily overloaded.

## Project structure

```
enquiry-crm/
├── data/
│   └── sample-enquiries.csv
├── scripts/
│   └── ingest.js            # CSV -> AI -> Firestore
├── src/
│   ├── app/
│   │   └── page.js          # Server component: reads Firestore
│   ├── components/
│   │   └── Dashboard.js     # Filters, table, detail panel
│   └── lib/
│       ├── firebase.js      # Firestore admin connection
│       └── classify.js      # Prompt, LLM call, output validation
├── .env.local               # Secrets (never committed)
└── package.json
```

Adjust the paths above if your folders differ.

## Getting started

### Prerequisites

- Node.js 20.6 or newer
- A Firebase project with Firestore created
- A Google AI Studio API key (Gemini)

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GEMINI_API_KEY=your-gemini-key
```

The three Firebase values come from a service account key (Firebase console, Project settings, Service accounts, Generate new private key). Paste the private key on one line, in double quotes, keeping the `\n` characters. Never commit this file or the downloaded JSON key.

### 3. Ingest the sample data

```bash
npm run ingest
```

You should see one line per enquiry, such as `#16 -> complaint_refund (score 0, urgent)`. Run it again if any rows fail because of temporary API errors. Finished rows are skipped. To re-classify everything after changing the prompt:

```bash
npm run ingest -- --force
```

### 4. Run the dashboard

```bash
npm run dev
```

Open http://localhost:3000.

## Dashboard

- Filter chips by category, plus a **Needs human** filter
- Table sorted by priority, then lead score, with score and priority badges
- Detail panel with the original message, AI insight, flags, extracted details and the suggested reply with a copy button

## Deployment

1. Push the repository to GitHub (make sure `.env.local` is not included).
2. Import the repo in Vercel.
3. Add the same four environment variables before deploying.
4. Deploy. The dashboard reads the data already stored in Firestore, so ingestion does not need to run on Vercel.

## Limitations

- **Mixed-language messages:** Banglish and mixed-script text can be misread, and the AI can misjudge tone, sarcasm or very short messages.
- **No product knowledge:** the system has no pricing, policy or certificate documents, so draft replies cannot state real prices or confirm claims.
- **Lead scores are judgment calls:** they are not tuned against real conversion data, so treat them as a ranking aid.
- **Human review is required** for complaints, payment problems, possible minors and unverified claims.
- **No authentication:** the dashboard is open, which is fine for fictional demo data but not for real customers.

## Next steps

- Retrieval-augmented generation (RAG) over company documents so replies can use real prices, policies and FAQs
- Editable status, owner and notes per enquiry
- Login and role-based access
- Sending approved replies through WhatsApp, Messenger or email
- Evaluation set of labelled enquiries to measure classification accuracy
