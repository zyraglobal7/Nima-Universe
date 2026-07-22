import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the label prop', async () => {
    await render(<Badge label="New" />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('renders children when no label is given', async () => {
    await render(<Badge>Sale</Badge>);
    expect(screen.getByText('Sale')).toBeTruthy();
  });

  it('prefers label over children when both are given', async () => {
    await render(<Badge label="New">Sale</Badge>);
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.queryByText('Sale')).toBeNull();
  });

  it.each(['default', 'secondary', 'destructive', 'outline'] as const)(
    'renders without crashing for variant=%s',
    async (variant) => {
      await render(<Badge variant={variant} label="Status" />);
      expect(screen.getByText('Status')).toBeTruthy();
    },
  );
});
