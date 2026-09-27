// 앱인토스 SDK 중 이 앱이 쓰는 기능만 묶어서 window.__AIT__로 내보내요.
import { getCurrentLocation, openURL, Accuracy } from '@apps-in-toss/web-framework';
window.__AIT__ = { getCurrentLocation, openURL, Accuracy };
