import { HiOutlineLockClosed, HiOutlineUserGroup, HiOutlineBolt, HiOutlineDevicePhoneMobile, HiOutlineNoSymbol, HiOutlineSparkles } from 'react-icons/hi2';

const FEATURES = [
  { icon: HiOutlineLockClosed, title: 'Private Room Match', desc: 'Only friends with your code can join — no strangers, ever.' },
  { icon: HiOutlineUserGroup, title: '2–10 Players', desc: 'Pick a headcount and the room fills up as friends join.' },
  { icon: HiOutlineBolt, title: 'Real-Time Gameplay', desc: 'Every card, hit, and escape syncs instantly for everyone.' },
  { icon: HiOutlineDevicePhoneMobile, title: 'Mobile Friendly', desc: 'Built for phones first — perfect for a classroom desk.' },
  { icon: HiOutlineNoSymbol, title: 'No Login Needed', desc: 'Type a name, join the room, and you are playing.' },
  { icon: HiOutlineSparkles, title: '100% Free', desc: 'No ads, no purchases — just the game.' },
];

export default function Features() {
  return (
    <section id="features" className="bg-[color:var(--color-bg)] py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 text-center">
          Everything you need for game night
        </h2>
        <p className="text-slate-500 text-center mt-2 max-w-md mx-auto">
          ASS strips multiplayer down to the one thing that matters: getting a table of friends into the same round, fast.
        </p>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5 bg-white shadow-[0_10px_30px_-12px_rgba(79,29,149,0.25)] border border-slate-100 flex flex-col gap-3"
            >
              <div className="w-11 h-11 rounded-xl gradient-purple-blue flex items-center justify-center text-white text-xl shrink-0">
                <f.icon />
              </div>
              <div>
                <p className="font-display font-bold text-slate-900 text-sm sm:text-base leading-snug">{f.title}</p>
                <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
