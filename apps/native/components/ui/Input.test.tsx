import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Input } from './Input';

describe('Input', () => {
  it('renders a label when provided', async () => {
    await render(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders no label element when omitted', async () => {
    await render(<Input placeholder="you@example.com" />);
    expect(screen.queryByText('Email')).toBeNull();
  });

  it('shows the error message when provided', async () => {
    await render(<Input label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('calls onChangeText as the user types', async () => {
    const onChangeText = jest.fn();
    await render(<Input placeholder="you@example.com" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });
});
