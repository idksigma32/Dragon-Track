
import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

export const dynamic = "force-dynamic";

function fail(message, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function getError(error) {
  return (
    error?.response?.message ||
    error?.message ||
    "Unknown database error."
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function latestProgress(records) {
  if (!records.length) return null;

  return [...records].sort((a, b) => {
    return (
      new Date(b.updated || b.created || 0) -
      new Date(a.updated || a.created || 0)
    );
  })[0];
}

export async function GET(request) {
  try {
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

    if (!url) {
      return fail(
        "PocketBase URL is missing.",
        500
      );
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return fail(
        "Please log in first.",
        401
      );
    }

    const pb = new PocketBase(url);

    pb.autoCancellation(false);
    pb.authStore.save(token);

    // 1. Authenticate student.
    let user;

    try {
      const auth = await pb
        .collection("users")
        .authRefresh();

      user = auth.record;
    } catch {
      return fail(
        "Session expired. Please log in again.",
        401
      );
    }

    if (user.role !== "student") {
      return fail(
        "Student access only.",
        403
      );
    }

    // 2. Find ALL profiles belonging to this account.
    // This handles duplicate student records.
    let students;

    try {
      students = await pb
        .collection("students")
        .getFullList({
          filter: pb.filter(
            "account = {:account}",
            { account: user.id }
          ),
          requestKey: null,
        });
    } catch (error) {
      console.error(
        "STUDENT LOOKUP ERROR:",
        getError(error)
      );

      return fail(
        "Could not load student profiles.",
        403
      );
    }

    if (!students.length) {
      return NextResponse.json({
        success: true,
        classrooms: [],
      });
    }

    // 3. Load enrollments for every profile.
    let enrollmentGroups;

    try {
      enrollmentGroups = await Promise.all(
        students.map((student) =>
          pb
            .collection("enrollments")
            .getFullList({
              filter: pb.filter(
                "student = {:student}",
                { student: student.id }
              ),
              requestKey: null,
            })
        )
      );
    } catch (error) {
      console.error(
        "ENROLLMENT ERROR:",
        getError(error)
      );

      return fail(
        "Could not load student enrollments.",
        403
      );
    }

    const enrollments = enrollmentGroups.flat();

    const classroomIds = unique(
      enrollments.map(
        (enrollment) => enrollment.classroom
      )
    );

    if (!classroomIds.length) {
      return NextResponse.json({
        success: true,
        classrooms: [],
      });
    }

    const classrooms = [];

    // 4. Load every enrolled classroom.
    for (const classroomId of classroomIds) {
      let classroom;

      try {
        classroom = await pb
          .collection("classrooms")
          .getOne(classroomId, {
            requestKey: null,
          });
      } catch (error) {
        console.error(
          "CLASSROOM ERROR:",
          getError(error)
        );

        return fail(
          "Enrollment exists, but the classroom cannot be read. Check the classrooms View API rule.",
          403
        );
      }

      // 5. Find every student profile for this
      // account that belongs to this classroom's
      // teacher. Progress may be attached to any
      // of these profiles, even if the enrollment
      // references a different duplicate profile.
      const teacherStudentIds = unique(
        students
          .filter(
            (student) =>
              student.teacher === classroom.teacher
          )
          .map((student) => student.id)
      );

      const enrolledStudentIds = unique(
        enrollments
          .filter(
            (enrollment) =>
              enrollment.classroom === classroomId
          )
          .map((enrollment) => enrollment.student)
      );

      const progressStudentIds = unique([
        ...teacherStudentIds,
        ...enrolledStudentIds,
      ]);

      // 6. Load classroom deliverables.
      let deliverables;

      try {
        deliverables = await pb
          .collection("deliverables")
          .getFullList({
            filter: pb.filter(
              "classroom = {:classroom}",
              { classroom: classroomId }
            ),
            sort: "due_date",
            requestKey: null,
          });
      } catch (error) {
        console.error(
          "DELIVERABLE ERROR:",
          getError(error)
        );

        return fail(
          "Could not load classroom deliverables.",
          403
        );
      }

      // 7. Load progress for all relevant student
      // profiles, including duplicate profiles.
      //
      // PocketBase still applies the progress
      // List/Search API rule. Students can only
      // receive records that rule allows.
      const progressByDeliverable = new Map();

      for (const studentId of progressStudentIds) {
        let records;

        try {
          records = await pb
            .collection("progress")
            .getFullList({
              filter: pb.filter(
                "student = {:student}",
                { student: studentId }
              ),
              requestKey: null,
            });
        } catch (error) {
          console.error(
            "PROGRESS ERROR:",
            getError(error)
          );

          return fail(
            "Could not load student progress.",
            403
          );
        }

        for (const record of records) {
          const current =
            progressByDeliverable.get(
              record.deliverable
            ) || [];

          current.push(record);

          progressByDeliverable.set(
            record.deliverable,
            current
          );
        }
      }

      // 8. Match progress to each deliverable.
      const items = deliverables.map(
        (deliverable) => {
          const matchingRecords =
            progressByDeliverable.get(
              deliverable.id
            ) || [];

          const progress =
            latestProgress(matchingRecords);

          return {
            id: deliverable.id,
            title: deliverable.title,
            description:
              deliverable.description || "",
            due_date:
              deliverable.due_date || null,
            created:
              deliverable.created || "",
            status:
              progress?.status ||
              "not_started",
            submitted_at:
              progress?.submitted_at || null,
            notes:
              progress?.notes || "",
            updated:
              progress?.updated || "",
          };
        }
      );

      const completed = items.filter(
        (item) =>
          item.status === "completed"
      ).length;

      const incomplete = items.filter(
        (item) =>
          item.status === "incomplete"
      ).length;

      const inProgress = items.filter(
        (item) =>
          item.status === "in_progress"
      ).length;

      classrooms.push({
        id: classroom.id,
        name: classroom.name,
        subject:
          classroom.subject || "",
        school_year:
          classroom.school_year || "",
        archived:
          Boolean(classroom.archived),
        deliverables: items,
        completed,
        incomplete,
        inProgress,
        total: items.length,
        completionPercentage: items.length
          ? Math.round(
              (completed / items.length) * 100
            )
          : 0,
      });
    }

    classrooms.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    console.log("DRAGONTRACK STUDENT SYNC:", {
      studentProfiles: students.length,
      enrollments: enrollments.length,
      classrooms: classrooms.length,
      deliverables: classrooms.reduce(
        (total, classroom) =>
          total + classroom.deliverables.length,
        0
      ),
      completed: classrooms.reduce(
        (total, classroom) =>
          total + classroom.completed,
        0
      ),
    });

    return NextResponse.json({
      success: true,
      classrooms,
    });
  } catch (error) {
    console.error(
      "MY CLASSROOMS ERROR:",
      error?.status,
      error?.message,
      error?.response?.data
    );

    return fail(
      "Failed to load classroom progress.",
      500
    );
  }
}
