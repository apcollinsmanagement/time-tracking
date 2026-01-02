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
  const [records, setRecords] = useState<Array<any>>([]);
  const [hours, setHours] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [date, setDate] = useState<string>(""); // MM/DD/YY
  const [distanceMiles, setDistanceMiles] = useState<string>("");
  const [vehicleUsed, setVehicleUsed] = useState<string>("");

  function listRecords() {
    client.models.Records.observeQuery().subscribe({
      next: (data) => {
        const normalized = (data.items as any[]).map((item) => {
          if (!item) return item;
          return {
            ...item,
            date: item.date ?? undefined,
          };
        });
        setRecords([...normalized]);
      },
    });
  }

  useEffect(() => {
    listRecords();
  }, []);

  function adjustNumberState(value: string, setter: (v: string) => void, delta: number) {
    const parsed = parseFloat(value);
    const base = Number.isNaN(parsed) ? 0 : parsed;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setter(String(next));
  }

  function formatTodayMMDDYY(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${mm}/${dd}/${yy}`;
  }

  function isValidMMDDYY(s: string): boolean {
    if (!/^\d{2}\/\d{2}\/\d{2}$/.test(s)) return false;
    const [mmStr, ddStr, yyStr] = s.split("/");
    const mm = Number(mmStr);
    const dd = Number(ddStr);
    const yy = Number(yyStr);
    const year = 2000 + yy;
    if (mm < 1 || mm > 12) return false;
    // construct and compare to ensure valid day for month
    const dt = new Date(year, mm - 1, dd);
    return dt.getFullYear() === year && dt.getMonth() === mm - 1 && dt.getDate() === dd;
  }

  async function createRecord() {
    const parsedHours = parseFloat(hours);
    if (Number.isNaN(parsedHours) || parsedHours <= 0) {
      window.alert("Please enter a valid number of hours (> 0). Example: 1.5");
      return;
    }
    if (!purpose.trim()) {
      window.alert("Please enter a purpose.");
      return;
    }
    if (!isValidMMDDYY(date)) {
      window.alert("Please enter a valid date in MM/DD/YY format (example: 01/02/26).");
      return;
    }
    const parsedDistance = distanceMiles ? parseFloat(distanceMiles) : undefined;
    if (distanceMiles && (Number.isNaN(parsedDistance!) || parsedDistance! < 0)) {
      window.alert("Please enter a valid distance in miles (>= 0).");
      return;
    }

    try {
      const payload: any = {
        hours: parsedHours,
        purpose: purpose.trim(),
        date: date,
        distanceMiles: parsedDistance !== undefined ? parsedDistance : undefined,
        vehicleUsed: vehicleUsed.trim() || undefined,
      };

      await client.models.Records.create(payload);
      setHours("");
      setPurpose("");
      setDate("");
      setDistanceMiles("");
      setVehicleUsed("");
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
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Hours (e.g., 1.5)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button
              type="button"
              aria-label="decrease hours"
              onClick={() => adjustNumberState(hours, setHours, -0.25)}
            >
              −
            </button>
            <input
              type="number"
              step="0.25"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="1.5"
              required
              style={{ width: 100 }}
            />
            <button
              type="button"
              aria-label="increase hours"
              onClick={() => adjustNumberState(hours, setHours, 0.25)}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What was the task?"
            required
            style={{ marginTop: 8, width: "100%", maxWidth: 560 }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Date (MM/DD/YY)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="MM/DD/YY"
              style={{ width: 140 }}
            />
            <button
              type="button"
              onClick={() => setDate(formatTodayMMDDYY())}
              aria-label="set today"
            >
              Today
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Distance (miles)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button
              type="button"
              aria-label="decrease distance"
              onClick={() => adjustNumberState(distanceMiles, setDistanceMiles, -0.1)}
            >
              −
            </button>
            <input
              type="number"
              step="0.1"
              min="0"
              value={distanceMiles}
              onChange={(e) => setDistanceMiles(e.target.value)}
              placeholder="0.0"
              style={{ width: 100 }}
            />
            <button
              type="button"
              aria-label="increase distance"
              onClick={() => adjustNumberState(distanceMiles, setDistanceMiles, 0.1)}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Vehicle Used</label>
          <select
            value={vehicleUsed}
            onChange={(e) => setVehicleUsed(e.target.value)}
            required
            style={{ marginTop: 8, minWidth: 220 }}
          >
            <option value="">Select vehicle</option>
            <option value="Kia Telluride">Kia Telluride</option>
            <option value="Ford Focus">Ford Focus</option>
          </select>
        </div>

        <button type="submit" style={{ marginTop: 6 }}>
          Add record
        </button>
      </form>

      <ul style={{ marginTop: 20 }}>
        {records.map((rec: any) => (
          <li key={rec.id} style={{ marginBottom: 12 }}>
            <div>
              <strong>{rec.purpose ?? "No purpose"}</strong>
            </div>
            <div>
              {rec.hours !== undefined && rec.hours !== null ? `${Number(rec.hours)}h` : ""}
              {rec.date ? ` — ${rec.date}` : ""}
              {rec.distanceMiles !== undefined && rec.distanceMiles !== null
                ? ` — ${Number(rec.distanceMiles)} mi`
                : ""}
              {rec.vehicleUsed ? ` — ${rec.vehicleUsed}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
