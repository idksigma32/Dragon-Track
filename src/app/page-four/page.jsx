
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarX,
  TrendingDown,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { pb } from "@/pocketbase";
import { useAuth } from "@/hooks/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function todayLocal() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Date(
    `${value.slice(0, 10)}T12:00:00`
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.due_date?.slice(0, 10) || "9999-12-31";
    const bDate = b.due_date?.slice(0, 10) || "9999-12-31";

    return (
      aDate.localeCompare(bDate) ||
      (a.created || "").localeCompare(b.created || "")
    );
  });
}

function StatCard({ title, value, description, Icon, color }) {
  return (
    <Card className="rounded-xl border-slate-200/70 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {description}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-orange-100 text-orange-700",
    Review: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        colors[priority] || colors.Review
      }`}
    >
      {priority}
    </span>
  );
}

function StudentRow({ student, index, expanded, onToggle }) {
  const avatarColors = [
    "bg-blue-100 text-blue-600",
    "bg-orange-100 text-orange-600",
    "bg-purple-100 text-purple-600",
    "bg-green-100 text-green-600",
  ];

  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                avatarColors[index % avatarColors.length]
              }`}
            >
              {initials(student.name)}
            </div>
            <div>
              <p className="whitespace-nowrap font-semibold">
                {student.name}
              </p>
              <p className="text-[10px] text-slate-400">
                {student.email || "No email"}
              </p>
            </div>
          </div>
        </td>

        <td className="py-3 pr-3 text-slate-500">
          {student.classroomNames.join(", ")}
        </td>

        <td className="py-3 pr-4">
          <div className="flex min-w-24 items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${student.completion ?? 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold">
              {student.completion === null
                ? "—"
                : `${student.completion}%`}
            </span>
          </div>
        </td>

        <td className="py-3 pr-3">
          <div className="flex flex-wrap gap-1">
            {student.overdue > 0 && (
              <span className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
                {student.overdue} overdue
              </span>
            )}
            {student.skipped > 0 && (
              <span className="rounded bg-orange-50 px-2 py-1 text-[10px] text-orange-600">
                {student.skipped} skipped
              </span>
            )}
            {student.lowProgress && (
              <span className="rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-600">
                Low progress
              </span>
            )}
          </div>
        </td>

        <td className="py-3 pr-3">
          <PriorityBadge priority={student.priority} />
        </td>

        <td className="py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-blue-600 hover:bg-blue-50"
          >
            {expanded ? "Hide" : "View"}
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="p-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="size-4 text-orange-500" />
                <p className="text-xs font-bold">
                  Attention Details — {student.name}
                </p>
              </div>

              <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span>
                  {student.completed}/{student.total} completed
                </span>
                <span>{student.overdue} overdue</span>
                <span>{student.skipped} skipped</span>
              </div>

              <div className="space-y-2">
                {student.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 p-3"
                  >
                    <div>
                      <p className="text-xs font-semibold">
                        {issue.title}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {issue.classroom}
                        {issue.dueDate
                          ? ` · Due ${formatDate(issue.dueDate)}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        issue.type === "Overdue"
                          ? "bg-red-100 text-red-700"
                          : issue.type === "Skipped"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {issue.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RequiresAttentionPage() {
  const { user, isReady } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [progress, setProgress] = useState([]);

  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState(50);
  const [expanded, setExpanded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) return;

    if (!user || user.role !== "teacher") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const classes = await pb
          .collection("classrooms")
          .getFullList({
            filter: pb.filter(
              "teacher = {:id} && archived = false",
              { id: user.id }
            ),
            sort: "name",
            requestKey: null,
          });

        const classIds = classes.map((c) => c.id);
        let enrollmentRecords = [];
        let studentRecords = [];
        let taskRecords = [];
        let progressRecords = [];

        if (classIds.length) {
          const classFilterString = classIds
            .map((id) =>
              pb.filter("classroom = {:id}", { id })
            )
            .join(" || ");

          [enrollmentRecords, taskRecords] = await Promise.all([
            pb.collection("enrollments").getFullList({
              filter: classFilterString,
              requestKey: null,
            }),
            pb.collection("deliverables").getFullList({
              filter: classFilterString,
              requestKey: null,
            }),
          ]);

          const studentIds = [
            ...new Set(
              enrollmentRecords.map((e) => e.student)
            ),
          ];

          if (studentIds.length) {
            studentRecords = await pb
              .collection("students")
              .getFullList({
                filter: studentIds
                  .map((id) =>
                    pb.filter("id = {:id}", { id })
                  )
                  .join(" || "),
                sort: "name",
                requestKey: null,
              });
          }

          const taskIds = taskRecords.map((d) => d.id);

          if (taskIds.length) {
            progressRecords = await pb
              .collection("progress")
              .getFullList({
                filter: taskIds
                  .map((id) =>
                    pb.filter("deliverable = {:id}", { id })
                  )
                  .join(" || "),
                requestKey: null,
              });
          }
        }

        if (cancelled) return;

        setClassrooms(classes);
        setStudents(studentRecords);
        setEnrollments(enrollmentRecords);
        setDeliverables(taskRecords);
        setProgress(progressRecords);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.message ||
              err?.message ||
              "Could not load student progress."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isReady, user?.id, user?.role, refreshKey]);

  const analysis = useMemo(() => {
    const today = todayLocal();

    const progressMap = new Map(
      progress.map((p) => [
        `${p.student}:${p.deliverable}`,
        p.status,
      ])
    );

    const classMap = new Map(
      classrooms.map((c) => [c.id, c])
    );

    const results = [];

    for (const student of students) {
      const studentClassIds = [
        ...new Set(
          enrollments
            .filter(
              (e) =>
                e.student === student.id &&
                (classFilter === "all" ||
                  e.classroom === classFilter)
            )
            .map((e) => e.classroom)
        ),
      ];

      if (!studentClassIds.length) continue;

      const issues = [];
      let completed = 0;
      let total = 0;
      let overdue = 0;
      let skipped = 0;

      for (const classroomId of studentClassIds) {
        const tasks = sortTasks(
          deliverables.filter(
            (d) => d.classroom === classroomId
          )
        );

        const className =
          classMap.get(classroomId)?.name || "Classroom";

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];

          const status =
            progressMap.get(`${student.id}:${task.id}`) ||
            "not_started";

          total++;

          if (status === "completed") {
            completed++;
            continue;
          }

          const laterCompleted =
            status !== "incomplete" &&
            tasks.slice(i + 1).some(
              (later) =>
                progressMap.get(
                  `${student.id}:${later.id}`
                ) === "completed"
            );

          const isOverdue =
            Boolean(task.due_date) &&
            task.due_date.slice(0, 10) < today;

          if (laterCompleted) {
            skipped++;
            issues.push({
              id: `${classroomId}:${task.id}:skipped`,
              type: "Skipped",
              title: task.title,
              classroom: className,
              dueDate: task.due_date,
            });
          }

          if (isOverdue) {
            overdue++;
            issues.push({
              id: `${classroomId}:${task.id}:overdue`,
              type: "Overdue",
              title: task.title,
              classroom: className,
              dueDate: task.due_date,
            });
          }
        }
      }

      const completion =
        total > 0
          ? Math.round((completed / total) * 100)
          : null;

      const lowProgress =
        completion !== null && completion < threshold;

      if (lowProgress) {
        issues.push({
          id: `${student.id}:low`,
          type: "Low Progress",
          title: `${completion}% completed`,
          classroom: "Overall",
          dueDate: null,
        });
      }

      if (!issues.length) continue;

      let priority = "Review";

      if (overdue >= 3 || skipped >= 3) {
        priority = "High";
      } else if (overdue > 0 || skipped > 0) {
        priority = "Medium";
      }

      results.push({
        ...student,
        classroomNames: studentClassIds
          .map((id) => classMap.get(id)?.name)
          .filter(Boolean),
        completed,
        total,
        completion,
        overdue,
        skipped,
        lowProgress,
        priority,
        issues,
      });
    }

    const order = {
      High: 0,
      Medium: 1,
      Review: 2,
    };

    return results.sort(
      (a, b) =>
        order[a.priority] - order[b.priority] ||
        b.overdue - a.overdue ||
        b.skipped - a.skipped ||
        a.name.localeCompare(b.name)
    );
  }, [
    students,
    classrooms,
    enrollments,
    deliverables,
    progress,
    classFilter,
    threshold,
  ]);

  const filtered = useMemo(
    () =>
      analysis.filter((student) =>
        `${student.name} ${student.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [analysis, search]
  );

  const stats = {
    overdue: analysis.filter((s) => s.overdue > 0).length,
    skipped: analysis.filter((s) => s.skipped > 0).length,
    low: analysis.filter((s) => s.lowProgress).length,
  };

  function toggleExpanded(id) {
    setExpanded((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : [...old, id]
    );
  }

  if (!isReady || loading) {
    return (
      <main className="p-6 text-sm text-slate-500">
        Loading students requiring attention...
      </main>
    );
  }

  if (!user || user.role !== "teacher") {
    return (
      <main className="p-6 text-sm text-slate-600">
        This page is available to teachers only.
      </main>
    );
  }

  return (
    <main className="min-w-0 space-y-5 bg-transparent p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-500">
            DragonTrack
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Requires Attention
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Identify students who may need additional support.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((key) => key + 1)}
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="Overdue"
          value={stats.overdue}
          Icon={CalendarX}
          color="bg-red-50 text-red-600"
          description="Students with overdue work"
        />
        <StatCard
          title="Skipped"
          value={stats.skipped}
          Icon={AlertTriangle}
          color="bg-orange-50 text-orange-600"
          description="Students with skipped steps"
        />
        <StatCard
          title="Low Progress"
          value={stats.low}
          Icon={TrendingDown}
          color="bg-blue-50 text-blue-600"
          description={`Below ${threshold}% completion`}
        />
      </div>

      <Card className="rounded-xl border-slate-200/70 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">
                Students Requiring Attention
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {analysis.length} students flagged for review
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={classFilter}
                onChange={(e) =>
                  setClassFilter(e.target.value)
                }
                className="h-9 max-w-44 rounded-md border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="all">All Classrooms</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={threshold}
                onChange={(e) =>
                  setThreshold(Number(e.target.value))
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
              >
                <option value={25}>Low progress: 25%</option>
                <option value={50}>Low progress: 50%</option>
                <option value={75}>Low progress: 75%</option>
              </select>
            </div>
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-full bg-green-50 p-4">
                <CheckCircle2 className="size-7 text-green-500" />
              </div>
              <h3 className="text-sm font-semibold">
                No students requiring attention
              </h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                No students match the current filters and
                attention criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Classroom</th>
                    <th className="pb-3 font-semibold">Progress</th>
                    <th className="pb-3 font-semibold">Issues</th>
                    <th className="pb-3 font-semibold">Priority</th>
                    <th className="pb-3 text-right font-semibold">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((student, index) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      index={index}
                      expanded={expanded.includes(student.id)}
                      onToggle={() =>
                        toggleExpanded(student.id)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 p-3 text-xs text-orange-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          Attention flags are suggestions based on recorded
          progress, not judgments about students. Overdue work
          is based on due dates; skipped steps are detected
          from roadmap order.
        </p>
      </div>
    </main>
  );
}
