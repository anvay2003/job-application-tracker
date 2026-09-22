// app/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type ApplicationStatus = "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED";

interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  jobUrl: string | null;
  notes: string | null;
  dateApplied: string;
}

const STATUS_COLUMNS: ApplicationStatus[] = [
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  INTERVIEWING: "bg-amber-50 text-amber-700 border-amber-200",
  OFFER: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const COLUMN_ACCENTS: Record<ApplicationStatus, string> = {
  APPLIED: "border-t-blue-400",
  INTERVIEWING: "border-t-amber-400",
  OFFER: "border-t-green-400",
  REJECTED: "border-t-red-400",
};

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchApplications() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed to load applications");
      const data: Application[] = await res.json();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchApplications();
    }
  }, [sessionStatus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          jobUrl: jobUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create application");
      }

      setCompany("");
      setRole("");
      setJobUrl("");
      setNotes("");
      setShowForm(false);
      await fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(appId: string, newStatus: ApplicationStatus) {
    const previous = applications;
    // optimistic update so the card moves instantly
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );
    setUpdatingId(appId);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
    } catch (err) {
      setApplications(previous); // roll back on failure
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingId(null);
    }
  }

  const initialGroups: Record<ApplicationStatus, Application[]> = {
    APPLIED: [],
    INTERVIEWING: [],
    OFFER: [],
    REJECTED: [],
  };

  const applicationsByStatus = applications.reduce((acc, app) => {
    acc[app.status].push(app);
    return acc;
  }, initialGroups);

  if (sessionStatus === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Job Application Tracker
            </h1>
            <p className="text-xs text-gray-400">
              {applications.length} application
              {applications.length !== 1 && "s"} tracked
            </p>
          </div>

          <div className="flex items-center gap-3">
            {session?.user?.email && (
              <span className="hidden text-sm text-gray-500 sm:inline">
                {session.user.email}
              </span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Toggleable add-application form */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add Application
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  New Application
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  autoFocus
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="Notion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="SWE Intern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Job URL
                </label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="Referred by..."
                />
              </div>

              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Application"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Status columns */}
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">
              No applications yet — add your first one above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_COLUMNS.map((statusKey) => (
              <div
                key={statusKey}
                className={`rounded-lg border border-t-4 border-gray-200 bg-white p-4 ${COLUMN_ACCENTS[statusKey]}`}
              >
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                  {STATUS_LABELS[statusKey]}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {applicationsByStatus[statusKey].length}
                  </span>
                </h2>

                <div className="space-y-3">
                  {applicationsByStatus[statusKey].length === 0 && (
                    <p className="text-xs text-gray-300">Nothing here</p>
                  )}

                  {applicationsByStatus[statusKey].map((app) => (
                    <div
                      key={app.id}
                      className="rounded-md border border-gray-200 p-3 transition hover:border-gray-300 hover:shadow-sm"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {app.company}
                      </p>
                      <p className="text-xs text-gray-500">{app.role}</p>

                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(
                            app.id,
                            e.target.value as ApplicationStatus
                          )
                        }
                        disabled={updatingId === app.id}
                        className={`mt-2 w-full rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_STYLES[app.status]}`}
                      >
                        {STATUS_COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>

                      {app.jobUrl && (
                        <
                        a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                        >
                          View posting →
                        </a>
                      )}

                      {app.notes && (
                        <p className="mt-2 text-xs text-gray-500">{app.notes}</p>
                      )}

                      <p className="mt-2 text-[10px] text-gray-400">
                        Applied{" "}
                        {new Date(app.dateApplied).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}