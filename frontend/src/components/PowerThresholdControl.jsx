export function PowerThresholdControl({ value, onChange, disabled }) {
  const handleChange = (event) => {
    const numeric = Number(event.target.value)
    if (Number.isFinite(numeric)) {
      onChange?.(Math.max(3, Math.min(350, numeric)))
    }
  }

  return (
    <div className="power-threshold-control" aria-disabled={disabled}>
      <label>
        Min power (kW)
        <input
          type="range"
          min="3"
          max="350"
          step="5"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Minimum charger power to display"
        />
      </label>
      <span>{`${value.toFixed(0)} kW`}</span>
    </div>
  )
}
