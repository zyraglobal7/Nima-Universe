import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SelectionProvider, useSelection } from './SelectionContext';
import type { ApparelItem } from '@/components/discover/ApparelItemCard';

jest.mock('@/components/discover/ApparelItemCard', () => ({}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SelectionProvider>{children}</SelectionProvider>;
}

function item(id: string): ApparelItem {
  return { _id: id } as ApparelItem;
}

describe('useSelection', () => {
  it('throws when used outside a SelectionProvider', async () => {
    await expect(renderHook(() => useSelection())).rejects.toThrow(
      'useSelection must be used within a SelectionProvider',
    );
  });

  it('toggling the same item twice is a net no-op', async () => {
    const { result } = await renderHook(() => useSelection(), { wrapper });

    await act(async () => result.current.toggleItemSelection(item('a')));
    expect(result.current.selectedCount).toBe(1);

    await act(async () => result.current.toggleItemSelection(item('a')));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItemIds.has('a' as never)).toBe(false);
  });

  it('caps selection at MAX_SELECTION_SIZE (6); the 7th distinct item is dropped', async () => {
    const { result } = await renderHook(() => useSelection(), { wrapper });

    for (let i = 0; i < 7; i++) {
      await act(async () => result.current.toggleItemSelection(item(`item-${i}`)));
    }

    expect(result.current.selectedCount).toBe(6);
    expect(result.current.selectedItems.has('item-6')).toBe(false);
  });

  it('setSelectionMode(false) clears any selected items', async () => {
    const { result } = await renderHook(() => useSelection(), { wrapper });

    await act(async () => result.current.setSelectionMode(true));
    await act(async () => result.current.toggleItemSelection(item('a')));
    expect(result.current.selectedCount).toBe(1);

    await act(async () => result.current.setSelectionMode(false));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelectionMode).toBe(false);
  });

  it('clearSelection clears items and exits selection mode', async () => {
    const { result } = await renderHook(() => useSelection(), { wrapper });

    await act(async () => result.current.setSelectionMode(true));
    await act(async () => result.current.toggleItemSelection(item('a')));

    await act(async () => result.current.clearSelection());

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelectionMode).toBe(false);
  });
});
