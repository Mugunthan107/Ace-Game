import { HiOutlineFlag, HiOutlineRectangleStack, HiOutlineStar, HiOutlineArrowsRightLeft, HiOutlineBoltSlash, HiOutlineTrophy } from 'react-icons/hi2';
import { GiDonkey } from 'react-icons/gi';

const STEPS = [
  {
    icon: HiOutlineFlag,
    title: 'Game Objective',
    desc: 'Discard every card in your hand before anyone else — and whatever you do, don\'t be the last one holding cards.',
  },
  {
    icon: HiOutlineRectangleStack,
    title: 'The Deck',
    desc: '52 cards, no jokers. Ace is the highest card, 2 is the lowest.',
  },
  {
    icon: HiOutlineStar,
    title: 'First Round',
    desc: 'Whoever is dealt the Ace of Spades leads the very first trick.',
  },
  {
    icon: HiOutlineArrowsRightLeft,
    title: 'Follow Suit',
    desc: 'If you hold the lead suit, you must play it. Everything else is locked.',
  },
  {
    icon: HiOutlineBoltSlash,
    title: 'Hit Rule',
    desc: "Can't follow suit? Hit with any other card — the round ends immediately.",
  },
  {
    icon: HiOutlineTrophy,
    title: 'Winner',
    desc: 'The highest card of the lead suit wins the trick and leads next.',
  },
];

export default function HowToPlay() {
  return (
    <section id="how-to-play" className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 text-center">
          How to Play
        </h2>
        <p className="text-slate-500 text-center mt-2 max-w-md mx-auto">
          Six rules. Five minutes to learn. A lifetime of blaming your friends for hitting you.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl p-5 border border-slate-100 bg-gradient-to-br from-slate-50 to-white flex gap-4 items-start"
            >
              <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] flex items-center justify-center text-xl shrink-0">
                <s.icon />
              </div>
              <div>
                <p className="font-display font-bold text-slate-900">{s.title}</p>
                <p className="text-slate-500 text-sm mt-1 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl p-6 gradient-purple-blue text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shrink-0">
            <GiDonkey />
          </div>
          <div>
            <p className="font-display font-bold text-lg">Last one with cards is the ASS</p>
            <p className="text-white/70 text-sm mt-0.5">
              Everyone else escapes and ranks by how fast they emptied their hand. One donkey. No mercy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
