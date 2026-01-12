
/**
 * Executa uma função assíncrona com retries exponenciais.
 * Útil para lidar com erros 429 (Rate Limit) da API do Gemini.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Verifica se é erro de servidor (5xx) ou Rate Limit (429)
      // O SDK do Gemini às vezes retorna status code dentro de 'status' ou mensagem de erro string
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes('429') || 
                          error?.message?.includes('RESOURCE_EXHAUSTED');
      
      const isServerError = error?.status >= 500 && error?.status < 600;

      if (isRateLimit || isServerError) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[Retry] Tentativa ${attempt + 1}/${maxRetries} falhou. Aguardando ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Se for erro de cliente (400) ou outro não transiente, falha imediatamente
      throw error;
    }
  }
  
  throw lastError;
}
