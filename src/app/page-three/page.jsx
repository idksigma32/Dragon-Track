
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  Users,
  Pencil,
  Trash2,
  Save,
  X,
  RefreshCw,
  CalendarDays,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const statuses = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "skipped", label: "Skipped" },
];

function getError(error) {
  const message =
    error?.response?.message ||
    error?.message ||
    "Something went wrong.";

  const fields = error?.response?.data;

  return fields && Object.keys(fields).length
    ? `${message}\n${JSON.stringify(fields, null, 2)}`
    : message;
}

function dateValue(value) {
  return value ? value.slice(0, 10) : "";
}

function displayDate(value) {
  if (!value) return "No due date";

  const date = dateValue(value);
  const [year, month, day] = date.split("-");

  return `${month}/${day}/${year}`;
}

export default function DeliverablesPage() {
  const { user, isReady } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);

  const [classId, setClassId] = useState("");
  const [deliverableId, setDeliverableId] = useState("");
  const [search, setSearch] = useState("");

  const [formMode, setFormMode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyStudent, setBusyStudent] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isTeacher = user?.role === "teacher";

  async function getRecords(collection, options = {}) {
    return pb.collection(collection).getFullList({
      ...options,
      requestKey: null,
    });
  }

  async function loadData() {
    if (!user || !isTeacher) return;

    setLoading(true);
    setError("");

    try {
      const classes = await getRecords("classrooms", {
        filter: pb.filter(
          "teacher = {:id} && archived = false",
          { id: user.id }
        ),
        sort: "name",
      });

      setClassrooms(classes);

      if (!classes.length) {
        setDeliverables([]);
        setStudents([]);
        setEnrollments([]);
        setProgressRecords([]);
        return;
      }

      const classFilter = classes
        .map((c) =>
          pb.filter("classroom = {:id}", {
            id: c.id,
          })
        )
        .join(" || ");

      const [tasks, enrolled] = await Promise.all([
        getRecords("deliverables", {
          filter: classFilter,
        }),
        getRecords("enrollments", {
          filter: classFilter,
        }),
      ]);

      setDeliverables(tasks);
      setEnrollments(enrolled);

      const studentIds = [
        ...new Set(enrolled.map((e) => e.student)),
      ];

      const taskIds = tasks.map((t) => t.id);

      const [studentData, progressData] =
        await Promise.all([
          studentIds.length
            ? getRecords("students", {
                filter: studentIds
                  .map((id) =>
                    pb.filter("id = {:id}", { id })
                  )
                  .join(" || "),
                sort: "name",
              })
            : Promise.resolve([]),

          taskIds.length
            ? getRecords("progress", {
                filter: taskIds
                  .map((id) =>
                    pb.filter(
                      "deliverable = {:id}",
                      { id }
                    )
                  )
                  .join(" || "),
              })
            : Promise.resolve([]),
        ]);

      setStudents(studentData);
      setProgressRecords(progressData);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isReady && isTeacher) {
      loadData();
    } else if (isReady) {
      setLoading(false);
    }
  }, [isReady, user?.id, user?.role]);

  const currentClass = classrooms.some(
    (c) => c.id === classId
  )
    ? classId
    : classrooms[0]?.id || "";

  const selectedClassroom = classrooms.find(
    (c) => c.id === currentClass
  );

  const classTasks = useMemo(() => {
    return deliverables
      .filter((t) => t.classroom === currentClass)
      .sort((a, b) => {
        const aDate = a.due_date || "9999";
        const bDate = b.due_date || "9999";

        return (
          aDate.localeCompare(bDate) ||
          (a.created || "").localeCompare(
            b.created || ""
          )
        );
      });
  }, [deliverables, currentClass]);

  const currentTask = classTasks.some(
    (t) => t.id === deliverableId
  )
    ? deliverableId
    : classTasks[0]?.id || "";

  const selectedTask = classTasks.find(
    (t) => t.id === currentTask
  );

  const classStudents = useMemo(() => {
    const enrolledIds = new Set(
      enrollments
        .filter((e) => e.classroom === currentClass)
        .map((e) => e.student)
    );

    return students.filter((s) =>
      enrolledIds.has(s.id)
    );
  }, [students, enrollments, currentClass]);

  const progressMap = useMemo(() => {
    const map = new Map();

    for (const record of progressRecords) {
      const key =
        `${record.student}-${record.deliverable}`;

      const previous = map.get(key);

      if (
        !previous ||
        (record.updated || "") >
          (previous.updated || "")
      ) {
        map.set(key, record);
      }
    }

    return map;
  }, [progressRecords]);

  function getStatus(studentId, taskId) {
    return (
      progressMap.get(`${studentId}-${taskId}`)
        ?.status || "not_started"
    );
  }

  const completedCount = classStudents.filter(
    (s) =>
      getStatus(s.id, currentTask) === "completed"
  ).length;

  const totalStudents = classStudents.length;

  const completionPercent = totalStudents
    ? Math.round(
        (completedCount / totalStudents) * 100
      )
    : 0;

  const filteredTasks = classTasks.filter((t) =>
    `${t.title} ${t.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function closeForm() {
    setFormMode("");
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  function openAdd() {
    closeForm();
    setFormMode("add");
    setError("");
    setMessage("");
  }

  function openEdit(task) {
    setDeliverableId(task.id);
    setFormMode("edit");
    setTitle(task.title || "");
    setDescription(task.description || "");
    setDueDate(dateValue(task.due_date));
    setError("");
    setMessage("");
  }

  async function saveDeliverable(event) {
    event.preventDefault();

    if (!currentClass) {
      setError("Select a classroom first.");
      return;
    }

    if (!title.trim()) {
      setError("A deliverable title is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const values = {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || "",
      };

      let saved;

      if (formMode === "edit") {
        if (!selectedTask) {
          throw new Error(
            "Select a deliverable to edit."
          );
        }

        saved = await pb
          .collection("deliverables")
          .update(selectedTask.id, values);
      } else {
        saved = await pb
          .collection("deliverables")
          .create({
            ...values,
            classroom: currentClass,
          });
      }

      const wasEditing = formMode === "edit";

      setDeliverableId(saved.id);
      closeForm();

      await loadData();

      setMessage(
        wasEditing
          ? "Deliverable updated successfully."
          : "Deliverable created successfully."
      );
    } catch (err) {
      setError(
        `Could not save deliverable: ${getError(err)}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteDeliverable(task) {
    if (!task || deleting) return;

    const confirmed = window.confirm(
      `Delete "${task.title}"?\n\n` +
      "This permanently removes the deliverable. " +
      "Associated student progress may also be " +
      "deleted depending on your PocketBase " +
      "relation settings.\n\n" +
      "This cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      await pb
        .collection("deliverables")
        .delete(task.id);

      if (deliverableId === task.id) {
        setDeliverableId("");
      }

      closeForm();

      await loadData();

      setMessage(
        `"${task.title}" was deleted.`
      );
    } catch (err) {
      setError(
        `Could not delete deliverable: ${getError(err)}`
      );
    } finally {
      setDeleting(false);
    }
  }

  async function updateStatus(studentId, newStatus) {
    if (!currentTask || busyStudent) return;

    setBusyStudent(studentId);
    setError("");
    setMessage("");

    try {
      const existing = progressMap.get(
        `${studentId}-${currentTask}`
      );

      const values = {
        status: newStatus,
        submitted_at:
          newStatus === "completed"
            ? new Date().toISOString()
            : "",
      };

      let saved;

      if (existing) {
        saved = await pb
          .collection("progress")
          .update(existing.id, values);
      } else {
        saved = await pb
          .collection("progress")
          .create({
            student: studentId,
            deliverable: currentTask,
            ...values,
          });
      }

      setProgressRecords((previous) => [
        ...previous.filter(
          (p) =>
            !(
              p.student === studentId &&
              p.deliverable === currentTask
            )
        ),
        saved,
      ]);

      setMessage("Student progress saved.");
    } catch (err) {
      setError(
        `Could not update progress: ${getError(err)}`
      );
    } finally {
      setBusyStudent("");
    }
  }

  if (!isReady) {
    return <p className="p-6">Loading account...</p>;
  }

  if (!user) {
    return (
      <p className="p-6">
        Please{" "}
        <Link href="/sign-in" className="underline">
          sign in
        </Link>
        .
      </p>
    );
  }

  if (!isTeacher) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold">
              Teacher Access Only
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Deliverable management is available
              to teachers.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block underline"
            >
              Return to Dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
            DragonTrack
          </p>

          <h1 className="text-3xl font-bold">
            Deliverable Management
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, delete, and track
            classroom deliverables.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>

          <Button
            className="bg-orange-500 hover:bg-orange-600"
            disabled={!currentClass}
            onClick={
              formMode === "add"
                ? closeForm
                : openAdd
            }
          >
            {formMode === "add" ? (
              <X className="mr-2 size-4" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}

            {formMode === "add"
              ? "Cancel"
              : "Add Deliverable"}
          </Button>
        </div>
      </div>

      {/* MESSAGES */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <pre className="whitespace-pre-wrap break-words font-sans">
            {error}
          </pre>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {/* CLASSROOM SELECTOR */}
      <Card className="rounded-2xl">
        <CardContent className="space-y-2 p-5">
          <Label htmlFor="classroom">
            Select Classroom
          </Label>

          <select
            id="classroom"
            value={currentClass}
            onChange={(e) => {
              setClassId(e.target.value);
              setDeliverableId("");
              closeForm();
              setError("");
              setMessage("");
            }}
            className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
          >
            {!classrooms.length && (
              <option value="">
                No classrooms available
              </option>
            )}

            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.school_year
                  ? ` — ${c.school_year}`
                  : ""}
              </option>
            ))}
          </select>

          {selectedClassroom && (
            <p className="text-xs text-muted-foreground">
              Managing deliverables for{" "}
              {selectedClassroom.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Deliverables
              </p>
              <p className="text-3xl font-bold">
                {classTasks.length}
              </p>
            </div>
            <ClipboardList className="size-7 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Students
              </p>
              <p className="text-3xl font-bold">
                {totalStudents}
              </p>
            </div>
            <Users className="size-7 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Completed
              </p>
              <p className="text-3xl font-bold">
                {completedCount}
              </p>
            </div>
            <CheckCircle2 className="size-7 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* ADD / EDIT FORM */}
      {formMode && (
        <Card className="rounded-2xl border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {formMode === "edit" ? (
                <Pencil className="size-5 text-orange-500" />
              ) : (
                <Plus className="size-5 text-orange-500" />
              )}

              {formMode === "edit"
                ? "Edit Deliverable"
                : "Create Deliverable"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={saveDeliverable}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="task-title">
                  Title
                </Label>

                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Chapter 1 Worksheet"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">
                  Description
                </Label>

                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="What should students complete?"
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-due">
                  Due Date
                </Label>

                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="mr-2 size-4" />
                  {saving
                    ? "Saving..."
                    : formMode === "edit"
                    ? "Save Changes"
                    : "Create Deliverable"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* MAIN MANAGEMENT AREA */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* DELIVERABLE LIST */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>
              All Deliverables
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />

              <Input
                className="pl-9"
                placeholder="Search deliverables..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            {loading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading deliverables...
              </p>
            )}

            {!loading &&
              filteredTasks.length === 0 && (
                <div className="py-8 text-center">
                  <ClipboardList className="mx-auto mb-3 size-9 text-slate-300" />

                  <p className="font-medium">
                    No deliverables found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {search
                      ? "Try another search."
                      : "Create your first deliverable."}
                  </p>
                </div>
              )}

            {!loading &&
              filteredTasks.map((task) => {
                const selected =
                  task.id === currentTask;

                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-3 transition ${
                      selected
                        ? "border-orange-400 bg-orange-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDeliverableId(task.id);
                        if (formMode === "edit") {
                          closeForm();
                        }
                      }}
                      className="w-full text-left"
                    >
                      <p className="font-semibold">
                        {task.title}
                      </p>

                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {displayDate(task.due_date)}
                      </p>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          openEdit(task)
                        }
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleting}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() =>
                          deleteDeliverable(task)
                        }
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* SELECTED DELIVERABLE */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>
                {selectedTask?.title ||
                  "Select a Deliverable"}
              </CardTitle>

              {selectedTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openEdit(selectedTask)
                  }
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Details
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!selectedTask ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Create or select a deliverable
                to manage student progress.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.description ||
                      "No description added."}
                  </p>

                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Due:{" "}
                    {displayDate(
                      selectedTask.due_date
                    )}
                  </p>
                </div>

                {/* COMPLETION */}
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium">
                      Class Completion
                    </span>

                    <Badge variant="secondary">
                      {completedCount}/{totalStudents}
                    </Badge>
                  </div>

                  <Progress
                    value={completionPercent}
                    className="[&_[data-slot=progress-indicator]]:bg-blue-500"
                  />

                  <p className="mt-2 text-right text-sm font-semibold text-blue-600">
                    {completionPercent}% Completed
                  </p>
                </div>

                {/* STUDENT PROGRESS */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    Student Progress
                  </h3>

                  {classStudents.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No students are enrolled
                      in this classroom yet.
                    </p>
                  )}

                  {classStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {student.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {student.email ||
                            "No email"}
                        </p>
                      </div>

                      <select
                        aria-label={`Status for ${student.name}`}
                        value={getStatus(
                          student.id,
                          currentTask
                        )}
                        disabled={Boolean(busyStudent)}
                        onChange={(e) =>
                          updateStatus(
                            student.id,
                            e.target.value
                          )
                        }
                        className="rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        {statuses.map((status) => (
                          <option
                            key={status.value}
                            value={status.value}
                          >
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
