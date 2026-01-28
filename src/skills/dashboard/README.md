# Visual Dashboard Composer (Skill #4)

## Purpose
Generate chart-ready JSON from booking and payment data for visualizations, KPIs, and risk assessment.

## Input Schema

```javascript
{
  bookings: [
    {
      cabinNumber: '1234',
      costCents: 100000,    // Required
      paidCents: 50000,     // Optional, defaults to 0
      deadline: '2025-03-15',
      passengerCount: 2
    }
  ],
  groupData: {
    id: 'group123',
    totalCabins: 10,
    sailDate: '2025-06-15',
    baseCurrency: 'CAD'
  }
}
```

## Output Schema

```javascript
{
  success: true,
  generatedAt: '2025-01-27T15:00:00Z',
  kpis: {
    occupiedCabins: 8,
    totalCabins: 10,
    occupancyRate: 0.80,
    occupancyPercent: 80,
    totalPassengers: 20,
    totalRevenueCents: 500000,
    totalCollectedCents: 400000,
    outstandingCents: 100000,
    collectionRate: 0.80,
    collectionPercent: 80,
    formatted: { ... }
  },
  riskSemaphore: {
    level: 'green',      // 'green' | 'yellow' | 'red'
    message: { en: '...', es: '...' },
    urgency: 1,          // 1=low, 2=medium, 3=high
    factors: { ... }
  },
  charts: {
    cabinStatus: [
      { status: 'paid', count: 6, color: '#22c55e' },
      { status: 'partial', count: 2, color: '#f59e0b' },
      { status: 'unpaid', count: 2, color: '#ef4444' }
    ],
    paymentProgress: [ ... ]
  },
  urgentDeadlines: [ ... ]
}
```

## Risk Thresholds

| Level | Collection | Days to Sail |
|-------|------------|--------------|
| Green | ≥75% | ≥30 days |
| Yellow | ≥50% | ≥14 days |
| Red | <50% OR <14 days |

## Functions

| Function | Description |
|----------|-------------|
| `calculateOccupancyKPIs(bookings, groupData)` | Core KPI calculation |
| `determineRiskLevel(rate, days)` | Risk semaphore logic |
| `generateChartData(bookings)` | Chart-ready data |
| `composeDashboardData(input)` | Complete dashboard |
| `formatKPIsForDisplay(kpis, locale)` | UI-ready KPI cards |
