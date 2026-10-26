import { Link } from "react-router-dom";
import useAuth from "../../../auth/context/useAuth.js";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const alumniModules = [
  {
    title: "My Profile",
    description:
      "View your account information and review your alumni profile.",
    path: "/alumni/profile",
    action: "View Profile",
  },
  {
    title: "Career Opportunities",
    description:
      "Explore career opportunities shared through the institution.",
    path: "/alumni/opportunities",
    action: "Explore Opportunities",
  },
  {
    title: "Community",
    description:
      "Connect with fellow alumni and stay engaged with your institution.",
    path: "/alumni/community",
    action: "Open Community",
  },
];

export default function AlumniDashboard() {
  const { user } = useAuth();

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.firstName ||
    user?.email?.split("@")[0] ||
    "Alumni";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumni Dashboard"
        description="Stay connected with your institution, explore opportunities, and engage with the alumni community."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Alumni Portal
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {displayName}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your connection with Aacharya continues beyond graduation.
              Manage your profile, discover opportunities, and stay connected
              with your college community.
            </p>
          </div>

          <Link
            to="/alumni/profile"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            View My Profile
          </Link>
        </div>
      </section>

      <section aria-labelledby="alumni-modules-heading">
        <div className="mb-4">
          <h2
            id="alumni-modules-heading"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            Your Alumni Workspace
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Access the services available to alumni.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alumniModules.map((module) => (
            <article
              key={module.path}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {module.title}
              </h3>

              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {module.description}
              </p>

              <div className="mt-5">
                <Link
                  to={module.path}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 focus:outline-none focus:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {module.action}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SectionCard
        title="Alumni Updates"
        description="Updates and announcements relevant to your alumni community."
      >
        <EmptyState
          title="No updates available"
          description="Alumni announcements will appear here when the relevant data is available."
        />
      </SectionCard>

      <SectionCard
        title="Career Opportunities"
        description="Keep track of opportunities shared with alumni."
      >
        <EmptyState
          title="No opportunities to display"
          description="Career opportunities will appear here when they are available through the platform."
        />

        <div className="mt-4">
          <Link
            to="/alumni/opportunities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Explore Opportunities
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}