import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { LineChart } from '@mui/x-charts'

function seededRng(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeedFromPoint(point) {
  if (!point) return 123456789
  const a = Math.round((point.lat ?? 0) * 10000)
  const b = Math.round((point.lng ?? 0) * 10000)
  const c = Math.round((point.need ?? 0) * 100000)
  return ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0
}

function generateRoiSeries(point) {
  const seed = buildSeedFromPoint(point)
  const rand = seededRng(seed)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const base = 6 + (Math.min(Math.max(point?.need ?? 0.3, 0), 1) * 26)
  let last = Math.max(4, base * 0.6)
  const data = months.map((_, i) => {
    const drift = base * (0.25 + 0.55 * (i / (months.length - 1)))
    const noise = (rand() - 0.5) * 4
    const next = Math.max(1, last + 0.35 * (drift - last) + noise)
    last = next
    return Number(next.toFixed(1))
  })
  return { months, data }
}

export default function ChargingNeedDrawer({ open, onClose, point }) {
  const needPct = point?.need != null ? Math.round(point.need * 100) : null
  const roi = useMemo(() => generateRoiSeries(point), [point])

  return (
    <Drawer anchor="left" open={open} onClose={onClose} PaperProps={{ sx: { width: 340, bgcolor: '#0f1720', color: '#e8edf4' } }}>
      <Box sx={{ p: 2 }} role="presentation">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Charging need
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: '#cbd5e1' }} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ my: 2, borderColor: 'rgba(205,234,128,0.22)' }} />

        {point ? (
          <Stack spacing={1.2}>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              Location
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {point.lat?.toFixed(5)}, {point.lng?.toFixed(5)}
            </Typography>

            <Divider sx={{ my: 2, borderColor: 'rgba(205,234,128,0.12)' }} />

            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              Relative need
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#cdea80' }}>
              {needPct}%
            </Typography>

            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Higher indicates stronger demand vs. local supply of charging.
            </Typography>

            <Divider sx={{ my: 2, borderColor: 'rgba(205,234,128,0.12)' }} />

            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              Projected ROI (12 mo)
            </Typography>
            <Box sx={{ bgcolor: '#0b1320', border: '1px solid rgba(205,234,128,0.12)', borderRadius: 1.5, p: 1 }}>
              <LineChart
                xAxis={[{ data: roi.months, label: 'Month', tickLabelStyle: { fill: '#9fb3c8' } }]}
                series={[{ data: roi.data, label: 'ROI %', color: '#cdea80', area: true, valueFormatter: (v) => `${v}%` }]}
                yAxis={[{ tickLabelStyle: { fill: '#9fb3c8' } }]}
                width={300}
                height={180}
                slotProps={{ legend: { hidden: true } }}
                sx={{ '.MuiChartsAxis-line, .MuiChartsGrid-line': { stroke: 'rgba(148,163,184,0.2)' } }}
              />
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Click on highlighted areas to inspect charging need.
          </Typography>
        )}
      </Box>
    </Drawer>
  )
}

ChargingNeedDrawer.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  point: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
    need: PropTypes.number,
    weight: PropTypes.number,
  }),
}
