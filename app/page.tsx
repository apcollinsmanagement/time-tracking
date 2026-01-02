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
  // use `any` here to avoid type mismatch while the generated Schema may still
  // include the old todo model. Once your amplify codegen is updated you can
  // switch back to the generated types.
  const [records, setRecords] = useState<Array<any>>([]);
  const [hours, setHours] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [startLocation, setStartLocation] = useState<string>("");
  const [startLocationOption, setStartLocationOption] = useState<string>("");
  const [endLocationOption, setEndLocationOption] = useState<string>("");
  const [endLocation, setEndLocation] = useState<string>("");
  const [distanceMiles, setDistanceMiles] = useState<string>("");
  const [vehicleUsed, setVehicleUsed] = useState<string>("");

  function listRecords() {
    client.models.Records.observeQuery().subscribe({
      next: (data) => {
        // normalize items so we support both:
        // - new schema with `hours`, `description`, `startLocation`, etc.
        // - legacy records that have a `content` string containing JSON
        const normalized = (data.items as any[]).map((item) => {
          if (!item) return item;
          if (item.content && typeof item.content === "string") {
            try {
              const parsed = JSON.parse(item.content);
              return {
                ...item,
                hours: parsed.hours ?? item.hours,
                purpose: parsed.purpose ?? parsed.description ?? item.purpose ?? item.description,
                startLocation: parsed.startLocation ?? item.startLocation,
                endLocation: parsed.endLocation ?? item.endLocation,
                distanceMiles: parsed.distanceMiles ?? item.distanceMiles,
                vehicleUsed: parsed.vehicleUsed ?? item.vehicleUsed,
              };
            } catch {
              return item;
            }
          }
          return item;
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
    const parsedDistance = distanceMiles ? parseFloat(distanceMiles) : undefined;
    if (distanceMiles && (Number.isNaN(parsedDistance!) || parsedDistance! < 0)) {
      window.alert("Please enter a valid distance in miles (>= 0).");
      return;
    }

    try {
      // cast to any to avoid TS errors if the generated Schema type hasn't been updated
      const payload: any = {
        hours: parsedHours,
        purpose: purpose.trim(),
        startLocation: startLocation.trim() || undefined,
        endLocation: endLocation.trim() || undefined,
        distanceMiles: parsedDistance !== undefined ? parsedDistance : undefined,
        vehicleUsed: vehicleUsed.trim() || undefined,
      };

      // If backend hasn't been updated yet, fallback to legacy `content` storage:
      // comment out the fallback once your API accepts these fields.
      // payload.content = JSON.stringify({
      //   hours: parsedHours,
      //   description: description.trim(),
      //   startLocation: startLocation.trim(),
      //   endLocation: endLocation.trim(),
      //   distanceMiles: parsedDistance,
      //   vehicleUsed: vehicleUsed.trim(),
      // });

      await client.models.Records.create(payload);
      // clear form
      setHours("");
      setPurpose("");
      setStartLocation("");
      setEndLocation("");
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
        <label>
          Hours (e.g., 1.5)
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
        </label>
        <br />
        <label>
          Purpose
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What was the task?"
            required
          />
        </label>
        <br />
        <label>
          Start Location
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <select
              value={startLocationOption}
              onChange={(e) => {
                const v = e.target.value;
                setStartLocationOption(v);
                if (v === "home") {
                  setStartLocation("6110 Misty Creek Drive Loveland OH 45140");
                } else if (v === "custom") {
                  setStartLocation("");
                } else {
                  setStartLocation("");
                }
              }}
              style={{ minWidth: 180 }}
            >
              <option value="">Select location</option>
              <option value="home">Home</option>
              <option value="custom">Other (custom)</option>
            </select>

            {startLocationOption === "custom" && (
              <input
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Enter custom start location"
                style={{ minWidth: 240 }}
              />
            )}

            {startLocationOption === "home" && (
              <input
                type="text"
                value={startLocation}
                readOnly
                style={{ minWidth: 240 }}
              />
            )}
          </div>
        </label>
        <br />
        <label>
          End Location
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <select
              value={endLocationOption}
              onChange={(e) => {
                const v = e.target.value;
                setEndLocationOption(v);
                if (v === "home") {
                  setEndLocation("6110 Misty Creek Drive Loveland OH 45140");
                } else if (v === "girard") {
                  setEndLocation("6317 Girard Ave Cincinnati OH 45213");
                } else if (v === "custom") {
                  setEndLocation("");
                } else {
                  setEndLocation("");
                }
              }}
              style={{ minWidth: 220 }}
            >
              <option value="">Select location</option>
              <option value="home">Home</option>
              <option value="girard">Girard</option>
              <option value="custom">Other (custom)</option>
            </select>

            {endLocationOption === "custom" && (
              <input
                type="text"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder="Enter custom end location"
                style={{ minWidth: 240 }}
              />
            )}

            {(endLocationOption === "home" || endLocationOption === "girard") && (
              <input
                type="text"
                value={endLocation}
                readOnly
                style={{ minWidth: 240 }}
              />
            )}
          </div>
        </label>
        <br />
        <label>
          Distance (miles)
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
        </label>
        <br />
        <label>
          Vehicle Used
          <select
            value={vehicleUsed}
            onChange={(e) => setVehicleUsed(e.target.value)}
            required
            style={{ minWidth: 180 }}
          >
            <option value="">Select vehicle</option>
            <option value="Kia Telluride">Kia Telluride</option>
            <option value="Ford Focus">Ford Focus</option>
          </select>
        </label>
        <br />
        <button type="submit">Add record</button>
      </form>

      <ul>
        {records.map((rec: any) => (
          <li key={rec.id}>
            <div>
              <strong>{rec.purpose ?? "No purpose"}</strong>
            </div>
            <div>
              {rec.hours !== undefined && rec.hours !== null ? `${Number(rec.hours)}h` : ""}
              {rec.distanceMiles !== undefined && rec.distanceMiles !== null
                ? ` — ${Number(rec.distanceMiles)} mi`
                : ""}
              {rec.vehicleUsed ? ` — ${rec.vehicleUsed}` : ""}
              {rec.createdAt ? ` — ${new Date(rec.createdAt).toLocaleString()}` : ""}
            </div>
            {(rec.startLocation || rec.endLocation) && (
              <div>
                {rec.startLocation ? `From: ${rec.startLocation}` : ""}
                {rec.endLocation ? ` — To: ${rec.endLocation}` : ""}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
