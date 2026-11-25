"use client";

export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-tiny ${className}`}
      aria-label="Toggle color theme"
      onClick={() => {
        const dark = document.documentElement.classList.contains("dark");
        const next = dark ? "light" : "dark";
        localStorage.setItem("tandem-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }}
    >
      Theme
    </button>
  );
}
