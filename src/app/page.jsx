"use client";

import { useState } from "react";
const students = [
  "Avery Bennett",
  "Jordan Kim",
  "Maya Patel",
  "Ethan Brooks",
  "Sofia Rivera",
  "Noah Williams",
  "Isabella Chen",
  "Liam Thompson",
  "Amara Johnson",
  "Lucas Martinez",
  "Harper Davis",
  "Elijah Wilson",
  "Zoe Anderson",
  "Mateo Garcia",
  "Nina Thompson",
  "Caleb Moore",
  "Layla Robinson",
  "Owen Clark",
  "Priya Shah",
  "Finn Murphy",
];

const deliverables = Array.from({ length: 16 }, (_, index) => index + 1);
const statuses = ["incomplete", "completed", "skipped"];
const statusStyles = {
  incomplete: "bg-yellow-200 text-yellow-900 hover:bg-yellow-300",
  completed: "bg-green-200 text-green-900 hover:bg-green-300",
  skipped: "bg-red-200 text-red-900 hover:bg-red-300",
};

export default function PageOne() {
  const [deliverableStatuses, setDeliverableStatuses] = useState({});

  return (
    <section
      className="min-h-screen space-y-6 rounded-xl bg-white p-6"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 88% 8%, rgba(249, 115, 22, 0.1), transparent 30rem), radial-gradient(ellipse at 8% 92%, rgba(249, 115, 22, 0.06), transparent 26rem)",
      }}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Deliverables</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          students:20 · deliverables:16
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 w-56 border-b bg-muted/60 px-4 py-3 font-medium"
              >
                Student
              </th>
              {deliverables.map((deliverable) => (
                <th
                  key={deliverable}
                  scope="col"
                  className="w-[68px] border-b px-2 py-3 text-center font-medium"
                >
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    DELIVERABLE
                  </span>
                  <span>{deliverable}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student} className="hover:bg-muted/30">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] border-r border-b bg-background px-4 py-3 text-left font-medium"
                >
                  {student}
                </th>
                {deliverables.map((deliverable) => {
                  const key = `${student}-${deliverable}`;
                  const status = deliverableStatuses[key] || "incomplete";

                  return (
                    <td key={deliverable} className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDeliverableStatuses((current) => {
                            const currentStatus = current[key] || "incomplete";
                            const nextStatus =
                              statuses[
                                (statuses.indexOf(currentStatus) + 1) %
                                  statuses.length
                              ];

                            return { ...current, [key]: nextStatus };
                          })
                        }
                        aria-label={`${student}, deliverable ${deliverable}: ${status}. Click to change status.`}
                        title={status}
                        className={`mx-auto flex h-8 w-16 cursor-pointer items-center justify-center rounded-md border-0 text-[10px] leading-none font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${statusStyles[status]}`}
                      >
                        {status === "incomplete"
                          ? "Incomplete"
                          : status === "completed"
                            ? "Completed"
                            : "Skipped"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
