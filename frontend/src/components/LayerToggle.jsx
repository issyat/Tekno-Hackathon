export function LayerToggle({ visible, onToggle, layers }) {
  return (
    <div className="layer-toggle" role="group" aria-label="Layer selection">
      {layers.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={Boolean(visible[key])}
          onClick={() => onToggle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
