export function NeedThresholdControl({ value, onChange, disabled }) {
  const handleChange = (event) => {
    const numeric = Number(event.target.value)
    if (Number.isFinite(numeric)) {
      onChange?.(Math.max(0, Math.min(100, numeric)))
    }
  }

  const display = value / 100

  return (
    <div className="need-threshold-control" aria-disabled={disabled}>
      <label>
        Min charging need
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Minimum charging need to display"
        />
      </label>
      <span>{display.toFixed(2)}</span>
    </div>
  )
}
