function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="shrink-0 w-[220px] snap-center">
      <div className="rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="gradient-purple-blue aspect-[9/19] relative">{children}</div>
      </div>
      <p className="text-center text-xs text-slate-500 mt-3 font-medium">{label}</p>
    </div>
  );
}

function MiniHero() {
  return (
    <div className="p-4 flex flex-col items-center text-center pt-8">
      <img src="/Ass Logo.png" alt="Ass Logo" className="w-12 h-12 object-contain mb-1 drop-shadow" />
      <p className="font-display font-extrabold text-white text-2xl">ASS</p>
      <p className="text-white/70 text-[10px] mt-2 leading-tight">
        The Ultimate Classroom
        <br />
        Donkey Card Game
      </p>
      <div className="mt-4 w-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 text-white text-[11px] font-bold py-2">
        CREATE ROOM
      </div>
      <div className="mt-2 w-full rounded-full glass text-white text-[11px] font-bold py-2">
        JOIN ROOM
      </div>
    </div>
  );
}

function MiniWaiting() {
  return (
    <div className="p-4 pt-8 text-white">
      <p className="text-center font-display font-bold text-sm">WAITING ROOM</p>
      <div className="glass rounded-xl mt-3 py-2 text-center">
        <p className="text-[9px] text-white/70">Room Code</p>
        <p className="font-display font-extrabold text-xl">4821</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {['A', 'S', 'M', 'J', 'B', 'C'].map((l, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-white/20 mx-auto flex items-center justify-center text-[10px] font-bold">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBoard() {
  return (
    <div className="p-3 pt-6 text-white text-[9px]">
      <div className="flex justify-between px-1">
        <span>Room: 4821</span>
        <span>♠</span>
      </div>
      <div className="mt-6 flex justify-center">
        <div className="w-10 h-14 rounded-md bg-white text-slate-900 flex items-center justify-center font-bold text-xs shadow-lg">
          A♠
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-7 h-10 rounded bg-white/90" />
        ))}
      </div>
    </div>
  );
}

const SCREENS = [
  { label: 'Landing screen', node: <MiniHero /> },
  { label: 'Waiting room', node: <MiniWaiting /> },
  { label: 'Live gameplay', node: <MiniBoard /> },
];

export default function Screenshots() {
  return (
    <section id="screenshots" className="bg-[color:var(--color-bg)] py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 text-center">
          A peek inside
        </h2>
        <p className="text-slate-500 text-center mt-2">Designed mobile-first, from the lobby to the last hit.</p>
        <div className="mt-10 flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-none justify-start sm:justify-center">
          {SCREENS.map((s) => (
            <PhoneFrame key={s.label} label={s.label}>
              {s.node}
            </PhoneFrame>
          ))}
        </div>
      </div>
    </section>
  );
}
