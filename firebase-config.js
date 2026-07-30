// Firebase 콘솔에서 발급받은 실제 프로젝트 설정값입니다.
// (콘솔에서 준 코드는 npm 모듈 방식(import)이라, 이 프로젝트는 <script> 태그로 불러오는
//  compat 방식을 쓰기 때문에 형식만 맞춰서 옮겼습니다. 값은 동일합니다.)

const firebaseConfig = {
  apiKey: "AIzaSyCwuRoEAcG3bPpD41sjY7KfFx1ySAjPIP8",
  authDomain: "stocking-bbb2b.firebaseapp.com",
  databaseURL: "https://stocking-bbb2b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stocking-bbb2b",
  storageBucket: "stocking-bbb2b.firebasestorage.app",
  messagingSenderId: "275864742795",
  appId: "1:275864742795:web:52ca459725509c87e2dd8e",
  measurementId: "G-YNFN6ZNQBV"
};

firebase.initializeApp(firebaseConfig);
