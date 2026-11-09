import type { AttributeDef } from '@yoyo/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { availableItem } from '@/test/catalog';
import { renderWithIntl } from '@/test/render';
import { attributeText, ItemFacts } from './ItemFacts';

const l = (en: string, lv = en, ru = en) => ({ en, lv, ru });
const DEFS: AttributeDef[] = [
  { key: 'power', type: 'SELECT', required: true, unit: null, labels: l('Power supply', 'Barošana', 'Питание'), options: [{ value: 'battery', labels: l('Battery', 'Akumulators', 'Аккумулятор') }] },
  { key: 'watts', type: 'NUMBER', required: false, unit: 'W', labels: l('Power'), options: null },
  { key: 'case', type: 'BOOLEAN', required: false, unit: null, labels: l('Case included', 'Ar somu', 'С кейсом'), options: null },
  { key: 'gone', type: 'TEXT', required: false, unit: null, labels: l('Unused'), options: null },
];

describe('ItemFacts', () => {
  it('writes values in the page language: choices by label, numbers with units, yes/no', () => {
    const fmt = { yes: 'Jā', no: 'Nē', locale: 'lv' };
    expect(attributeText(DEFS[0]!, 'battery', fmt)).toBe('Akumulators');
    expect(attributeText(DEFS[1]!, 1200, fmt)).toBe('1200 W');
    expect(attributeText(DEFS[2]!, false, fmt)).toBe('Nē');
  });

  it('lists condition, known attributes, rules and the district, leaving out unknown values', () => {
    const { listing } = availableItem({
      condition: 'GOOD',
      attributes: { power: 'battery', watts: 18, case: true, legacy: 'x' },
      rules: { preset: ['ID_AT_PICKUP'], custom: ['Atgriezt uzlādētu'] },
      contentLocale: 'lv',
    });
    renderWithIntl(<ItemFacts listing={listing} attributes={DEFS} />);
    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.getByText('18 W')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.queryByText('Unused')).toBeNull();
    expect(screen.getByText('Show an ID at pickup')).toBeInTheDocument();
    expect(screen.getByText('Atgriezt uzlādētu')).toHaveAttribute('lang', 'lv');
    expect(screen.getByText('Rīga, Centrs')).toBeInTheDocument();
  });
});
