"use client";
import { useState, useEffect } from "react";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Workflow", href: "#workflow" },
  { label: "Commands", href: "#commands" },
  { label: "Docs", href: "/docs" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? "border-border bg-bg/90 backdrop-blur-sm" : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        {/* Breadcrumb logo — skills.sh style */}
        <a href="#" className="flex items-center gap-2 group">
          <span className="text-green text-sm font-mono font-bold">&gt;_</span>
          <span className="text-text font-mono font-semibold text-sm tracking-wide group-hover:text-green transition-colors">
            specflow
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-muted-2 hover:text-text text-xs font-mono uppercase tracking-widest transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/kousthubha-sky/workflow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-2 hover:text-text text-xs font-mono uppercase tracking-widest transition-colors"
          >
            GitHub ↗
          </a>
        </div>

        {/* Mobile menu btn */}
        <button
          className="md:hidden text-muted-2 hover:text-text"
          onClick={() => setOpen(!open)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-muted-2 hover:text-text text-xs font-mono uppercase tracking-widest transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
