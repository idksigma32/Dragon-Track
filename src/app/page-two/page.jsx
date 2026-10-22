"use client";

import { useState } from "react";

const students = [
  {
    fullName: "Alex Morgan",
    currentDeliverable: "Landing page draft",
    progress: "12/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Responsive nav test", date: "Sep 18, 2026" }],
  },
  {
    fullName: "Jamie Rivera",
    currentDeliverable: "Moodboard review",
    progress: "9/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Tayler Kim",
    currentDeliverable: "Wireframe check",
    progress: "15/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Jordan Lee",
    currentDeliverable: "Homepage layout",
    progress: "8/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Accessibility pass", date: "Sep 19, 2026" }],
  },
  {
    fullName: "Morgan White",
    currentDeliverable: "Prototype polish",
    progress: "7/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "Prototype polish", date: "Sep 10, 2026" },
      { assignment: "Color system review", date: "Sep 12, 2026" },
    ],
  },
  {
    fullName: "Priya Shah",
    currentDeliverable: "Hero section",
    progress: "10/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Footer spacing pass", date: "Sep 11, 2026" }],
  },
  {
    fullName: "Noah Scott",
    currentDeliverable: "Color system",
    progress: "13/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Emma Davis",
    currentDeliverable: "Image assets",
    progress: "5/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "Image assets", date: "Sep 8, 2026" },
      { assignment: "Typography notes", date: "Sep 13, 2026" },
    ],
  },
  {
    fullName: "Lucas Reed",
    currentDeliverable: "Responsive mockup",
    progress: "11/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Mobile QA", date: "Sep 17, 2026" }],
  },
  {
    fullName: "Olivia Clark",
    currentDeliverable: "Navigation menu",
    progress: "14/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Daniel Ross",
    currentDeliverable: "CSS cleanup",
    progress: "4/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "CSS cleanup", date: "Sep 7, 2026" },
      { assignment: "Layout audit", date: "Sep 9, 2026" },
      { assignment: "Final polish check", date: "Sep 14, 2026" },
    ],
  },
  {
    fullName: "Hannah King",
    currentDeliverable: "App flow",
    progress: "12/16",
    status: "In progress",
    missingAssignments: [{ assignment: "User flow review", date: "Sep 15, 2026" }],
  },
  {
    fullName: "Ethan Hall",
    currentDeliverable: "Accessibility pass",
    progress: "6/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "Accessibility pass", date: "Sep 9, 2026" },
      { assignment: "Keyboard review", date: "Sep 13, 2026" },
    ],
  },
  {
    fullName: "Sofia Perez",
    currentDeliverable: "Footer design",
    progress: "9/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Mason Gray",
    currentDeliverable: "Animation notes",
    progress: "3/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "Animation notes", date: "Sep 6, 2026" },
      { assignment: "Interaction timing", date: "Sep 16, 2026" },
    ],
  },
  {
    fullName: "Ava Flores",
    currentDeliverable: "Content blocks",
    progress: "8/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Content block QA", date: "Sep 12, 2026" }],
  },
  {
    fullName: "Benjamin Lee",
    currentDeliverable: "Final critique",
    progress: "15/16",
    status: "Completed",
    missingAssignments: [],
  },
  {
    fullName: "Chloe Green",
    currentDeliverable: "CTA layout",
    progress: "10/16",
    status: "In progress",
    missingAssignments: [{ assignment: "CTA layout review", date: "Sep 17, 2026" }],
  },
  {
    fullName: "Leo Fisher",
    currentDeliverable: "Grid system",
    progress: "7/16",
    status: "Missing",
    missingAssignments: [
      { assignment: "Grid system", date: "Sep 8, 2026" },
      { assignment: "Alignment check", date: "Sep 15, 2026" },
    ],
  },
  {
    fullName: "Grace Young",
    currentDeliverable: "Portfolio section",
    progress: "11/16",
    status: "In progress",
    missingAssignments: [{ assignment: "Portfolio polish", date: "Sep 14, 2026" }],
  },
];

const statusStyles = {
  Completed: "bg-emerald-100 text-emerald-700",
  "In progress": "bg-amber-100 text-amber-700",
  Missing: "bg-rose-100 text-rose-700",
};

const navItems = ["Dashboard", "Classes", "Deliverables", "Students", "Reports"];

export default function PageTwo() {
  const [selectedStudent, setSelectedStudent] = useState(null);

  return (
    <main className="min-h-screen bg-[#f4f5f7] p-4 text-slate-800 md:p-6">
      <div className="mx-auto flex max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <aside className="w-64 border-r border-slate-200 bg-[#f8f8f8] p-4">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef5a2a] text-sm font-bold text-white">
              D
            </div>
            <div className="text-xl font-bold text-slate-800">DragonTrack</div>
          </div>

          <nav className="space-y-2 text-sm">
            {navItems.map((item, index) => (
              <button
                key={item}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 ${
                  index === 1
                    ? "bg-[#fff1ec] font-medium text-[#ef5a2a]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{index === 0 ? "◫" : index === 1 ? "▣" : index === 2 ? "◌" : index === 3 ? "◍" : "▤"}</span>
                <span>{item}</span>
              </button>
            ))}
          </nav>

          <div className="mt-10 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ef5a2a] text-sm font-bold text-white">
              MC
            </div>
            <div>
              <div className="text-sm font-semibold">Ms. Carter</div>
              <div className="text-xs text-slate-500">Teacher</div>
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-[#fdfdfd] p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Classes {'>'} Web Design</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-800">Students</h1>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Full Name</th>
                    <th className="px-5 py-3 font-semibold">Progress</th>
                    <th className="px-5 py-3 font-semibold">Current Deliverable</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.fullName}
                      onClick={() => setSelectedStudent(student)}
                      className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-xs font-bold text-slate-700">
                            {student.fullName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </div>
                          <span className="font-medium text-slate-800">{student.fullName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-[#ef5a2a]"
                              style={{ width: `${(Number.parseInt(student.progress, 10) / 16) * 100}%` }}
                            />
                          </div>
                          <span className="text-slate-700">{student.progress}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-slate-600">{student.currentDeliverable}</td>

                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[student.status]}`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="h-full w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm text-slate-500">Student details</p>
                <h2 className="text-2xl font-semibold text-slate-800">{selectedStudent.fullName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusStyles[selectedStudent.status]}`}>
                    {selectedStudent.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Current Deliverable</p>
                  <p className="mt-2 text-lg font-semibold text-slate-800">{selectedStudent.currentDeliverable}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Progress</p>
                  <p className="mt-2 text-lg font-semibold text-slate-800">{selectedStudent.progress}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Missing assignments</h3>

                {selectedStudent.missingAssignments.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedStudent.missingAssignments.map((item) => (
                      <li key={`${selectedStudent.fullName}-${item.assignment}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="font-medium text-slate-800">{item.assignment}</div>
                        <div className="mt-1 text-sm text-slate-500">Missed on {item.date}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No missing assignments right now.</p>
                )} 
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

