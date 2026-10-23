
import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

export const dynamic = "force-dynamic";

function errorResponse(message, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function getPocketBaseError(error) {
  const status = error?.status || 500;

  const message =
    error?.response?.message ||
    error?.message ||
    "Unknown PocketBase error";

  const details = error?.response?.data
    ? JSON.stringify(error.response.data)
    : "";

  console.error("POCKETBASE ERROR:", {
    status,
    message,
    details,
  });

  return {
    status,
    message,
    details,
  };
}

export async function POST(request) {
  try {
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

    if (!url) {
      return errorResponse(
        "PocketBase URL is not configured.",
        500
      );
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return errorResponse(
        "Please log in first.",
        401
      );
    }

    const pb = new PocketBase(url);
    pb.autoCancellation(false);
    pb.authStore.save(token);

    // STEP 1: Authenticate student.
    let user;

    try {
      const auth = await pb
        .collection("users")
        .authRefresh();

      user = auth.record;
    } catch (error) {
      const info = getPocketBaseError(error);

      return errorResponse(
        `Authentication failed: ${info.status} - ${info.message}`,
        401
      );
    }

    if (user.role !== "student") {
      return errorResponse(
        "Only students can join classrooms.",
        403
      );
    }

    // STEP 2: Validate classroom code.
    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Invalid request body.",
        400
      );
    }

    const code = String(body?.code || "")
      .trim()
      .toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
      return errorResponse(
        "Please enter a valid 8-character classroom code.",
        400
      );
    }

    console.log("===== DRAGONTRACK JOIN DEBUG =====");
    console.log("USER ROLE:", user.role);
    console.log("JOIN CODE:", code);

    // STEP 3: Find classroom.
    let classroom;

    try {
      classroom = await pb
        .collection("classrooms")
        .getFirstListItem(
          pb.filter(
            "join_code = {:code} && archived = false",
            { code }
          )
        );
    } catch (error) {
      const info = getPocketBaseError(error);

      return errorResponse(
        `Classroom lookup failed: ${info.status} - ${info.message}`,
        info.status
      );
    }

    console.log("CLASSROOM FOUND:", classroom.id);

    // STEP 4: Find existing student records.
    let studentRecords;

    try {
      studentRecords = await pb
        .collection("students")
        .getFullList({
          filter: pb.filter(
            "account = {:account} && teacher = {:teacher}",
            {
              account: user.id,
              teacher: classroom.teacher,
            }
          ),
          requestKey: null,
        });
    } catch (error) {
      const info = getPocketBaseError(error);

      console.error(
        "STUDENT LOOKUP FAILED:",
        info
      );

      return errorResponse(
        `Student lookup failed: ${info.status} - ${info.message}${
          info.details
            ? ` - ${info.details}`
            : ""
        }`,
        info.status
      );
    }

    console.log(
      "EXISTING STUDENT RECORDS:",
      studentRecords.length
    );

    // STEP 5: Check for existing enrollment
    // across all matching student records.
    for (const student of studentRecords) {
      let existingEnrollments;

      try {
        existingEnrollments = await pb
          .collection("enrollments")
          .getFullList({
            filter: pb.filter(
              "student = {:student} && classroom = {:classroom}",
              {
                student: student.id,
                classroom: classroom.id,
              }
            ),
            requestKey: null,
          });
      } catch (error) {
        const info = getPocketBaseError(error);

        return errorResponse(
          `Enrollment lookup failed: ${info.status} - ${info.message}${
            info.details
              ? ` - ${info.details}`
              : ""
          }`,
          info.status
        );
      }

      if (existingEnrollments.length > 0) {
        console.log(
          "ALREADY ENROLLED:",
          existingEnrollments[0].id
        );

        return NextResponse.json({
          success: true,
          alreadyJoined: true,
          message:
            "You are already in this classroom!",
          classroom: {
            id: classroom.id,
            name: classroom.name,
            subject: classroom.subject,
          },
          enrollmentId:
            existingEnrollments[0].id,
        });
      }
    }

    // STEP 6: Reuse existing student record
    // or create one if none exists.
    let student = studentRecords[0];

    if (!student) {
      try {
        student = await pb
          .collection("students")
          .create({
            name:
              user.name ||
              user.email?.split("@")[0] ||
              "Student",
            email: user.email,
            account: user.id,
            teacher: classroom.teacher,
          });
      } catch (error) {
        const info = getPocketBaseError(error);

        return errorResponse(
          `Student creation failed: ${info.status} - ${info.message}${
            info.details
              ? ` - ${info.details}`
              : ""
          }`,
          info.status
        );
      }
    }

    // STEP 7: Create enrollment.
    let enrollment;

    try {
      enrollment = await pb
        .collection("enrollments")
        .create({
          student: student.id,
          classroom: classroom.id,
        });
    } catch (error) {
      const info = getPocketBaseError(error);

      return errorResponse(
        `Enrollment creation failed: ${info.status} - ${info.message}${
          info.details
            ? ` - ${info.details}`
            : ""
        }`,
        info.status
      );
    }

    console.log(
      "ENROLLMENT CREATED:",
      enrollment.id
    );

    console.log(
      "===== JOIN SUCCESSFUL ====="
    );

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      message:
        `Successfully joined ${classroom.name}!`,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        subject: classroom.subject,
      },
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    const info = getPocketBaseError(error);

    return errorResponse(
      `Unexpected join error: ${info.status} - ${info.message}`,
      500
    );
  }
}
