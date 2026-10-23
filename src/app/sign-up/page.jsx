
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, Eye, EyeOff } from "lucide-react";

import { pb } from "@/pocketbase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teacherKey, setTeacherKey] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (role === "teacher") {
        const response = await fetch("/api/register-teacher", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            passwordConfirm: confirmPassword,
            teacherKey,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Teacher registration failed.");
        }
      } else {
        // Student role must be assigned by PocketBase defaults.
        await pb.collection("users").create({
          name: name.trim(),
          email: email.trim(),
          password,
          passwordConfirm: confirmPassword,
        });
      }

      await pb.collection("users").authWithPassword(
        email.trim(),
        password
      );

      router.push(role === "teacher" ? "/page-six" : "/");
      router.refresh();
    } catch (err) {
      setError(
        err.response?.message ||
          err.message ||
          "Could not create account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 p-4 dark:bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <GraduationCap className="size-8" />
          </div>

          <CardTitle className="text-3xl font-bold">
            Join DragonTrack
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Create your account to get started.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Choose your account type</Label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole("student");
                    setError("");
                  }}
                  className={`rounded-xl border-2 p-4 text-center transition ${
                    role === "student"
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/20"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <BookOpen className="mx-auto mb-2 size-6" />
                  <span className="font-semibold">Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole("teacher");
                    setError("");
                  }}
                  className={`rounded-xl border-2 p-4 text-center transition ${
                    role === "teacher"
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/20"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <GraduationCap className="mx-auto mb-2 size-6" />
                  <span className="font-semibold">Teacher</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {role === "teacher" && (
              <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:bg-orange-950/20">
                <Label htmlFor="teacherKey">
                  Teacher Registration Key
                </Label>

                <Input
                  id="teacherKey"
                  type="password"
                  value={teacherKey}
                  onChange={(e) => setTeacherKey(e.target.value)}
                  placeholder="Enter your teacher key"
                  autoComplete="off"
                  required
                />

                <p className="text-xs text-muted-foreground">
                  Teacher accounts require a registration key
                  provided by the DragonTrack administrator.
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {loading
                ? "Creating Account..."
                : `Create ${role === "teacher" ? "Teacher" : "Student"} Account`}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-orange-600 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
