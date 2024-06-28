<h1>Resilience Diary</h1>
<img src="public/image/chat1.png" alt="Example Image" style="width:128px;">
<br>
<br>

<h2>Project Overview</h2>
<p>다이어리와 채팅방 모바일 앱 구현</p>
<p>개발기간: 2024.4.29 ~ 2024.6.28 </p>
<br>
<br>

<h2>배포 주소</h2>
<p>주소: https://diary.nehub.info</p>
<p>Figma: https://www.figma.com/proto/AZJyaKBO3pkLgJBjabfONx/%EA%B1%B4%EA%B0%95%EC%95%B1%EB%93%A4?page-id=0%3A1&type=design&node-id=1-2&viewport=372%2C203%2C0.2&t=N5AAETFtl9brMivj-1&scaling=scale-down&starting-point-node-id=1%3A2&mode=design</p>
<br>
<br>

<h2>시작 가이드</h2>
<h3>설치 방법</h3>
<p>프로그래시브 웹앱(pwa)방식으로 구현되어, 스토어에서 앱 설치하는 방식이 아닌 웹 브라우저에서 홈 화면에 추가하는 방식입니다.</p>
<p>안드로이드 모바일: 홈 화면에 추가</p>
<p>PC: 오른쪽 위 설치 버튼</p>
<p>앱 설치를 권장드리나 웹 사이트에서도 작동합니다.</p>
<br>

<h3>테스트 샘플 데이터</h3>
<p>Private for Security</p>
<br>

<h3>기능 소개</h3>
<ol>
  <li>첫 번째 채팅방(나의 일지): 특정 시간에 매일 문자가 오도록 구현한 혼자의 채팅방(node schedule)</li>
  <li>두 번째 채팅방(동료의 공간): 같은 그룹인 사람들끼리 묶인 방(socket.io)</li>
  <li>세 번째 채팅방(상담받고 싶어요): 상담사(admin)와의 1대1방(socket.io)</li>
  <li>우측 상단 달력 구현(Fullcalendar, javascript module)</li>
  <li>실시간 푸시 알림 구현(google FCM)</li>
</ol>
<br>
<br>

<h2>Stacks</h2>
<h3>Environment</h3>
<img src="https://img.shields.io/badge/visual studio code-007ACC?style=for-the-badge&logo=visual studio code&logoColor=white">
<img src="https://img.shields.io/badge/git-F05032?style=for-the-badge&logo=git&logoColor=white">
<img src="https://img.shields.io/badge/github-181717?style=for-the-badge&logo=github&logoColor=white">
<br>


<h3>Development</h3>
<img src="https://img.shields.io/badge/html5-E34F26?style=for-the-badge&logo=html5&logoColor=white">
<img src="https://img.shields.io/badge/css-1572B6?style=for-the-badge&logo=css3&logoColor=white">
<img src="https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
<img src="https://img.shields.io/badge/mariaDB-003545?style=for-the-badge&logo=mariaDB&logoColor=white">
<img src="https://img.shields.io/badge/mysql-4479A1?style=for-the-badge&logo=mysql&logoColor=white">
<p>MariaDB and MYSQL is used with Cafe24 DB</p>
<img src="https://img.shields.io/badge/firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white">
<img src="https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white">
<img src="https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white">
<img src="https://img.shields.io/badge/aws-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white"/>
<p>AWS is used for web hosting</p>
<br>

<h3>Program Tools</h3>
<p>Putty</p>
<img src="https://img.shields.io/badge/filezilla-BF0000?style=for-the-badge&logo=filezilla&logoColor=white">
<p>HeidiSQL</p>
<br>

<h3>Others</h3>
<p>SessionStorage(for saving data temporarily and using in page)</p>
<p>PWA(manifest.json, service-worker.js etc) for making webapp</p>
<img src="https://img.shields.io/badge/nginx-009639?style=for-the-badge&logo=nginx&logoColor=white">
<p>Nginx is used for replacing HTTP to HTTPS</p>
<br>
<br>

<h2>유의사항</h2>
<p>웹 호스팅은 AWS로 되어있고, DB만 Cafe24를 사용하고 있습니다.</p>

