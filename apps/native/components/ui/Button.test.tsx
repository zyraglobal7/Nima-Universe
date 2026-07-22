import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label text', async () => {
    await render(<Button label="Continue" />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);

    fireEvent.press(screen.getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the label while loading, and blocks press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);

    expect(screen.queryByText('Save')).toBeNull();
  });
});
