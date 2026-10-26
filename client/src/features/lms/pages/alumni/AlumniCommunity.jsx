import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const communityPosts = [];

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function CommunityPost({ post }) {
  const authorName = post.author?.name || "Alumni member";
  const initials = authorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          aria-hidden="true"
        >
          {initials || "A"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-white">
                {authorName}
              </h3>

              {post.author?.designation && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {post.author.designation}
                  {post.author.company
                    ? ` · ${post.author.company}`
                    : ""}
                </p>
              )}
            </div>

            <time
              dateTime={post.createdAt || undefined}
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              {formatDate(post.createdAt)}
            </time>
          </div>

          {post.category && (
            <span className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {post.category}
            </span>
          )}

          {post.title && (
            <h4 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              {post.title}
            </h4>
          )}

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600 dark:text-slate-300">
            {post.content}
          </p>

          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {Number.isFinite(post.likesCount) ? post.likesCount : 0} likes
        </span>

        <span>
          {Number.isFinite(post.commentsCount)
            ? post.commentsCount
            : 0}{" "}
          comments
        </span>
      </div>
    </article>
  );
}

export default function AlumniCommunity() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("General");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => [
      "All Categories",
      ...new Set(
        communityPosts
          .map((post) => post.category)
          .filter(Boolean),
      ),
    ],
    [],
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return communityPosts.filter((post) => {
      const searchableText = [
        post.title,
        post.content,
        post.author?.name,
        post.author?.company,
        post.category,
        ...(Array.isArray(post.tags) ? post.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesCategory =
        category === "All Categories" ||
        post.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!postContent.trim()) {
      setNotice("Please enter some content before submitting.");
      return;
    }

    setNotice(
      "Your post has not been published. Community publishing will be enabled when the backend API is integrated.",
    );
  }

  function resetComposer() {
    setPostTitle("");
    setPostContent("");
    setPostCategory("General");
    setNotice("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumni Community"
        description="Connect with fellow alumni, exchange ideas, and stay engaged with your institution."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Your Alumni Network
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Share professional experiences, discuss ideas, and connect
              with your alumni community.
            </p>
          </div>

          <Link
            to="/alumni/profile"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View Profile
          </Link>
        </div>
      </section>

      <SectionCard
        title="Create a Post"
        description="Write a post to share with the alumni community."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="community-post-title"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Title <span className="text-slate-400">(optional)</span>
            </label>

            <input
              id="community-post-title"
              type="text"
              value={postTitle}
              onChange={(event) => {
                setPostTitle(event.target.value);
                setNotice("");
              }}
              maxLength={150}
              placeholder="Give your post a title"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="community-post-category"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Category
            </label>

            <select
              id="community-post-category"
              value={postCategory}
              onChange={(event) => setPostCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-xs"
            >
              {[
                "General",
                "Career",
                "Achievements",
                "Mentorship",
                "Events",
                "Discussion",
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="community-post-content"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Your Post
            </label>

            <textarea
              id="community-post-content"
              value={postContent}
              onChange={(event) => {
                setPostContent(event.target.value);
                setNotice("");
              }}
              required
              rows={5}
              maxLength={5000}
              placeholder="Share an experience, ask a question, or start a discussion..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />

            <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
              {postContent.length}/5000 characters
            </p>
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Preview Submission
            </button>

            <button
              type="button"
              onClick={resetComposer}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Community Feed"
        description="Browse posts shared by alumni."
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="community-search"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Search posts
            </label>

            <input
              id="community-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts, authors, or topics"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="community-category-filter"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Filter by category
            </label>

            <select
              id="community-category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <CommunityPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              communityPosts.length === 0
                ? "The community feed is empty"
                : "No matching posts found"
            }
            description={
              communityPosts.length === 0
                ? "Community posts will appear here once the feed API is integrated and posts are available."
                : "Try another search term or category to find posts."
            }
          />
        )}
      </SectionCard>
    </div>
  );
}