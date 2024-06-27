import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-analytics.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging.js";
import { firebaseConfig, vapidKey } from '../config.js';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

navigator.serviceWorker.register('../firebase-messaging-sw.js')
    .then((registration) => {
        return getToken(messaging, {
            ServiceWorkerRegistration: registration,
            vapidKey: vapidKey
        });
    })
    .then((currentToken) => {
        console.log('Device token:', currentToken);
        const user_idk = sessionStorage.getItem('id');
        socket.emit('registerToken', { token: currentToken, user_id: user_idk });
        // 서버에 토큰을 전송하는 코드 (예: WebSocket, AJAX 등을 사용)
    })
    .catch((err) => {
        console.error('An error occurred while retrieving token. ', err);
    });

export { app, analytics, messaging };


if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('../firebase-messaging-sw.js')
        .then(function () {
            console.log('서비스 워커 등록 완료!');

        })
}

document.addEventListener('DOMContentLoaded', function () {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                // 여기에서 추가적으로 토큰을 등록하거나 필요한 작업을 수행할 수 있습니다.
            } else {
                console.log('Notification permission denied.');
            }
        });
    }
});