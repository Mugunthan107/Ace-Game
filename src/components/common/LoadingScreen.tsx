export default function LoadingScreen({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="gradient-purple-blue min-h-screen w-full flex flex-col items-center justify-center gap-5 text-white">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl border-4 border-white/20" />
        <div className="absolute inset-0 rounded-2xl border-4 border-t-sky-400 border-transparent animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-lg">
          🂡
        </span>
      </div>
      <p className="font-display text-lg tracking-wide text-white/90">{label}</p>
    </div>
  );
}
