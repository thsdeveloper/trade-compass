import Constants from 'expo-constants';

// Resolve a URL base da API backend.
//
// Prioridade:
// 1. EXPO_PUBLIC_API_URL — quando definido no .env (produção, tunnel, IP fixo)
// 2. Host do Metro bundler (Constants.expoConfig.hostUri) — em `expo start`
//    na mesma rede Wi-Fi, o device físico alcança a API no mesmo IP da máquina
//    que serve o bundle, na porta 3001. Sem tunnel, sem IP hardcoded.
// 3. localhost — simulador iOS/Android com API local
function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:3001`;

  return 'http://localhost:3001';
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log(
    `[api-config] API_URL=${API_URL} (env=${process.env.EXPO_PUBLIC_API_URL ?? 'vazio'}, hostUri=${Constants.expoConfig?.hostUri ?? 'indisponível'})`
  );
}
