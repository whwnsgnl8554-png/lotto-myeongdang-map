import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에 등록한 앱 이름(appName)과 똑같아야 해요
  appName: 'lotto-myeongdang',
  brand: { primaryColor: '#3182F6' },
  permissions: [{ name: 'geolocation', access: 'access' }],
  webBundleDir: 'dist',
});
