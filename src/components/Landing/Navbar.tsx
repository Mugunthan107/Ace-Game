import { useState } from 'react';
import { HiMenu, HiX } from 'react-icons/hi';

const LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How to Play', href: '#how-to-play' },
  { label: 'Screenshots', href: '#screenshots' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 gradient-purple-blue/95 backdrop-blur border-b border-white/10">
      <div className="gradient-purple-blue">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#home" className="font-display font-extrabold text-2xl text-white tracking-wide flex items-center gap-2.5">
            <img src="/Ass Logo.png" alt="Ass Logo" className="w-9 h-9 object-contain drop-shadow" />
            <span>ASS</span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-white/85 hover:text-white text-sm font-medium transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <button
            className="md:hidden text-white text-2xl"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <HiX /> : <HiMenu />}
          </button>
        </div>
        {open && (
          <nav className="md:hidden flex flex-col gap-1 px-5 pb-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-white/90 py-2 text-sm font-medium border-b border-white/10 last:border-none"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
