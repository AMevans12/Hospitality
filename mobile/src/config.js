import { Platform } from 'react-native';

// Android emulator reaches your PC at 10.0.2.2. For a real phone, put your PC's Wi-Fi IP here.
const HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
export const API_URL = `http://${HOST}:8000/api`;