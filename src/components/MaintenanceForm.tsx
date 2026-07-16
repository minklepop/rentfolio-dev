"use client";

import { useState, useRef } from "react";
import { Field, inputCls, btnPrimary, btnSecondary } from "./ui";
import { PRIORITIES, MAINTENANCE_CATEGORIES } from "@/lib/constants";
import AiFeedback from "./AiFeedback";

type Unit = { id: string; label: string; property: { name: string } };

type Props = {
  units: Unit[];
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  isLandlord?: boolean;
};

type Suggestion = { category: string; priority: string; reason: string; decisionId?: string };

export default function MaintenanceForm({ units, action, submitLabel = "Submit request", isLandlord = false }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("NORMAL");
  const formRef = useRef<HTMLFormElement>(null);

  async function suggest() {
    if (!title && !description) return;
    setSuggesting(true);
    try {
      const res = await fetch("/maintenance/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (data.category && data.priority) {
        setSuggestion(data);
        setCategory(data.category);
        setPriority(data.priority);
      }
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {units.length > 1 && (
        <Field label="Unit">
          <select name="unitId" required className={inputCls}>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.property.name}, {u.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      {units.length === 1 && (
        <input type="hidden" name="unitId" value={units[0].id} />
      )}

      <Field label={isLandlord ? "Title" : "What's the issue?"}>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="Leaking kitchen faucet"
        />
      </Field>

      <Field label={isLandlord ? "Description" : "Details"}>
        <textarea
          name="description"
          rows={4}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder={isLandlord ? "" : "When did it start? Where exactly? Anything you've tried?"}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={suggest}
          disabled={suggesting || (!title && !description)}
          className={`${btnSecondary} disabled:opacity-50`}
        >
          {suggesting ? "Analysing…" : "✦ AI suggest category & priority"}
        </button>
      </div>

      {suggestion && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <p className="font-medium">AI suggestion</p>
          <p className="mt-0.5 text-indigo-600">{suggestion.reason}</p>
          <p className="mt-1 text-xs text-indigo-500">Category and priority pre-filled below, override if needed.</p>
          <div className="mt-3"><AiFeedback decisionId={suggestion.decisionId ?? null} /></div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {MAINTENANCE_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label={isLandlord ? "Priority" : "How urgent is it?"}>
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputCls}
          >
            {PRIORITIES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </div>

      <button type="submit" className={btnPrimary}>
        {submitLabel}
      </button>
    </form>
  );
}
