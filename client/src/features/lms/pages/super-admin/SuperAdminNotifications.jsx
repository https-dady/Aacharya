import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function BellIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M10 21h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SuperAdminNotifications() {
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title="Notifications"
        description="Stay informed about institutional administration and account activity."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'Notifications',
          },
        ]}
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]">
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 text-[#CDB5F7]">
            <BellIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
              Activity centre
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#EAEAE6]">
              Your notifications
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
              This space will display relevant account and institutional
              updates when a notifications service is available.
            </p>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[#454650] bg-[#26272B] px-3 py-1.5 text-xs font-medium text-[#A5A6B0]">
            Service not connected
          </span>
        </div>
      </section>

      <SectionCard
        eyebrow="INBOX"
        title="Recent notifications"
        description="Notifications will appear here when they can be retrieved from the application backend."
        icon={<BellIcon />}
      >
        <EmptyState
          title="No notifications available"
          description="The current backend does not expose a notifications API. No sample alerts have been added, so this page reflects the actual integration status."
        />
      </SectionCard>

      <section className="mt-6 rounded-2xl border border-[#383943] bg-[#1D1F27] p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#92929F]">
          Quick access
        </p>

        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Continue administration
        </h3>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Open the relevant workspace to manage departments or provision
          Head of Department accounts.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/super-admin/departments"
            className="inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#454650] px-4 py-3 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Manage departments
            <ArrowRightIcon />
          </Link>

          <Link
            to="/super-admin/hods"
            className="inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#454650] px-4 py-3 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Manage HOD accounts
            <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}