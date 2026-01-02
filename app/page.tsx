"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [records, setRecords] = useState<Array<Schema["Records"]["type"]>>(
    []
  );
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  function listRecords() {
    client.models.Records.observeQuery().subscribe({
      next: (data) => setRecords([...data.items]),
    });
  }

  useEffect(() => {
    listRecords();
  }, []);

  async function createRecord() {
    const parsed = parseFloat(hours);
    if (Number.isNaN(parsed) || parsed <= 0) {
      window.alert("Please enter a valid number of hours (> 0). Example: 1.5");
      return;
    }
    if (!description.trim()) {
      window.alert("Please enter a description.");
      return;
    }

    try {
      await client.models.Records.create({
        hours: parsed,
        description: description.trim(),
      });
      setHours("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create record", err);
      window.alert("Failed to create record. See console for details.");
    }
  }

  return (
    <main>
      <h1>Time Records</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createRecord();
        }}
      >
        <label>
          Hours (e.g., 1.5)
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="1.5"
            required
          />
        </label>
        <br />
        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            required
          />
        </label>
        <br />
        <button type="submit">Add record</button>
      </form>

      <ul>
        {records.map((rec) => (
          <li key={rec.id}>
            {typeof rec.hours === "number" ? rec.hours : Number(rec.hours)}h —{" "}
            {rec.description}
          </li>
        ))}
      </ul>

      <div>
        🥳 App successfully hosted. Add time records above.
        <br />
        <a href="https://docs.amplify.aws/">
          Amplify docs
        </a>
      </div>
    </main>
  );
}
