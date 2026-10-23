
import PocketBase from "pocketbase";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function keysMatch(provided, expected) {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request) {
  try {
    const { name, email, password, passwordConfirm, teacherKey } =
      await request.json();

    const secret = process.env.TEACHER_REGISTRATION_KEY;
    const adminEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
    const adminPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

    if (!secret || !adminEmail || !adminPassword || !url) {
      return NextResponse.json(
        { error: "Teacher registration is not configured." },
        { status: 503 }
      );
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof passwordConfirm !== "string" ||
      typeof teacherKey !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid registration information." },
        { status: 400 }
      );
    }

    if (!keysMatch(teacherKey, secret)) {
      return NextResponse.json(
        { error: "Invalid teacher registration key." },
        { status: 403 }
      );
    }

    if (
      !name.trim() ||
      !email.trim() ||
      password.length < 8 ||
      password !== passwordConfirm
    ) {
      return NextResponse.json(
        { error: "Check your registration information." },
        { status: 400 }
      );
    }

    const admin = new PocketBase(url);

    await admin
      .collection("_superusers")
      .authWithPassword(adminEmail, adminPassword);

    await admin.collection("users").create({
      name: name.trim(),
      email: email.trim(),
      password,
      passwordConfirm,
      role: "teacher",
      emailVisibility: false,
    });

    return NextResponse.json(
      { message: "Teacher account created." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Teacher registration error:", error);

    return NextResponse.json(
      { error: "Could not create teacher account." },
      { status: 400 }
    );
  }
}
