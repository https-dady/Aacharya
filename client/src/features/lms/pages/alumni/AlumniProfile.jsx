import { useEffect, useState } from "react";
import useAuth from "../../../auth/context/useAuth.js";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const EMPTY_PROFILE = {
  name: "",
  email: "",
  phone: "",
  graduationYear: "",
  department: "",
  designation: "",
  company: "",
  location: "",
  linkedIn: "",
  bio: "",
};

function getInitialProfile(user) {
  return {
    ...EMPTY_PROFILE,
    name: user?.name || user?.fullName || user?.firstName || "",
    email: user?.email || "",
    phone: user?.phone || user?.mobile || "",
    graduationYear: user?.graduationYear
      ? String(user.graduationYear)
      : "",
    department: user?.department?.name || user?.department || "",
    designation: user?.designation || "",
    company: user?.company || "",
    location: user?.location || "",
    linkedIn: user?.linkedIn || "",
    bio: user?.bio || "",
  };
}

const PROFILE_FIELDS = [
  {
    name: "name",
    label: "Full Name",
    type: "text",
    required: true,
    placeholder: "Enter your full name",
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    required: true,
    placeholder: "Enter your email address",
    readOnly: true,
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "tel",
    placeholder: "Enter your phone number",
  },
  {
    name: "graduationYear",
    label: "Graduation Year",
    type: "number",
    placeholder: "e.g. 2025",
  },
  {
    name: "department",
    label: "Department",
    type: "text",
    placeholder: "Enter your department",
  },
  {
    name: "designation",
    label: "Current Designation",
    type: "text",
    placeholder: "e.g. Software Developer",
  },
  {
    name: "company",
    label: "Company / Organization",
    type: "text",
    placeholder: "Enter your organization",
  },
  {
    name: "location",
    label: "Current Location",
    type: "text",
    placeholder: "City, State",
  },
  {
    name: "linkedIn",
    label: "LinkedIn Profile",
    type: "url",
    placeholder: "https://www.linkedin.com/in/your-profile",
  },
];

function ProfileField({
  field,
  value,
  onChange,
  disabled,
}) {
  const inputId = `alumni-profile-${field.name}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {field.label}
        {field.required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        name={field.name}
        type={field.type}
        value={value}
        onChange={onChange}
        required={field.required}
        readOnly={field.readOnly}
        disabled={disabled}
        placeholder={field.placeholder}
        min={field.name === "graduationYear" ? 1900 : undefined}
        max={
          field.name === "graduationYear"
            ? new Date().getFullYear() + 10
            : undefined
        }
        autoComplete={
          field.name === "name"
            ? "name"
            : field.name === "email"
              ? "email"
              : field.name === "phone"
                ? "tel"
                : "off"
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 read-only:cursor-not-allowed read-only:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:read-only:bg-slate-800"
      />
    </div>
  );
}

export default function AlumniProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(() =>
    getInitialProfile(user),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setProfile(getInitialProfile(user));
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice("");
  }

  function handleEdit() {
    setProfile(getInitialProfile(user));
    setNotice("");
    setIsEditing(true);
  }

  function handleCancel() {
    setProfile(getInitialProfile(user));
    setNotice("");
    setIsEditing(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isEditing) {
      return;
    }

    setNotice(
      "Your changes are currently a local preview and have not been saved. Profile update API integration is pending.",
    );
  }

  const hasCareerInformation = Boolean(
    profile.designation ||
      profile.company ||
      profile.location ||
      profile.linkedIn,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumni Profile"
        description="Manage your personal information, educational background, and professional details."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Keep your alumni information accurate and up to date.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            Edit Profile
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          {notice}
        </div>
      )}

      <SectionCard
        title="Personal Information"
        description="Your account details and contact information."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => (
              <ProfileField
                key={field.name}
                field={field}
                value={profile[field.name]}
                onChange={handleChange}
                disabled={!isEditing}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="alumni-profile-bio"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Professional Bio
            </label>

            <textarea
              id="alumni-profile-bio"
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              disabled={!isEditing}
              rows={4}
              maxLength={1000}
              placeholder="Tell us about your professional journey and interests."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />

            <p className="text-right text-xs text-slate-500 dark:text-slate-400">
              {profile.bio.length}/1000 characters
            </p>
          </div>

          {isEditing && (
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
              >
                Preview Changes
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </SectionCard>

      <SectionCard
        title="Professional Information"
        description="A quick overview of your current professional details."
      >
        {hasCareerInformation ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Designation", profile.designation],
              ["Organization", profile.company],
              ["Location", profile.location],
              ["LinkedIn", profile.linkedIn],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {label}
                  </p>

                  {label === "LinkedIn" ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      View LinkedIn Profile
                    </a>
                  ) : (
                    <p className="mt-2 break-words text-sm font-medium text-slate-900 dark:text-white">
                      {value}
                    </p>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="Professional details not available"
            description="Add your designation, organization, location, or professional profile to keep your alumni information up to date."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Educational Background"
        description="Your graduation details associated with your alumni account."
      >
        {profile.graduationYear || profile.department ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.department && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Department
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {profile.department}
                </p>
              </div>
            )}

            {profile.graduationYear && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Graduation Year
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {profile.graduationYear}
                </p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="Educational details not available"
            description="Your graduation year and department will appear here when those details are available in your account."
          />
        )}
      </SectionCard>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Profile changes are not persisted yet. Saving changes permanently
        requires the authenticated profile-update API.
      </p>
    </div>
  );
}