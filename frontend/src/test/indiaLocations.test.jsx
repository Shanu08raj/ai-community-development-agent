import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  INDIA_STATES,
  INDIA_UNION_TERRITORIES,
  INDIA_LOCATIONS,
  INDIA_DISTRICTS_BY_STATE,
  getDistrictsForState,
} from '../data/indiaLocations';
import { SearchableSelect } from '../components/common/SearchableSelect';

describe('India states, union territories, and districts dataset', () => {
  it('contains all 28 Indian states and all 8 Union Territories with official names', () => {
    expect(INDIA_STATES).toHaveLength(28);
    expect(INDIA_UNION_TERRITORIES).toHaveLength(8);
    expect(INDIA_LOCATIONS).toHaveLength(36);

    const requiredStates = [
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
    ];
    for (const st of requiredStates) {
      expect(INDIA_STATES).toContain(st);
    }

    const requiredUTs = [
      'Andaman and Nicobar Islands',
      'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi',
      'Jammu and Kashmir',
      'Ladakh',
      'Lakshadweep',
      'Puducherry',
    ];
    for (const ut of requiredUTs) {
      expect(INDIA_UNION_TERRITORIES).toContain(ut);
    }
  });

  it('provides clean, non-empty districts <= 50 chars for every state and UT', () => {
    for (const loc of INDIA_LOCATIONS) {
      const districts = getDistrictsForState(loc.name);
      expect(districts.length).toBeGreaterThanOrEqual(1);
      expect(new Set(districts).size).toBe(districts.length);
      for (const dist of districts) {
        expect(dist).toBe(dist.trim());
        expect(dist.length).toBeLessThanOrEqual(50);
      }
    }

    expect(INDIA_DISTRICTS_BY_STATE.Maharashtra).toContain('Pune');
    expect(INDIA_DISTRICTS_BY_STATE.Karnataka).toContain('Bengaluru Urban');
    expect(INDIA_DISTRICTS_BY_STATE.Delhi).toContain('New Delhi');
    expect(INDIA_DISTRICTS_BY_STATE.Ladakh).toEqual(['Kargil', 'Leh']);
    expect(INDIA_DISTRICTS_BY_STATE.Uttarakhand).toHaveLength(13);
    expect(getDistrictsForState('')).toEqual([]);
  });
});

describe('SearchableSelect component', () => {
  it('stays disabled when disabled prop is true and filters/selects options cleanly when enabled', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <SearchableSelect
        id="test-district"
        label="District / City"
        value=""
        onChange={handleChange}
        options={['Pune', 'Nagpur', 'Thane']}
        disabled
        placeholder="Select a State / UT first"
        searchPlaceholder="Search district or city..."
      />
    );

    const trigger = screen.getByRole('combobox', { name: /District \/ City/i });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    rerender(
      <SearchableSelect
        id="test-district"
        label="District / City"
        value=""
        onChange={handleChange}
        options={['Pune', 'Nagpur', 'Thane']}
        disabled={false}
        placeholder="Select District / City"
        searchPlaceholder="Search district or city..."
      />
    );

    const enabledTrigger = screen.getByRole('combobox', { name: /District \/ City/i });
    expect(enabledTrigger).toBeEnabled();
    fireEvent.click(enabledTrigger);

    const searchBox = screen.getByPlaceholderText('Search district or city...');
    fireEvent.change(searchBox, { target: { value: 'nag' } });

    expect(screen.getByRole('option', { name: 'Nagpur' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Pune' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Nagpur' }));
    expect(handleChange).toHaveBeenCalledWith('Nagpur');
  });
});
