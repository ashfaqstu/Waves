export default function WavyTitle() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 select-none pointer-events-none">
      <h1 className="text-6xl font-bold font-mono text-purple-400 relative whitespace-nowrap">
        {"WAVES".split("").map((letter, idx) => (
          <span
            key={idx}
            className="inline-block animate-wave"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
            {letter}
          </span>
        ))}
      </h1>
    </div>
  );
}
