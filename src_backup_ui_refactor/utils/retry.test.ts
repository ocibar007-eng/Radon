
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withExponentialBackoff } from './retry';

describe('Resiliência: Exponential Backoff', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar o valor imediatamente se não houver erro', async () => {
    const mockFn = vi.fn().mockResolvedValue('sucesso');
    const promise = withExponentialBackoff(mockFn);
    
    // Avança timers para garantir que não houve espera desnecessária
    vi.runAllTimers();
    
    await expect(promise).resolves.toBe('sucesso');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('deve retentar em caso de erro 429 (Rate Limit) aguardando o tempo correto', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'Too Many Requests' }) // Falha 1
      .mockRejectedValueOnce({ message: 'RESOURCE_EXHAUSTED' }) // Falha 2
      .mockResolvedValue('sucesso na 3a vez'); // Sucesso

    const promise = withExponentialBackoff(mockFn, 3, 1000);

    // Tentativa 1 falha imediatamente.
    // O código entra no await setTimeout(1000).
    // Precisamos avançar o tempo para liberar a promise.
    
    // Avança 1s (Backoff 1)
    await vi.advanceTimersByTimeAsync(1000);
    
    // Avança 2s (Backoff 2)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toBe('sucesso na 3a vez');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('NÃO deve retentar para erros 400 (Bad Request)', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 400, message: 'Bad Request' });
    const promise = withExponentialBackoff(mockFn, 3, 1000);
    
    vi.runAllTimers(); // Não deve haver espera, mas por segurança

    await expect(promise).rejects.toMatchObject({
      status: 400
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('deve falhar após exceder o número máximo de tentativas', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 429 });
    const promise = withExponentialBackoff(mockFn, 3, 1000);

    // Avança todas as tentativas
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toMatchObject({
      status: 429
    });

    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});
