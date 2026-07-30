/**
 * ==========================================================================
 * [Google Apps Script (GAS) 웹 애플리케이션 진입점 코드]
 * ==========================================================================
 * 이 코드는 구글 앱스 스크립트 편집기의 'Code.gs' 파일에 복사하여 붙여넣으세요.
 */

/**
 * 웹 앱 요청(GET)을 처리하는 함수
 * 브라우저에서 배포된 웹 앱 URL로 접속할 때 자동으로 호출되어 Index.html 페이지를 보여줍니다.
 * 
 * @param {Object} e - HTTP GET 요청 이벤트 객체
 * @returns {HtmlOutput} 랜더링된 HTML 페이지 객체
 */
function doGet(e) {
  // 'Index.html' 파일로부터 HTML 출력 객체 생성
  var htmlOutput = HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('럭키 드로우 - 무작위 숫자 뽑기') // 브라우저 탭 타이틀 설정
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0') // 모바일 반응형 비포트 설정
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // iframe 퍼가기 허용 설정

  return htmlOutput;
}
