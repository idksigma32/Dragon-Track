
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Mail,
  LockKeyhole,
  Palette,
  ShieldCheck,
  GraduationCap,
  Save,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { pb } from "@/pocketbase";
import { useAuth } from "@/hooks/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getErrorMessage(error) {
  const details = error?.response?.data;

  if (details) {
    const first = Object.values(details)[0];
    if (first?.message) return first.message;
  }

  return (
    error?.response?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
            <Icon className="size-5" />
          </div>

          <div>
            <CardTitle className="text-base text-slate-900">
              {title}
            </CardTitle>

            <CardDescription className="mt-1 text-xs">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const {
    user,
    isReady,
    logout,
    refresh,
    changePassword,
  } = useAuth();

  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user?.id, user?.name]);

  async function saveProfile(event) {
    event.preventDefault();

    if (!user || savingProfile) return;

    setProfileMessage(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setProfileMessage({
        type: "error",
        text: "Please enter a display name.",
      });
      return;
    }

    if (trimmedName === (user.name || "")) {
      setProfileMessage({
        type: "success",
        text: "Your profile is already up to date.",
      });
      return;
    }

    setSavingProfile(true);

    try {
      await pb.collection("users").update(user.id, {
        name: trimmedName,
      });

      if (typeof refresh === "function") {
        await refresh();
      } else {
        await pb.collection("users").authRefresh();
      }

      setProfileMessage({
        type: "success",
        text: "Your profile has been updated successfully.",
      });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (!user || savingPassword) return;

    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "Your new password must be at least 8 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Your new passwords do not match.",
      });
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordMessage({
        type: "error",
        text: "Choose a different password from your current one.",
      });
      return;
    }

    setSavingPassword(true);

    try {
      if (typeof changePassword === "function") {
        const result = await changePassword(
          oldPassword,
          newPassword,
          confirmPassword
        );

        if (result === false) {
          throw new Error("Unable to change your password.");
        }
      } else {
        await pb.collection("users").update(user.id, {
          oldPassword,
          password: newPassword,
          passwordConfirm: confirmPassword,
        });
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage({
        type: "success",
        text: "Your password has been changed successfully.",
      });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await logout();
      router.replace("/sign-in");
    } catch (error) {
      setSigningOut(false);
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    }
  }

  if (!isReady) {
    return (
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Loading settings...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Card className="mx-auto max-w-lg rounded-2xl bg-white">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-bold">
              Settings
            </h1>

            <p className="text-sm text-slate-500">
              Please sign in to manage your account settings.
            </p>

            <Button
              onClick={() => router.push("/sign-in")}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isTeacher = user.role === "teacher";
  const displayName = user.name || user.email || "User";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <main className="min-w-0 space-y-5 bg-transparent p-4 text-slate-800 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
          DragonTrack
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Manage your profile, security, and preferences.
        </p>
      </div>

      {/* ACCOUNT OVERVIEW */}
      <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-600">
            {initials || <UserRound className="size-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {displayName}
            </h2>

            <p className="truncate text-sm text-slate-500">
              {user.email}
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
              {isTeacher ? (
                <GraduationCap className="size-3.5" />
              ) : (
                <UserRound className="size-3.5" />
              )}

              {isTeacher ? "Teacher Account" : "Student Account"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {/* PROFILE */}
        <SettingSection
          icon={UserRound}
          title="Profile Information"
          description="Update how your name appears in DragonTrack."
        >
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-name"
                className="text-xs font-semibold text-slate-700"
              >
                Display Name
              </label>

              <Input
                id="settings-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setProfileMessage(null);
                }}
                placeholder="Your name"
                maxLength={100}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="settings-email"
                className="text-xs font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-slate-400" />

                <Input
                  id="settings-email"
                  value={user.email || ""}
                  readOnly
                  className="h-10 bg-slate-50 pl-9 text-slate-500"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Your email address cannot be changed from this page.
              </p>
            </div>

            {profileMessage && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                  profileMessage.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}

                {profileMessage.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingProfile || !name.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {savingProfile ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}

              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingSection>

        {/* SECURITY */}
        <SettingSection
          icon={LockKeyhole}
          title="Password & Security"
          description="Keep your DragonTrack account protected."
        >
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-old-password"
                className="text-xs font-semibold text-slate-700"
              >
                Current Password
              </label>

              <Input
                id="settings-old-password"
                type={showPasswords ? "text" : "password"}
                value={oldPassword}
                onChange={(event) =>
                  setOldPassword(event.target.value)
                }
                placeholder="Enter current password"
                autoComplete="current-password"
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="settings-new-password"
                className="text-xs font-semibold text-slate-700"
              >
                New Password
              </label>

              <Input
                id="settings-new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="settings-confirm-password"
                className="text-xs font-semibold text-slate-700"
              >
                Confirm New Password
              </label>

              <Input
                id="settings-confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repeat new password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-10"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800"
            >
              {showPasswords ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}

              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>

            {passwordMessage && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}

                {passwordMessage.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={
                savingPassword ||
                !oldPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="bg-orange-500 hover:bg-orange-600"
            >
              {savingPassword ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}

              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </SettingSection>

        {/* APPEARANCE */}
        <SettingSection
          icon={Palette}
          title="Appearance"
          description="Customize the appearance of your dashboard."
        >
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Color Theme
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Switch between light and dark mode.
              </p>
            </div>

            <ThemeToggle />
          </div>
        </SettingSection>

        {/* ACCOUNT DETAILS */}
        <SettingSection
          icon={ShieldCheck}
          title="Account Information"
          description="Information associated with your DragonTrack account."
        >
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-xs text-slate-500">
                Account Type
              </span>

              <span className="text-xs font-semibold capitalize text-slate-800">
                {user.role || "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-xs text-slate-500">
                Email
              </span>

              <span className="max-w-[65%] truncate text-xs font-medium text-slate-800">
                {user.email || "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-xs text-slate-500">
                Email Verification
              </span>

              <span
                className={`text-xs font-semibold ${
                  user.verified
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {user.verified ? "Verified" : "Not verified"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-xs text-slate-500">
                Member Since
              </span>

              <span className="text-xs font-medium text-slate-800">
                {user.created
                  ? new Date(user.created).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : "Not available"}
              </span>
            </div>
          </div>
        </SettingSection>
      </div>

      {/* SIGN OUT */}
      <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Sign Out
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              End your current DragonTrack session.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {signingOut ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}

            {signingOut ? "Signing Out..." : "Sign Out"}
          </Button>
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        DragonTrack · Classroom Progress Management
      </p>
    </main>
  );
}
