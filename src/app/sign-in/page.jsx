
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/auth";
import { isPocketBaseConfigured } from "@/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const { user, isReady, isPending, error, login } = useAuth();

  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function signIn(data) {
    try {
      await login(data);
      router.replace("/");
    } catch {
      // The auth hook displays the error.
    }
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-bold text-orange-500">
            DragonTrack
          </h1>

          <CardTitle className="text-2xl">
            Welcome Back
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {!isPocketBaseConfigured ? (
            <p className="text-red-500">
              PocketBase is not configured.
            </p>
          ) : !isReady ? (
            <p>Checking your account...</p>
          ) : user ? (
            <div className="space-y-3 text-center">
              <p>You are already signed in.</p>

              <Link href="/" className="block">
                <Button className="w-full">
                  Open Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(signIn)}
              className="space-y-4"
            >
              <fieldset disabled={isPending} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    {...register("email")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    {...register("password")}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-500">
                    {error.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={isPending}
                >
                  {isPending ? "Signing in..." : "Sign In"}
                </Button>
              </fieldset>
            </form>
          )}

          <p className="mt-5 text-center text-sm">
            Don't have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-orange-500"
            >
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
