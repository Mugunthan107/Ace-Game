export default function Footer() {
  return (
    <footer id="contact" className="gradient-purple-blue text-white/70 py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/Ass Logo.png" alt="Ass Logo" className="w-8 h-8 object-contain" />
          <p className="font-display font-bold text-white text-lg">ASS</p>
        </div>
        <p className="text-xs text-center sm:text-right">
          Built for classrooms and living rooms. Got feedback? Tell the friend who made you play this.
        </p>
      </div>
    </footer>
  );
}
