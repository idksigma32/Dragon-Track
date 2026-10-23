
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, School, Archive, Copy, RefreshCw,
  BookOpen, KeyRound, CheckCircle2, AlertCircle,
  Pencil, Trash2, Users, X
} from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { pb } from "@/pocketbase";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    b => ALPHABET[b % ALPHABET.length]
  ).join("");
}

function errorText(err) {
  console.error("DragonTrack error:", err);

  if (err?.isAbort || err?.status === 0) {
    return "";
  }

  return (
    err?.response?.message ||
    err?.message ||
    `Request failed (${err?.status || "unknown"})`
  );
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pb.authStore.token}`,
      ...options.headers
    }
  });

  const text = await response.text();
  let result;

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server error (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(result.error || result.message || "Request failed.");
  }

  return result;
}

export default function ClassroomsPage() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <main className="p-6">Loading DragonTrack...</main>;
  }

  if (!user) {
    return (
      <main className="p-6">
        Please <Link href="/sign-in" className="underline">sign in</Link>.
      </main>
    );
  }

  return user.role === "teacher"
    ? <TeacherClassrooms user={user} />
    : <StudentClassrooms user={user} />;
}

/* STUDENT CLASSROOM VIEW */

function StudentClassrooms({ user }) {
  const [classrooms, setClassrooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requestController = useRef(null);

  const loadClassrooms = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    try {
      const result = await apiRequest("/api/classrooms/my", {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setClassrooms(Array.isArray(result.classrooms) ? result.classrooms : []);
      setError("");
    } catch (err) {
      if (!controller.signal.aborted) setError(errorText(err));
    } finally {
      if (!controller.signal.aborted) {
        requestController.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    queueMicrotask(() => {
      if (active) loadClassrooms();
    });

    const refresh = () => loadClassrooms();
    const visibility = () => {
      if (document.visibilityState === "visible") loadClassrooms();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visibility);

    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visibility);
      requestController.current?.abort();
    };
  }, [user?.id, loadClassrooms]);

  async function joinClassroom(e) {
    e.preventDefault();
    if (joining) return;

    setError("");
    setSuccess("");

    const code = joinCode.trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
      setError("Enter a valid 8-character classroom code.");
      return;
    }

    setJoining(true);

    try {
      const result = await apiRequest("/api/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ code })
      });

      setSuccess(result.message || "Successfully joined classroom!");
      setJoinCode("");
      await loadClassrooms();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setJoining(false);
    }
  }

  const visible = classrooms.filter(c =>
    `${c.name || ""} ${c.subject || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const totalDeliverables = classrooms.reduce(
    (sum, c) => sum + (c.deliverables?.length || 0), 0
  );

  return (
    <main className="space-y-6 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Classrooms</h1>
          <p className="text-sm text-slate-500">
            View your classrooms and progress.
          </p>
        </div>
        <Button variant="outline" onClick={loadClassrooms} disabled={loading}>
          <RefreshCw className="mr-2 size-4" />Refresh
        </Button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">{success}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500">Joined Classrooms</p>
              <p className="text-3xl font-bold">{classrooms.length}</p>
            </div>
            <School className="size-8 text-orange-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500">Assigned Deliverables</p>
              <p className="text-3xl font-bold">{totalDeliverables}</p>
            </div>
            <BookOpen className="size-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-orange-500" />
            Join a Classroom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-500">
            Enter the code provided by your teacher.
          </p>
          <form onSubmit={joinClassroom} className="flex flex-wrap gap-3">
            <Input
              className="w-48 font-mono uppercase tracking-wider"
              placeholder="Classroom code"
              maxLength={8}
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                setError("");
                setSuccess("");
              }}
            />
            <Button disabled={joining} className="bg-orange-500 hover:bg-orange-600">
              {joining ? "Joining..." : "Join Classroom"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My Classes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search classrooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="py-8 text-center">Loading classrooms...</p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              {classrooms.length ? "No matching classrooms." : "No classrooms joined yet."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map(c => {
                const tasks = Array.isArray(c.deliverables) ? c.deliverables : [];
                const completed = tasks.filter(t => t.status === "completed").length;
                const percent = tasks.length
                  ? Math.round(completed / tasks.length * 100)
                  : 0;

                return (
                  <Card key={c.id} className="bg-white">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{c.name}</h3>
                          <p className="text-sm text-slate-500">{c.subject}</p>
                          <p className="text-xs text-slate-400">{c.school_year}</p>
                        </div>
                        <Badge variant="secondary">Enrolled</Badge>
                      </div>

                      <div>
                        <div className="mb-2 flex justify-between text-sm">
                          <span>My Progress</span>
                          <strong>{percent}%</strong>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {completed} of {tasks.length} deliverables completed
                        </p>
                      </div>

                      <div className="space-y-2 border-t pt-3">
                        <p className="font-semibold">Deliverables</p>
                        {tasks.length === 0 && (
                          <p className="text-sm text-slate-500">
                            No deliverables assigned yet.
                          </p>
                        )}
                        {tasks.map(t => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"
                          >
                            <span className="min-w-0 truncate text-sm">{t.title}</span>
                            <Badge variant="outline">
                              {(t.status || "not_started").replaceAll("_", " ")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400">
                        Progress is managed by your teacher.
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

/* TEACHER CLASSROOM MANAGEMENT */

function TeacherClassrooms({ user }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026-2027");

  const [deleting, setDeleting] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const records = await pb.collection("classrooms").getFullList({
        filter: pb.filter("teacher = {:id}", { id: user.id }),
        sort: "name",
        requestKey: null
      });
      setClassrooms(records);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) loadClassrooms();
    });
    return () => {
      active = false;
    };
  }, [loadClassrooms]);

  function openForm(classroom = null) {
    setEditing(classroom || "new");
    setName(classroom?.name || "");
    setSubject(classroom?.subject || "");
    setSchoolYear(classroom?.school_year || "2026-2027");
    setError("");
    setSuccess("");
    setDeleting(null);
  }

  function closeForm() {
    setEditing(null);
    setName("");
    setSubject("");
    setSchoolYear("2026-2027");
  }

  async function saveClassroom(e) {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setError("Enter a classroom name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const values = {
        name: name.trim(),
        subject: subject.trim(),
        school_year: schoolYear.trim()
      };

      if (editing === "new") {
        await pb.collection("classrooms").create({
          ...values,
          teacher: user.id,
          archived: false,
          join_code: newCode()
        });
        setSuccess("Classroom created successfully.");
      } else {
        await pb.collection("classrooms").update(editing.id, values);
        setSuccess("Classroom updated successfully.");
      }

      closeForm();
      await loadClassrooms();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateClassroom(classroom, values, message) {
    if (busyId || saving) return;

    setBusyId(classroom.id);
    setError("");
    setSuccess("");

    try {
      await pb.collection("classrooms").update(classroom.id, values);
      await loadClassrooms();
      setSuccess(message);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId("");
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess("Classroom code copied!");
      setError("");
    } catch {
      setError("Could not copy code.");
    }
  }

  function openDelete(classroom) {
    setDeleting(classroom);
    setDeleteConfirmation("");
    closeForm();
    setError("");
    setSuccess("");
  }

  async function deleteClassroom() {
    if (!deleting || busyId) return;

    if (deleteConfirmation !== deleting.name) {
      setError("Type the exact classroom name to confirm.");
      return;
    }

    const classroom = deleting;
    setBusyId(classroom.id);
    setError("");
    setSuccess("");

    try {
      await pb.collection("classrooms").delete(classroom.id);
      setDeleting(null);
      setDeleteConfirmation("");
      await loadClassrooms();
      setSuccess(`"${classroom.name}" deleted successfully.`);
    } catch (err) {
      setError(
        "Could not delete classroom. Related records or permissions may prevent deletion. " +
        errorText(err)
      );
    } finally {
      setBusyId("");
    }
  }

  const active = classrooms.filter(c => !c.archived);
  const archived = classrooms.filter(c => c.archived);

  const visible = classrooms.filter(c =>
    Boolean(c.archived) === showArchived &&
    `${c.name || ""} ${c.subject || ""} ${c.school_year || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="space-y-6 p-4 text-slate-800 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
            DragonTrack
          </p>
          <h1 className="text-3xl font-bold">Classroom Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit, archive, and manage classrooms.
          </p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={() => editing === "new" ? closeForm() : openForm()}
        >
          <Plus className="mr-2 size-4" />
          Create Classroom
        </Button>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="size-4 shrink-0" />
          {success}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500">Active Classrooms</p>
              <p className="text-3xl font-bold">{active.length}</p>
            </div>
            <School className="size-8 text-orange-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500">Archived Classrooms</p>
              <p className="text-3xl font-bold">{archived.length}</p>
            </div>
            <Archive className="size-8 text-slate-500" />
          </CardContent>
        </Card>
      </div>

      {/* CREATE / EDIT FORM */}
      {editing && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-orange-500" />
              {editing === "new" ? "Create Classroom" : "Edit Classroom"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={saveClassroom} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Classroom Name
                </label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Geometry Period 1"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Mathematics"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  School Year
                </label>
                <Input
                  value={schoolYear}
                  onChange={e => setSchoolYear(e.target.value)}
                  placeholder="2026-2027"
                  pattern="[0-9]{4}-[0-9]{4}"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  {saving ? "Saving..." : editing === "new" ? "Create Classroom" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DELETE CONFIRMATION */}
      {deleting && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Delete Classroom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Permanently delete <strong>{deleting.name}</strong>?
              This cannot be undone. Related enrollments,
              deliverables, and progress may also be affected.
            </p>
            <p className="text-sm text-slate-500">
              Archiving is recommended if you want to keep classroom records.
            </p>
            <label className="block text-sm font-medium">
              Type <strong>{deleting.name}</strong> to confirm:
            </label>
            <Input
              value={deleteConfirmation}
              onChange={e => setDeleteConfirmation(e.target.value)}
              placeholder="Exact classroom name"
            />
            <div className="flex gap-2">
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteConfirmation !== deleting.name || Boolean(busyId)}
                onClick={deleteClassroom}
              >
                <Trash2 className="mr-2 size-4" />
                {busyId ? "Deleting..." : "Delete Permanently"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleting(null);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLASSROOM LIST */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Your Classrooms</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="mr-2 size-4" />
                {showArchived ? "Show Active" : "Show Archived"}
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                onClick={loadClassrooms}
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search classrooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading classrooms...</p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              {showArchived ? "No archived classrooms found." : "No active classrooms found."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map(c => (
                <Card key={c.id} className="bg-white">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{c.name}</h3>
                        <p className="text-sm text-slate-500">
                          {c.subject || "No subject"}
                        </p>
                      </div>
                      <Badge variant="secondary">{c.school_year || "No year"}</Badge>
                    </div>

                    {/* JOIN CODE */}
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                      <p className="mb-2 text-xs font-medium text-orange-900">
                        Student Join Code
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xl font-bold tracking-widest text-orange-950">
                          {c.join_code || "No code"}
                        </span>
                        {c.join_code && (
                          <Button size="sm" variant="outline" onClick={() => copyCode(c.join_code)}>
                            <Copy className="mr-1 size-4" />Copy
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* MANAGEMENT ACTIONS */}
                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openForm(c)}
                      >
                        <Pencil className="mr-1 size-4" />Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busyId)}
                        onClick={() => {
                          if (!c.archived && !window.confirm(
                            `Archive "${c.name}"? It will be hidden from active lists.`
                          )) return;

                          updateClassroom(
                            c,
                            { archived: !c.archived },
                            c.archived ? "Classroom restored." : "Classroom archived."
                          );
                        }}
                      >
                        <Archive className="mr-1 size-4" />
                        {c.archived ? "Restore" : "Archive"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busyId)}
                        onClick={() => {
                          if (c.join_code && !window.confirm(
                            "Generate a new join code? The old code will stop working."
                          )) return;

                          updateClassroom(
                            c,
                            { join_code: newCode() },
                            "New join code generated."
                          );
                        }}
                      >
                        <RefreshCw className="mr-1 size-4" />
                        {c.join_code ? "Reset Code" : "Create Code"}
                      </Button>

                      {!c.archived && (
                        <>
                          <Link
                            href="/page-two"
                            className="inline-flex items-center rounded-md border px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            <Users className="mr-1 size-4" />Students
                          </Link>
                          <Link
                            href="/page-three"
                            className="inline-flex items-center rounded-md border px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            <BookOpen className="mr-1 size-4" />Deliverables
                          </Link>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={Boolean(busyId)}
                        onClick={() => openDelete(c)}
                      >
                        <Trash2 className="mr-1 size-4" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
