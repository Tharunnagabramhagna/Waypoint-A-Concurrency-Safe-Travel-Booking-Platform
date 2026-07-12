export default function SeatSelector({ units, selected, onToggle }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {units.map((u) => {
        const isSelected = selected.includes(u.id);
        const isAvailable = u.status === 'available';
        return (
          <button
            key={u.id}
            disabled={!isAvailable}
            onClick={() => onToggle(u.id)}
            className={`aspect-square rounded-2xl font-mono text-sm flex items-center justify-center transition-all duration-300
              ${!isAvailable ? 'glass text-slate-400 cursor-not-allowed opacity-50' : ''}
              ${isAvailable && !isSelected ? 'glass text-slate-700 hover:bg-white/80 hover:shadow-lg' : ''}
              ${isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40' : ''}
            `}
            title={u.stay_date ? `Night: ${u.stay_date}` : undefined}
          >
            {u.unit_code}
          </button>
        );
      })}
    </div>
  );
}
