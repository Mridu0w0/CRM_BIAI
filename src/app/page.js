import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/firebase";
import Dashboard from "@/components/Dashboard";

const RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

async function EnquiryList() {
  await connection();

  const snap = await db.collection("enquiries").get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  items.sort(
    (a, b) =>
      (RANK[a.ai?.priority] ?? 9) - (RANK[b.ai?.priority] ?? 9) ||
      (b.ai?.lead_score ?? 0) - (a.ai?.lead_score ?? 0),
  );

  return (
    <>
      <p className="mb-6 text-sm text-gray-500">
        {items.length} enquiries, triaged by AI
      </p>
      <Dashboard items={items} />
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold">Enquiry CRM</h1>
      <Suspense
        fallback={<p className="text-sm text-gray-500">Loading enquiries...</p>}
      >
        <EnquiryList />
      </Suspense>
    </main>
  );
}
