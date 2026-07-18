import { describe, it, expect } from 'vitest';
import { scoreMatch } from './matching-engine';

const baseSupply = {
  commodity: 'rice',
  volume: 25,
  volume_unit: 'tons',
  quality_grade: 'grade-a',
  region_province: 'jawa-barat',
  region_city: 'Subang',
  timeline: '1-season',
};

const baseDemand = {
  commodity: 'rice',
  volume: 20,
  volume_unit: 'tons',
  quality_grade: 'standard',
  delivery_province: 'jawa-barat',
  delivery_city: 'Subang',
  timeline: '1-season',
};

describe('scoreMatch', () => {
  it('returns null when commodities differ', () => {
    expect(scoreMatch(baseSupply, { ...baseDemand, commodity: 'corn' })).toBeNull();
  });

  it('scores a strong match highly (volume, quality, region, timeline all fit)', () => {
    const result = scoreMatch(baseSupply, baseDemand);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.reasons).toEqual(['volume', 'quality', 'province', 'city', 'timeline']);
  });

  it('penalizes insufficient volume proportionally instead of hard-filtering', () => {
    const result = scoreMatch({ ...baseSupply, volume: 5 }, baseDemand);
    expect(result).not.toBeNull();
    expect(result!.score).toBeLessThan(100);
    expect(result!.reasons).not.toContain('volume');
  });

  it('normalizes volume units (kg vs tons) before comparing', () => {
    const result = scoreMatch(
      { ...baseSupply, volume: 25000, volume_unit: 'kg' },
      { ...baseDemand, volume: 20, volume_unit: 'tons' }
    );
    expect(result!.reasons).toContain('volume');
  });

  it('treats a higher supply grade as satisfying a lower demand requirement', () => {
    const result = scoreMatch(
      { ...baseSupply, quality_grade: 'premium' },
      { ...baseDemand, quality_grade: 'grade-a' }
    );
    expect(result!.reasons).toContain('quality');
  });

  it('does not credit quality when supply grade is below what demand requires', () => {
    const result = scoreMatch(
      { ...baseSupply, quality_grade: 'standard' },
      { ...baseDemand, quality_grade: 'grade-a' }
    );
    expect(result!.reasons).not.toContain('quality');
  });

  it('does not credit region when provinces differ', () => {
    const result = scoreMatch(baseSupply, { ...baseDemand, delivery_province: 'dki-jakarta', delivery_city: 'Jakarta Utara' });
    expect(result!.reasons).not.toContain('province');
    expect(result!.reasons).not.toContain('city');
  });
});
