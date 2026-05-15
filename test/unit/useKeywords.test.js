import { renderHook, act, waitFor } from '@testing-library/react';
import { useKeywords } from '../../src/hooks/useKeywords';
import { useReport } from '../../src/context/useReport';
import { request } from '../../src/utils/api';
import { CONFIG } from '../../src/constants/config';
import { DEV_AUTH_ENABLED } from '../../src/utils/devAuth';

// 모킹
jest.mock('../../src/context/useReport', () => ({
  useReport: () => ({
    logout: jest.fn()
  })
}));
jest.mock('../../src/utils/api');
jest.mock('../../src/constants/config', () => ({
  CONFIG: {
    API: {
      BASE_URL: 'https://api.example.com'
    },
    STORAGE_KEYS: {
      AUTH_TOKEN: 'auth_token'
    }
  }
}));
jest.mock('../../src/utils/devAuth', () => ({
  DEV_AUTH_ENABLED: false
}));

describe('useKeywords', () => {
  const telegramUser = { id: 123, first_name: 'Test' };

  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('should fetch keywords when telegramUser is provided', async () => {
    const mockKeywords = [
      { keyword: 'test1', is_active: true },
      { keyword: 'test2', is_active: true }
    ];

    request.mockResolvedValue(mockKeywords);

    const { result } = renderHook(() => useKeywords(telegramUser));

    expect(result.current.isLoadingKeywords).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingKeywords).toBe(false);
    });

    expect(result.current.keywords).toEqual(mockKeywords);
    expect(request).toHaveBeenCalledWith(`${CONFIG.API.BASE_URL}/keywords`, {}, expect.any(Function));
  });

  it('should not fetch keywords when telegramUser is null', () => {
    const { result } = renderHook(() => useKeywords(null));

    expect(result.current.keywords).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('should handle add keyword', async () => {
    const initialKeywords = [
      { keyword: 'existing', is_active: true }
    ];

    request.mockResolvedValueOnce(initialKeywords); // fetchKeywords
    request.mockResolvedValueOnce([...initialKeywords, { keyword: 'new', is_active: true }]); // syncKeywords

    const { result } = renderHook(() => useKeywords(telegramUser));

    await waitFor(() => {
      expect(result.current.isLoadingKeywords).toBe(false);
    });

    await act(async () => {
      result.current.setNewKeyword('new');
    });

    act(() => {
      result.current.handleAddKeyword();
    });

    await waitFor(() => {
      expect(result.current.keywords).toEqual([
        { keyword: 'existing', is_active: true },
        { keyword: 'new', is_active: true }
      ]);
    });
  });

  it('should handle delete keyword', async () => {
    const initialKeywords = [
      { keyword: 'test1', is_active: true },
      { keyword: 'test2', is_active: true }
    ];

    request.mockResolvedValueOnce(initialKeywords); // fetchKeywords
    request.mockResolvedValueOnce([{ keyword: 'test2', is_active: true }]); // syncKeywords

    const { result } = renderHook(() => useKeywords(telegramUser));

    await waitFor(() => {
      expect(result.current.isLoadingKeywords).toBe(false);
    });

    act(() => {
      result.current.handleDeleteKeyword('test1');
    });

    await waitFor(() => {
      expect(result.current.keywords).toEqual([
        { keyword: 'test2', is_active: true }
      ]);
    });
  });

  it('should handle undo delete', async () => {
    const initialKeywords = [
      { keyword: 'test1', is_active: true },
      { keyword: 'test2', is_active: true }
    ];

    request.mockResolvedValueOnce(initialKeywords); // fetchKeywords
    request.mockResolvedValueOnce([{ keyword: 'test2', is_active: true }]); // syncKeywords after delete
    request.mockResolvedValueOnce(initialKeywords); // syncKeywords after undo

    const { result } = renderHook(() => useKeywords(telegramUser));

    await waitFor(() => {
      expect(result.current.isLoadingKeywords).toBe(false);
    });

    act(() => {
      result.current.handleDeleteKeyword('test1');
    });

    await waitFor(() => {
      expect(result.current.keywords).toEqual([
        { keyword: 'test2', is_active: true }
      ]);
    });

    act(() => {
      result.current.handleUndoDelete();
    });

    await waitFor(() => {
      expect(result.current.keywords).toEqual(initialKeywords);
    });
  });
});
