/**
 * Executa uma função assíncrona com retries exponenciais e Jitter.
 * Essencial para resiliência de rede em ambiente de produção (HealthTech).
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Detecção exaustiva de erros transientes
      const msg = (error?.message || '').toUpperCase();
      const status = error?.status || error?.code;

      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      const isServerError = (status >= 500 && status < 600) || msg.includes('OVERLOADED') || msg.includes('SERVICE_UNAVAILABLE');
      const isNetworkError = msg.includes('FETCH') || msg.includes('NETWORK');

      if (isRateLimit || isServerError || isNetworkError) {
        // Cálculo exponencial com Jitter (variação randômica) para evitar "thundering herd"
        const backoff = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 500; // ±500ms de variação
        const delay = backoff + jitter;

        console.warn(`[Retry] Tentativa ${attempt + 1}/${maxRetries} falhou (${status}). Aguardando ${Math.round(delay)}ms...`, error.message);

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Se for erro de cliente (400, 401, 403) fixo, não adianta tentar de novo
      throw error;
    }
  }

  throw lastError;
}
