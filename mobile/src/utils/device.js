import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Identifies this phone. Android ID / iOS vendor ID, with a stored random ID as fallback.
export async function getDeviceInfo() {
  let id = null;
  try {
    id = Platform.OS === 'android'
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync();
  } catch (e) { /* fall back below */ }

  if (!id) {
    try {
      id = await SecureStore.getItemAsync('device_uid');
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        await SecureStore.setItemAsync('device_uid', id);
      }
    } catch (e) { id = ''; }
  }

  const name = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Platform.OS;
  return { device_id: String(id), device_name: name };
}