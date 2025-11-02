export const layerDefinitions = [
  { key: 'ev', label: 'EV Charging', defaultVisible: true, controls: ['power'] },
  { key: 'traffic', label: 'Traffic', defaultVisible: true },
  { key: 'chargingNeed', label: 'Charging Need', defaultVisible: false, controls: ['need'] },
]

export const gradients = {
  ev: {
    0.0: '#2f1300',
    0.35: '#b45309',
    0.65: '#f97316',
    0.85: '#fbbf24',
    1.0: '#fde68a',
  },
  traffic: {
    0.0: '#012b1f',
    0.25: '#047857',
    0.5: '#22c55e',
    0.75: '#a3e635',
    1.0: '#bef264',
  },
  chargingNeed: {
    0.0: '#1e1b4b',
    0.3: '#6d28d9',
    0.55: '#c026d3',
    0.8: '#f472b6',
    1.0: '#fde68a',
  },
}
