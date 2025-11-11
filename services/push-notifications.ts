import api from './api';

/**
 * Register device push token with the server
 */
export async function registerPushToken(pushToken: string, platform?: 'ios' | 'android' | 'web'): Promise<void> {
  try {
    await api.post('/push-tokens', { token: pushToken, platform });
  } catch (error) {
    console.error('Failed to register push token:', error);
    throw error;
  }
}

/**
 * Unregister device push token from the server
 */
export async function unregisterPushToken(pushToken: string): Promise<void> {
  try {
    await api.delete('/push-tokens', { data: { token: pushToken } });
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    throw error;
  }
}

