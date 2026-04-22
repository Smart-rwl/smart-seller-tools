import { describe, it, expect } from 'vitest'

// Import or copy the core calculation logic here
// Example: assuming you have a calculateACoS function
function calculateACoS(adSpend: number, revenue: number): number {
  if (revenue === 0) return 0
  return (adSpend / revenue) * 100
}

describe('PPC Calculator', () => {
  it('calculates ACoS correctly', () => {
    expect(calculateACoS(100, 500)).toBe(20)
  })

  it('returns 0 when revenue is 0', () => {
    expect(calculateACoS(100, 0)).toBe(0)
  })
})