import Constants from 'expo-constants';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'http://bcim.ddns.net:3001/api/v1';

export const LOGIN_PAGE_URL =
  Constants.expoConfig?.extra?.loginPageUrl ||
  'http://bcim.ddns.net:3000';
