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
  const [vehicleEnabled, setVehicleEnabled] = useState<boolean>(false);
  const [vehicleCustom, setVehicleCustom] = useState<string>("");

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
      };

      // attach vehicle only if user enabled and selected/entered one
      if (vehicleEnabled) {
        const v = vehicleUsed === "other" ? vehicleCustom.trim() : vehicleUsed;
        if (v && v.length > 0) {
          payload.vehicleUsed = v;
        }
      }

      await client.models.Records.create(payload);
      setHours("");
      setPurpose("");
      setDate("");
      setDistanceMiles("");
      setVehicleUsed("");
      setVehicleCustom("");
      setVehicleEnabled(false);
    } catch (err) {
      console.error("Failed to create record", err);
      window.alert("Failed to create record. See console for details.");
    }
  }

  function truncate(s?: string, n = 25) {
    if (!s) return "—";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  return (
    <main>
      {/* <h1>Task Tracker</h1> */}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createRecord();
        }}
      >
        {/* reordered inputs: date, purpose, hours, vehicle, distance, submit */}
        <div className="form-row">
          <label style={{ display: "block", fontWeight: 600 }}>Date (MM/DD/YY)</label>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="MM/DD/YY"
              className="input-compact"
            />
            <button type="button" onClick={() => setDate(formatTodayMMDDYY())} aria-label="set today" className="btn-compact">
              Today
            </button>
          </div>
        </div>

        <div className="form-row">
           <label style={{ display: "block", fontWeight: 600 }}>Purpose</label>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="What was the task?"
              required
              className="input-full"
            />
          </div>
        </div>

        <div className="form-row">
           <label style={{ display: "block", fontWeight: 600 }}>Hours (e.g., 1.5)</label>
          <div className="row" style={{ marginTop: 8 }}>
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
               placeholder="Add Hours"
               required
              className="input-compact"
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

        <div className="form-row">
           <label style={{ display: "block", fontWeight: 600 }}>Vehicle (optional)</label>
          <div className="row" style={{ marginTop: 8 }}>
             <button
               type="button"
               onClick={() => {
                 setVehicleEnabled((v) => !v);
                 if (vehicleEnabled) {
                   setVehicleUsed("");
                   setVehicleCustom("");
                 }
               }}
               aria-pressed={vehicleEnabled}
               style={{
                 padding: "6px 10px",
                 borderRadius: 6,
                 border: vehicleEnabled ? "1px solid #0b67d0" : "1px solid #ccc",
                 background: vehicleEnabled ? "#0b67d0" : "#ffffff",
                 color: vehicleEnabled ? "#ffffff" : "#111111",
                 cursor: "pointer",
                 transition: "background 120ms ease, color 120ms ease",
               }}
             >
               {vehicleEnabled ? "Remove vehicle" : "Add vehicle"}
             </button>
 
             {vehicleEnabled && (
               <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                 <select
                   value={vehicleUsed}
                   onChange={(e) => setVehicleUsed(e.target.value)}
                  className="input-compact"
                 >
                   <option value="">Select vehicle</option>
                   <option value="Kia Telluride">Kia Telluride</option>
                   <option value="Ford Focus">Ford Focus</option>
                   <option value="other">Other (custom)</option>
                 </select>
 
                 {vehicleUsed === "other" && (
                   <input
                     type="text"
                     value={vehicleCustom}
                     onChange={(e) => setVehicleCustom(e.target.value)}
                     placeholder="Describe vehicle"
                    className="input-full"
                   />
                 )}
               </div>
             )}
           </div>
        </div>
 
        <div className="form-row">
           <label style={{ display: "block", fontWeight: 600 }}>Miles (optional)</label>
          <div className="row" style={{ marginTop: 8 }}>
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
              className="input-compact"
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
 
        <div style={{ marginTop: 6 }}>
          <button type="submit" className="btn-submit">
           Add record
          </button>
        </div>
       </form>
 
       {/* Records table */}
       <div style={{ marginTop: 20 }}>
         {records.length === 0 ? (
           <div>No records</div>
         ) : (
          <div className="table-wrapper" style={{ maxHeight: 360, border: "1px solid #e6e6e6", borderRadius: 8 }}>
            <table className="records-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
               <thead style={{ position: "sticky", top: 0, background: "#fafafa", zIndex: 1 }}>
                 <tr>
                   <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #eee", width: 110 }}>Date</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #eee" }}>Purpose</th>
                   <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #eee", width: 80 }}>Hours</th>
                   <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #eee", width: 90 }}>Miles</th>
                   <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #eee", width: 160 }}>Vehicle</th>
                 </tr>
               </thead>
               <tbody>
                 {records
                   .slice()
                   .sort((a: any, b: any) => {
                     const da = new Date(a.createdAt || 0).getTime();
                     const db = new Date(b.createdAt || 0).getTime();
                     return db - da;
                   })
                   .map((rec: any) => (
                     <tr key={rec.id}>
                       <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2", width: 110 }}>
                         {rec.date ?? "—"}
                       </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                        <div className="purpose-cell" style={{ fontWeight: 600 }}>{truncate(rec.purpose, 25)}</div>
                      </td>
                       <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2", textAlign: "right", width: 80 }}>
                         {rec.hours !== undefined && rec.hours !== null ? Number(rec.hours).toFixed(2) : "—"}
                       </td>
                       <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2", textAlign: "right", width: 90 }}>
                         {rec.distanceMiles !== undefined && rec.distanceMiles !== null ? Number(rec.distanceMiles).toFixed(1) : "—"}
                       </td>
                       <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2", width: 160 }}>
                         {rec.vehicleUsed ?? "—"}
                       </td>
                     </tr>
                   ))}
               </tbody>
             </table>
+          </div>
         )}
       </div>
     </main>
   );
 }
