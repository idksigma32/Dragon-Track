
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  BookOpen,
  CheckCircle2,
  UserMinus,
  Pencil,
  X,
  Save,
  RefreshCw,
  UserRound,
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

function getError(error) {
  return (
    error?.response?.message ||
    error?.message ||
    "Something went wrong."
  );
}

export default function StudentsPage() {
  const { user, isReady } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [progress, setProgress] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isTeacher = user?.role === "teacher";

  async function loadData() {
    if (!user || user.role !== "teacher") return;

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

      setClassrooms(classes);

      if (!classes.length) {
        setStudents([]);
        setEnrollments([]);
        setDeliverables([]);
        setProgress([]);
        return;
      }

      const classFilter = classes
        .map((c) =>
          pb.filter(
            "classroom = {:id}",
            { id: c.id }
          )
        )
        .join(" || ");

      const [
        enrollmentData,
        deliverableData,
      ] = await Promise.all([
        pb.collection("enrollments").getFullList({
          filter: classFilter,
          requestKey: null,
        }),

        pb.collection("deliverables").getFullList({
          filter: classFilter,
          requestKey: null,
        }),
      ]);

      setEnrollments(enrollmentData);
      setDeliverables(deliverableData);

      const studentIds = [
        ...new Set(
          enrollmentData.map((e) => e.student)
        ),
      ];

      const deliverableIds = deliverableData.map(
        (d) => d.id
      );

      const [
        studentData,
        progressData,
      ] = await Promise.all([
        studentIds.length
          ? pb.collection("students").getFullList({
              filter: studentIds
                .map((id) =>
                  pb.filter(
                    "id = {:id}",
                    { id }
                  )
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
                  pb.filter(
                    "deliverable = {:id}",
                    { id }
                  )
                )
                .join(" || "),
              requestKey: null,
            })
          : Promise.resolve([]),
      ]);

      setStudents(studentData);
      setProgress(progressData);
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
    (c) => c.id === selectedClass
  )
    ? selectedClass
    : classrooms[0]?.id || "";

  const selectedClassroom = classrooms.find(
    (c) => c.id === currentClass
  );

  const classEnrollments = useMemo(
    () =>
      enrollments.filter(
        (e) => e.classroom === currentClass
      ),
    [enrollments, currentClass]
  );

  const enrollmentByStudent = useMemo(() => {
    const map = new Map();

    for (const enrollment of classEnrollments) {
      if (!map.has(enrollment.student)) {
        map.set(enrollment.student, []);
      }

      map.get(enrollment.student).push(
        enrollment.id
      );
    }

    return map;
  }, [classEnrollments]);

  const classStudents = useMemo(
    () =>
      students.filter((s) =>
        enrollmentByStudent.has(s.id)
      ),
    [students, enrollmentByStudent]
  );

  const classDeliverables = useMemo(
    () =>
      deliverables.filter(
        (d) => d.classroom === currentClass
      ),
    [deliverables, currentClass]
  );

  const progressMap = useMemo(() => {
    const map = new Map();

    for (const record of progress) {
      const key =
        `${record.student}-${record.deliverable}`;

      const existing = map.get(key);

      if (
        !existing ||
        (record.updated || "") >
          (existing.updated || "")
      ) {
        map.set(key, record);
      }
    }

    return map;
  }, [progress]);

  function getStats(studentId) {
    const completed = classDeliverables.filter(
      (deliverable) => {
        const record = progressMap.get(
          `${studentId}-${deliverable.id}`
        );

        return record?.status === "completed";
      }
    ).length;

    const total = classDeliverables.length;

    return {
      completed,
      total,
      percent: total
        ? Math.round((completed / total) * 100)
        : 0,
    };
  }

  const filteredStudents = useMemo(() => {
    return classStudents
      .filter((s) =>
        `${s.name || ""} ${s.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
  }, [classStudents, search]);

  const completedTotal = classStudents.reduce(
    (sum, student) =>
      sum + getStats(student.id).completed,
    0
  );

  function resetAddForm() {
    setName("");
    setEmail("");
    setShowAdd(false);
  }

  function beginEdit(student) {
    setEditingId(student.id);
    setEditName(student.name || "");
    setEditEmail(student.email || "");
    setShowAdd(false);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditEmail("");
  }

  async function addStudent(event) {
    event.preventDefault();

    if (!currentClass) {
      setError("Select a classroom first.");
      return;
    }

    if (!name.trim()) {
      setError("Student name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let createdStudent = null;

    try {
      // Check whether a student profile with
      // this email already belongs to the teacher.
      // Do not create another duplicate profile.
      const normalizedEmail = email.trim().toLowerCase();

      let existing = null;

      if (normalizedEmail) {
        const matches = await pb
          .collection("students")
          .getFullList({
            filter: pb.filter(
              "teacher = {:teacher} && email = {:email}",
              {
                teacher: user.id,
                email: normalizedEmail,
              }
            ),
            requestKey: null,
          });

        existing = matches[0] || null;
      }

      if (existing) {
        const alreadyEnrolled = enrollments.some(
          (e) =>
            e.student === existing.id &&
            e.classroom === currentClass
        );

        if (alreadyEnrolled) {
          throw new Error(
            "This student is already in the classroom."
          );
        }
      }

      if (!existing) {
        createdStudent = await pb
          .collection("students")
          .create({
            name: name.trim(),
            email: normalizedEmail,
            teacher: user.id,
          });
      }

      const studentToEnroll =
        existing || createdStudent;

      await pb.collection("enrollments").create({
        student: studentToEnroll.id,
        classroom: currentClass,
      });

      resetAddForm();

      await loadData();

      setSuccess(
        `${studentToEnroll.name} added to the classroom.`
      );
    } catch (err) {
      if (createdStudent) {
        setError(
          "The student profile was created, but enrollment failed. " +
          getError(err)
        );
      } else {
        setError(getError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveStudent(event) {
    event.preventDefault();

    if (!editingId) return;

    if (!editName.trim()) {
      setError("Student name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const student = students.find(
        (s) => s.id === editingId
      );

      if (!student) {
        throw new Error("Student not found.");
      }

      const normalizedEmail =
        editEmail.trim().toLowerCase();

      // Do not overwrite the email on a linked
      // login profile without a dedicated account
      // update workflow.
      if (
        student.account &&
        normalizedEmail !==
          (student.email || "").toLowerCase()
      ) {
        throw new Error(
          "This student has a linked login account. " +
          "Their email must be changed through account settings."
        );
      }

      await pb.collection("students").update(
        editingId,
        {
          name: editName.trim(),
          email: normalizedEmail,
        }
      );

      cancelEdit();

      await loadData();

      setSuccess("Student details updated.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(student) {
    const enrollmentIds =
      enrollmentByStudent.get(student.id) || [];

    if (!enrollmentIds.length) {
      setError("Enrollment not found.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${student.name} from ${selectedClassroom?.name || "this classroom"}?\n\n` +
      "Their login account and existing progress records will not be deleted."
    );

    if (!confirmed) return;

    setRemoving(student.id);
    setError("");
    setSuccess("");

    try {
      // Reuse the existing teacher-authorized
      // removal API. Handle duplicate enrollments
      // for the same student and classroom.
      for (const enrollmentId of enrollmentIds) {
        const response = await fetch(
          "/api/classrooms/remove-student",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                `Bearer ${pb.authStore.token}`,
            },
            body: JSON.stringify({
              enrollmentId,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Could not remove student."
          );
        }
      }

      await loadData();

      setSuccess(
        `${student.name} removed from the classroom.`
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setRemoving("");
    }
  }

  if (!isReady) {
    return (
      <p className="p-6">
        Loading your account...
      </p>
    );
  }

  if (!user) {
    return (
      <p className="p-6">
        Please{" "}
        <Link
          href="/sign-in"
          className="underline"
        >
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
              Student management is available
              to teachers.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm underline"
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
            DragonTrack
          </p>

          <h1 className="text-3xl font-bold">
            Student Management
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit, remove, and track
            classroom students.
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
            onClick={() => {
              setShowAdd(!showAdd);
              cancelEdit();
              setError("");
              setSuccess("");
            }}
          >
            {showAdd ? (
              <X className="mr-2 size-4" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}

            {showAdd ? "Close Form" : "Add Student"}
          </Button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* CLASSROOM SELECTOR */}
      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-5">
          <Label htmlFor="classroom">
            Select Classroom
          </Label>

          <select
            id="classroom"
            value={currentClass}
            onChange={(event) => {
              setSelectedClass(event.target.value);
              setShowAdd(false);
              cancelEdit();
              setError("");
              setSuccess("");
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

          <p className="text-xs text-muted-foreground">
            Students shown below belong to the
            selected classroom.
          </p>
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Students
              </p>
              <p className="text-3xl font-bold">
                {classStudents.length}
              </p>
            </div>
            <Users className="size-7 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Deliverables
              </p>
              <p className="text-3xl font-bold">
                {classDeliverables.length}
              </p>
            </div>
            <BookOpen className="size-7 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Completed Tasks
              </p>
              <p className="text-3xl font-bold">
                {completedTotal}
              </p>
            </div>
            <CheckCircle2 className="size-7 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* ADD STUDENT */}
      {showAdd && (
        <Card className="rounded-2xl border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5 text-orange-500" />
              Add Student
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={addStudent}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-name">
                    Full Name
                  </Label>
                  <Input
                    id="new-name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Student name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-email">
                    Email
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="student@example.com"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This adds a student profile to the
                selected classroom. It does not
                create a login account.
              </p>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="mr-2 size-4" />
                  {saving
                    ? "Saving..."
                    : "Save Student"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAddForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STUDENT LIST */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                Classroom Students
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                {classStudents.length} student
                {classStudents.length === 1
                  ? ""
                  : "s"}{" "}
                enrolled
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search students..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading students...
            </p>
          )}

          {!loading &&
            !filteredStudents.length && (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-3 size-10 text-slate-300" />
                <p className="font-medium">
                  No students found
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search
                    ? "Try another search."
                    : "Add a student or share the classroom join code."}
                </p>
              </div>
            )}

          {!loading &&
            filteredStudents.map((student) => {
              const stats = getStats(student.id);
              const editing =
                editingId === student.id;

              return (
                <div
                  key={student.id}
                  className="rounded-xl border bg-white p-4 transition-colors hover:border-slate-300"
                >
                  {editing ? (
                    <form
                      onSubmit={saveStudent}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          Edit Student
                        </h3>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>
                            Full Name
                          </Label>
                          <Input
                            value={editName}
                            onChange={(e) =>
                              setEditName(
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Email
                          </Label>
                          <Input
                            type="email"
                            value={editEmail}
                            disabled={Boolean(
                              student.account
                            )}
                            onChange={(e) =>
                              setEditEmail(
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      {student.account && (
                        <p className="text-xs text-muted-foreground">
                          This student has a linked
                          account. Their email is
                          managed through account
                          settings.
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <Save className="mr-2 size-4" />
                          {saving
                            ? "Saving..."
                            : "Save Changes"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            <UserRound className="size-5" />
                          </div>

                          <div>
                            <h3 className="font-semibold">
                              {student.name}
                            </h3>

                            <p className="text-sm text-muted-foreground">
                              {student.email ||
                                "No email added"}
                            </p>

                            {student.account && (
                              <p className="mt-1 text-xs text-green-600">
                                Linked student account
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {stats.completed}/
                            {stats.total} Completed
                          </Badge>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              beginEdit(student)
                            }
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              removing === student.id
                            }
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              removeStudent(student)
                            }
                          >
                            <UserMinus className="mr-1 size-3.5" />
                            {removing === student.id
                              ? "Removing..."
                              : "Remove"}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <Progress
                          value={stats.percent}
                          className="flex-1 [&>div]:bg-blue-500"
                        />

                        <span className="w-12 text-right text-sm font-semibold">
                          {stats.percent}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </main>
  );
}
