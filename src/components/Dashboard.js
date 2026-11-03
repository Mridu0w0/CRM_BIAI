"use client";

import { useMemo, useState } from "react";

const CATEGORY_LABELS = {
  b2b_lead: "B2B lead",
  b2c_lead: "B2C lead",
  pre_sales_question: "Pre-sales question",
  support_issue: "Support issue",
  complaint_refund: "Complaint / refund",
  spam: "Spam",
  job_seeker: "Job seeker",
  other: "Other",
};

const PRIORITY_STYLES = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

function scoreStyle(score) {
  if (score >= 70) return "bg-green-100 text-green-700";
  if (score >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function Badge({ className, children }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export default function Dashboard({ items }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "all") return true;
        if (filter === "needs_human") return item.ai?.needs_human;
        return item.ai?.category === filter;
      }),
    [items, filter],
  );

  const chips = [
    ["all", "All"],
    ["needs_human", "Needs human"],
    ...Object.entries(CATEGORY_LABELS),
  ];

  async function copyReply(text) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === value
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Sender</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Category</th>
                <th className="p-3">Score</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Human?</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${
                    selected?.id === item.id ? "bg-gray-50" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="font-medium">{item.sender_name}</div>
                    <div className="max-w-xs truncate text-xs text-gray-500">
                      {item.ai?.summary}
                    </div>
                  </td>
                  <td className="p-3">{item.channel}</td>
                  <td className="p-3">
                    {CATEGORY_LABELS[item.ai?.category] ?? "Other"}
                  </td>
                  <td className="p-3">
                    <Badge className={scoreStyle(item.ai?.lead_score ?? 0)}>
                      {item.ai?.lead_score ?? 0}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={PRIORITY_STYLES[item.ai?.priority]}>
                      {item.ai?.priority}
                    </Badge>
                  </td>
                  <td className="p-3">{item.ai?.needs_human ? "Yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {!selected ? (
            <p className="text-sm text-gray-500">
              Click an enquiry to see details and the suggested reply.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-lg font-semibold">
                  {selected.sender_name}
                </div>
                <div className="text-gray-500">
                  {selected.channel} · {selected.phone ?? "no phone"} ·{" "}
                  {selected.received_at}
                </div>
                {selected.contact_enquiry_count > 1 && (
                  <div className="mt-1 text-orange-700">
                    Repeat contact: {selected.contact_enquiry_count} enquiries
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 font-medium">Original message</div>
                <p className="rounded bg-gray-50 p-3">{selected.message}</p>
              </div>

              <div>
                <div className="mb-1 font-medium">AI insight</div>
                <p>{selected.ai?.score_reason}</p>
                <p className="mt-1">
                  <span className="font-medium">Next action:</span>{" "}
                  {selected.ai?.recommended_next_action}
                </p>
                {selected.ai?.flags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.ai.flags.map((flag) => (
                      <Badge key={flag} className="bg-red-100 text-red-700">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 font-medium">Extracted details</div>
                <ul className="space-y-0.5 text-gray-700">
                  {Object.entries(selected.ai?.entities ?? {})
                    .filter(([, value]) => value !== null)
                    .map(([key, value]) => (
                      <li key={key}>
                        <span className="text-gray-500">{key}:</span>{" "}
                        {String(value)}
                      </li>
                    ))}
                </ul>
              </div>

              <div>
                <div className="mb-1 font-medium">Suggested reply (draft)</div>
                {selected.ai?.suggested_reply ? (
                  <>
                    <p className="whitespace-pre-wrap rounded bg-blue-50 p-3">
                      {selected.ai.suggested_reply}
                    </p>
                    <button
                      onClick={() => copyReply(selected.ai.suggested_reply)}
                      className="mt-2 rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                    >
                      {copied ? "Copied" : "Copy reply"}
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500">No reply suggested.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
