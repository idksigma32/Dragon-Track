
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Search,
  Check,
  Plus,
  AlertTriangle,
  Clock3,
  Users,
  RefreshCw,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { pb } from "@/pocketbase";
import { useAuth } from "@/hooks/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = {
  completed: "#86efac",
  pending: "#fde68a",
  skipped: "#fca5a5",
  incomplete: "#fca5a5",
};

function dateLabel(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function errorMessage(error) {
  return (
    error?.response?.message ||
    error?.message ||
    "Something went wrong."
  );
}

function getDisplayStatus(status, skipped) {
  if (status === "completed") return "completed";
  if (status === "incomplete") return "incomplete";
  if (skipped || status === "skipped") return "skipped";
  return "pending";
}

function RoadmapCell({
  status,
  skipped,
  editable,
  disabled,
  onChange,
}) {
  const display = getDisplayStatus(status, skipped);

  function handleClick(event) {
    if (!editable || disabled) return;

    if (event.shiftKey) {
      onChange(
        status === "incomplete"
          ? "not_started"
          : "incomplete"
      );
    } else {
      onChange(
        status === "completed"
          ? "not_started"
          : "completed"
      );
    }
  }

  return (
    <button
      type="button"
      disabled={!editable || disabled}
      onClick={handleClick}
      title={
        !editable
          ? display
          : "Click: toggle completed | Shift+click: incomplete"
      }
      className={`flex h-9 w-full items-center justify-center rounded-md text-xs font-semibold transition-colors ${
        editable
          ? "cursor-pointer hover:brightness-95"
          : "cursor-default"
      }`}
      style={{ backgroundColor: COLORS[display] }}
    >
      {display === "completed" ? (
        <Check className="size-4" />
      ) : display === "skipped" ? (
        <span className="flex items-center gap-1 text-red-800">
          <AlertTriangle className="size-3.5" />!
        </span>
      ) : display === "incomplete" ? (
        <span className="text-[11px] text-red-900">
          Incomp.
        </span>
      ) : (
        <Plus className="size-4" />
      )}
    </button>
  );
}

function CompletionChart({ counts, total }) {
  const sections = [
    ["completed", "Completed"],
    ["pending", "Not Completed"],
    ["skipped", "Skipped Alert"],
    ["incomplete", "Incomplete"],
  ];

  let position = 0;

  const stops = sections.map(([key]) => {
    const start = position;
    position += total
      ? ((counts[key] || 0) / total) * 100
      : 0;
    return `${COLORS[key]} ${start}% ${position}%`;
  });

  const gradient = total
    ? `conic-gradient(${stops.join(", ")})`
    : "conic-gradient(#e8edf5 0% 100%)";

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4">
      <div
        className="flex size-36 shrink-0 items-center justify-center rounded-full"
        style={{ background: gradient }}
      >
        <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-bold">
            {total}
          </span>
          <span className="text-center text-[11px] text-slate-500">
            Total
            <br />
            Deliverables
          </span>
        </div>
      </div>

      <div className="min-w-36 flex-1 space-y-3">
        {sections.map(([key, label]) => (
          <div
            key={key}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: COLORS[key] }}
            />
            <span className="flex-1 text-slate-500">
              {label}
            </span>
            <span className="font-semibold">
              {counts[key] || 0}
            </span>
            <span className="w-9 text-right text-slate-400">
              {total
                ? Math.round(
                    ((counts[key] || 0) / total) * 100
                  )
                : 0}
              %
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">
            {title}
          </p>
          <p className="text-2xl font-bold">
            {value}
          </p>
          <p className="text-[11px] text-slate-400">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pb.authStore.token}`,
      ...options.headers,
    },
  });

  const raw = await response.text();
  let result;

  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `Server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      result.error ||
        result.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

function sortRoadmap(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.due_date
      ? new Date(a.due_date).getTime()
      : Infinity;
    const bDate = b.due_date
      ? new Date(b.due_date).getTime()
      : Infinity;

    if (aDate !== bDate) return aDate - bDate;

    return (a.created || "").localeCompare(
      b.created || ""
    );
  });
}

export default function DashboardPage() {
  const { user, isReady } = useAuth();

  const [data, setData] = useState({
    classrooms: [],
    students: [],
    enrollments: [],
    deliverables: [],
    progress: [],
  });

  const [studentClasses, setStudentClasses] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const teacher = user?.role === "teacher";

  async function loadTeacher() {
    const classrooms = await pb
      .collection("classrooms")
      .getFullList({
        filter: pb.filter(
          "teacher = {:id} && archived = false",
          { id: user.id }
        ),
        sort: "name",
        requestKey: null,
      });

    if (!classrooms.length) {
      setData({
        classrooms: [],
        students: [],
        enrollments: [],
        deliverables: [],
        progress: [],
      });
      return;
    }

    const classFilterText = classrooms
      .map((c) =>
        pb.filter("classroom = {:id}", { id: c.id })
      )
      .join(" || ");

    const [enrollments, deliverables] =
      await Promise.all([
        pb.collection("enrollments").getFullList({
          filter: classFilterText,
          requestKey: null,
        }),
        pb.collection("deliverables").getFullList({
          filter: classFilterText,
          requestKey: null,
        }),
      ]);

    const studentIds = [
      ...new Set(enrollments.map((e) => e.student)),
    ];

    const deliverableIds = deliverables.map(
      (d) => d.id
    );

    const [students, progress] = await Promise.all([
      studentIds.length
        ? pb.collection("students").getFullList({
            filter: studentIds
              .map((id) =>
                pb.filter("id = {:id}", { id })
              )
              .join(" || "),
            sort: "name",
            requestKey: null,
          })
        : Promise.resolve([]),

      deliverableIds.length
        ? pb.collection("progress").getFullList({
            filter: deliverableIds
              .map((id) =>
                pb.filter("deliverable = {:id}", { id })
              )
              .join(" || "),
            requestKey: null,
          })
        : Promise.resolve([]),
    ]);

    setData({
      classrooms,
      students,
      enrollments,
      deliverables,
      progress,
    });
  }

  async function loadStudent() {
    const result = await apiRequest(
      "/api/classrooms/my"
    );
    setStudentClasses(result.classrooms || []);
  }

  async function loadDashboard() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      if (teacher) {
        await loadTeacher();
      } else {
        await loadStudent();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isReady && user) {
      loadDashboard();
    } else if (isReady) {
      setLoading(false);
    }
  }, [isReady, user?.id, user?.role]);

  async function updateProgress(
    studentId,
    deliverableId,
    status
  ) {
    if (!teacher || savingCell) return;

    const key = `${studentId}-${deliverableId}`;
    setSavingCell(key);
    setError("");

    try {
      const existing = data.progress.find(
        (p) =>
          p.student === studentId &&
          p.deliverable === deliverableId
      );

      if (existing) {
        await pb.collection("progress").update(
          existing.id,
          {
            status,
            submitted_at:
              status === "completed"
                ? new Date().toISOString()
                : "",
          }
        );
      } else {
        await pb.collection("progress").create({
          student: studentId,
          deliverable: deliverableId,
          status,
          ...(status === "completed"
            ? {
                submitted_at:
                  new Date().toISOString(),
              }
            : {}),
        });
      }

      await loadTeacher();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCell("");
    }
  }

  // FIXED: The button always responds unless a request is running.
  async function joinClass(event) {
    event.preventDefault();

    if (joining) return;

    setError("");
    setSuccess("");

    const classroomCode = code.trim().toUpperCase();

    if (!classroomCode) {
      setError("Please enter a classroom code.");
      return;
    }

    if (classroomCode.length !== 8) {
      setError(
        `Classroom codes must be exactly 8 characters. You entered ${classroomCode.length}.`
      );
      return;
    }

    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(classroomCode)) {
      setError(
        "This code contains invalid characters. Copy the exact code from your teacher."
      );
      return;
    }

    setJoining(true);

    try {
      const result = await apiRequest(
        "/api/classrooms/join",
        {
          method: "POST",
          body: JSON.stringify({
            code: classroomCode,
          }),
        }
      );

      const classroomName =
        typeof result.classroom === "string"
          ? result.classroom
          : result.classroom?.name || "";

      setSuccess(
        [
          result.message || "Successfully joined classroom!",
          classroomName,
        ]
          .filter(Boolean)
          .join(" ")
      );

      setCode("");
      await loadStudent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  const visibleClasses = useMemo(() => {
    const classes = teacher
      ? data.classrooms
      : studentClasses;

    return classes.filter(
      (c) =>
        classFilter === "all" ||
        c.id === classFilter
    );
  }, [
    teacher,
    data.classrooms,
    studentClasses,
    classFilter,
  ]);

  const dashboard = useMemo(() => {
    const empty = {
      students: [],
      tasks: [],
      cells: [],
      counts: {},
      total: 0,
      activities: [],
      upcoming: [],
    };

    if (!user) return empty;

    let students = [];
    let tasks = [];
    let cells = [];

    if (teacher) {
      const classIds = new Set(
        visibleClasses.map((c) => c.id)
      );

      const enrollments = data.enrollments.filter(
        (e) => classIds.has(e.classroom)
      );

      const studentIds = new Set(
        enrollments.map((e) => e.student)
      );

      students = data.students.filter((s) =>
        studentIds.has(s.id)
      );

      tasks = visibleClasses.flatMap((c) =>
        sortRoadmap(
          data.deliverables.filter(
            (d) => d.classroom === c.id
          )
        )
      );

      const progressMap = new Map(
        data.progress.map((p) => [
          `${p.student}-${p.deliverable}`,
          p,
        ])
      );

      cells = enrollments.flatMap((e) => {
        const classTasks = tasks.filter(
          (d) => d.classroom === e.classroom
        );

        const statuses = classTasks.map((d) => {
          const record = progressMap.get(
            `${e.student}-${d.id}`
          );

          return {
            task: d,
            status: record?.status || "not_started",
            updated: record?.updated || "",
          };
        });

        return statuses.map((entry, index) => {
          const skipped = statuses
            .slice(index + 1)
            .some(
              (later) =>
                later.status === "completed"
            );

          const student = students.find(
            (s) => s.id === e.student
          );

          return {
            student: e.student,
            task: entry.task.id,
            classroom: e.classroom,
            status: entry.status,
            display: getDisplayStatus(
              entry.status,
              skipped
            ),
            updated: entry.updated,
            name: student?.name || "Student",
            title: entry.task.title,
          };
        });
      });
    } else {
      students = [
        {
          id: user.id,
          name: user.name || user.email,
        },
      ];

      tasks = visibleClasses.flatMap((c) =>
        sortRoadmap(
          (c.deliverables || []).map((d) => ({
            ...d,
            classroom: c.id,
            classroomName: c.name,
          }))
        )
      );

      cells = visibleClasses.flatMap((c) => {
        const classTasks = sortRoadmap(
          c.deliverables || []
        );

        return classTasks.map((d, index) => {
          const skipped = classTasks
            .slice(index + 1)
            .some(
              (later) =>
                later.status === "completed"
            );

          const status = d.status || "not_started";

          return {
            student: user.id,
            task: d.id,
            classroom: c.id,
            status,
            display: getDisplayStatus(
              status,
              skipped
            ),
            updated: d.updated || "",
            name: user.name || user.email,
            title: d.title,
          };
        });
      });
    }

    const counts = {
      completed: 0,
      pending: 0,
      skipped: 0,
      incomplete: 0,
    };

    cells.forEach((cell) => {
      counts[cell.display]++;
    });

    const activities = cells
      .filter((c) => c.updated)
      .sort(
        (a, b) =>
          new Date(b.updated) -
          new Date(a.updated)
      )
      .slice(0, 5);

    const upcoming = tasks
      .filter(
        (d) =>
          d.due_date &&
          new Date(d.due_date) >= new Date()
      )
      .sort(
        (a, b) =>
          new Date(a.due_date) -
          new Date(b.due_date)
      )
      .slice(0, 5);

    return {
      students,
      tasks,
      cells,
      counts,
      total: cells.length,
      activities,
      upcoming,
    };
  }, [user, teacher, visibleClasses, data]);

  const filteredStudents = useMemo(() => {
    const result = dashboard.students.filter(
      (s) =>
        `${s.name} ${s.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
    );

    if (sort === "progress") {
      const percentage = (student) => {
        const rows = dashboard.cells.filter(
          (c) => c.student === student.id
        );

        const done = rows.filter(
          (c) => c.status === "completed"
        ).length;

        return rows.length
          ? done / rows.length
          : 0;
      };

      return [...result].sort(
        (a, b) =>
          percentage(b) - percentage(a)
      );
    }

    return [...result].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [dashboard, search, sort]);

  if (!isReady) {
    return (
      <p className="p-8">
        Loading DragonTrack...
      </p>
    );
  }

  if (!user) {
    return (
      <main className="p-6">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>
              Welcome to DragonTrack
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p>
              Sign in to view your classroom progress.
            </p>

            <Link href="/sign-in">
              <Button className="bg-orange-500 hover:bg-orange-600">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const completed =
    dashboard.counts.completed || 0;

  const pending =
    dashboard.counts.pending || 0;

  const skipped =
    dashboard.counts.skipped || 0;

  const incomplete =
    dashboard.counts.incomplete || 0;

  const total = dashboard.total;

  const percent = total
    ? Math.round((completed / total) * 100)
    : 0;

  return (
    <main className="min-w-0 space-y-5 bg-transparent p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
            DragonTrack
          </p>

          <h1 className="text-2xl font-bold tracking-tight">
            Student Progress
          </h1>

          <p className="text-xs text-slate-500">
            Track classroom deliverables in roadmap order.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw className="mr-1 size-3.5" />
            Refresh
          </Button>

          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
            <CalendarDays className="size-3.5" />
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </p>
      )}

      {/* STUDENT CLASSROOM JOIN */}
      {!teacher && (
        <Card className="rounded-2xl bg-white shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold">
                Join a Classroom
              </p>

              <p className="text-xs text-slate-500">
                Enter the code from your teacher.
              </p>
            </div>

            <form
              onSubmit={joinClass}
              className="flex flex-wrap gap-2"
            >
              <Input
                className="w-40 font-mono uppercase"
                placeholder="Class code"
                maxLength={8}
                value={code}
                onChange={(e) => {
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                  );
                  setError("");
                  setSuccess("");
                }}
              />

              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={joining}
              >
                {joining
                  ? "Joining..."
                  : "Join Class"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STUDENT DELIVERABLES TABLE */}
      <Card className="overflow-hidden rounded-2xl border-slate-100 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                Student Deliverables
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                {teacher
                  ? "Click to complete. Shift + click for Incomp."
                  : "Your deliverables are shown in roadmap order."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />

                <Input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search students..."
                  className="h-9 w-40 pl-8 text-xs"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) =>
                  setClassFilter(e.target.value)
                }
                className="h-9 rounded-md border bg-white px-2 text-xs"
              >
                <option value="all">
                  All Classrooms
                </option>

                {(teacher
                  ? data.classrooms
                  : studentClasses
                ).map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value)
                }
                className="h-9 rounded-md border bg-white px-2 text-xs"
              >
                <option value="name">
                  Sort by name
                </option>

                <option value="progress">
                  Sort by progress
                </option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-xs">
              <thead>
                <tr className="border-y bg-slate-50 text-slate-500">
                  <th className="sticky left-0 z-10 min-w-36 bg-slate-50 px-4 py-3 text-left">
                    Student Name
                  </th>

                  {dashboard.tasks.map((task) => (
                    <th
                      key={task.id}
                      className="min-w-24 px-2 py-3 text-center"
                    >
                      <span className="block font-semibold text-slate-700">
                        {task.title}
                      </span>

                      <span className="text-[10px] text-slate-400">
                        {dateLabel(task.due_date)}
                      </span>
                    </th>
                  ))}

                  <th className="min-w-24 px-3 py-3 text-center">
                    Progress
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={dashboard.tasks.length + 2}
                      className="p-8 text-center"
                    >
                      Loading progress...
                    </td>
                  </tr>
                ) : !filteredStudents.length ? (
                  <tr>
                    <td
                      colSpan={dashboard.tasks.length + 2}
                      className="p-8 text-center text-slate-500"
                    >
                      No students or deliverables found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const rows =
                      dashboard.cells.filter(
                        (c) =>
                          c.student === student.id
                      );

                    const done = rows.filter(
                      (c) =>
                        c.status === "completed"
                    ).length;

                    const studentPercent =
                      rows.length
                        ? Math.round(
                            (done / rows.length) * 100
                          )
                        : 0;

                    return (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100"
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium">
                          {student.name}
                        </td>

                        {dashboard.tasks.map(
                          (task) => {
                            const cell =
                              dashboard.cells.find(
                                (c) =>
                                  c.student ===
                                    student.id &&
                                  c.task ===
                                    task.id
                              );

                            return (
                              <td
                                key={task.id}
                                className="px-1 py-2"
                              >
                                {cell ? (
                                  <RoadmapCell
                                    status={
                                      cell.status
                                    }
                                    skipped={
                                      cell.display ===
                                      "skipped"
                                    }
                                    editable={teacher}
                                    disabled={
                                      Boolean(
                                        savingCell
                                      )
                                    }
                                    onChange={(
                                      status
                                    ) =>
                                      updateProgress(
                                        student.id,
                                        task.id,
                                        status
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="flex h-9 items-center justify-center rounded-md bg-slate-50 text-slate-300">
                                    —
                                  </div>
                                )}
                              </td>
                            );
                          }
                        )}

                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{
                                  width: `${studentPercent}%`,
                                }}
                              />
                            </div>

                            <span className="text-[11px] font-semibold">
                              {studentPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CHARTS AND ACTIVITY */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl bg-white shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">
              Overall Completion
            </CardTitle>

            <p className="text-[11px] text-slate-400">
              Roadmap status distribution
            </p>
          </CardHeader>

          <CardContent>
            <CompletionChart
              counts={dashboard.counts}
              total={total}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              Upcoming Due Dates
            </CardTitle>

            {teacher && (
              <Link
                href="/page-three"
                className="text-xs text-blue-500"
              >
                View all
              </Link>
            )}
          </CardHeader>

          <CardContent className="space-y-2">
            {!dashboard.upcoming.length ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No upcoming assignments.
              </p>
            ) : (
              dashboard.upcoming.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <CalendarDays className="size-5 text-red-500" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {task.title}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {dateLabel(task.due_date)}
                    </p>
                  </div>

                  <ArrowRight className="size-3.5 text-slate-400" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Recent Activity
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {!dashboard.activities.length ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No recent updates.
              </p>
            ) : (
              dashboard.activities.map(
                (activity, index) => (
                  <div
                    key={`${activity.student}-${activity.task}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                      {activity.name[0]?.toUpperCase()}
                    </div>

                    <div>
                      <p className="text-xs">
                        <strong>
                          {activity.name}
                        </strong>{" "}
                        updated {activity.title}
                      </p>

                      <p className="text-[10px] text-slate-400">
                        {activity.display === "skipped"
                          ? "Roadmap alert"
                          : activity.status.replaceAll(
                              "_",
                              " "
                            )}
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={
            teacher
              ? "Total Students"
              : "My Classrooms"
          }
          value={
            teacher
              ? dashboard.students.length
              : visibleClasses.length
          }
          subtitle="Current selection"
          icon={Users}
          tone="blue"
        />

        <SummaryCard
          title="Completed"
          value={completed}
          subtitle={`${percent}% of deliverables`}
          icon={Check}
          tone="green"
        />

        <SummaryCard
          title="Not Completed"
          value={pending}
          subtitle="Awaiting completion"
          icon={Clock3}
          tone="yellow"
        />

        <SummaryCard
          title="Roadmap Alerts"
          value={skipped + incomplete}
          subtitle={`${skipped} skipped · ${incomplete} incomplete`}
          icon={CircleAlert}
          tone="red"
        />
      </div>
    </main>
  );
}
