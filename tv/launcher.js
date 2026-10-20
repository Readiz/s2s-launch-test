(function () {
  var config = window.APP_CONFIG;
  var status = document.getElementById('status');
  document.getElementById('name').textContent = config.name;
  document.title = config.name;
  var finished = {}, errors = [], exited = false;
  var request;

  function exitApp() {
    if (exited) return;
    exited = true;
    clearTimeout(deadline);
    if (request && request.readyState !== 4) request.abort();
    status.textContent = errors.length ? errors.join(' / ') : '명령 전송 완료';
    if (window.tizen) {
      try { tizen.application.getCurrentApplication().exit(); }
      catch (error) { status.textContent = '앱 종료 실패: ' + error.message; }
    } else {
      status.textContent += ' · 브라우저 미리보기에서는 창을 닫지 않습니다.';
    }
  }
  function done(channel, error) {
    if (finished[channel] || exited) return;
    finished[channel] = true;
    if (error) { errors.push(channel + ': ' + error); console.error(channel + ': ' + error); }
    if (finished.http && finished.hdmi) exitApp();
  }
  // Wait only for dispatch callbacks, never for a game session or HDMI completion.
  var deadline = setTimeout(function () {
    errors.push('호출 응답 시간 초과');
    exitApp();
  }, 7000);

  // Start HTTP first; App Control is dispatched immediately below.
  var base = !window.tizen && /^https?:$/.test(location.protocol) ? location.origin : config.pcBUrl;
  if (!base) {
    done('http', 'config.local.json에 pcBUrl을 설정하세요.');
  } else {
    try {
      request = new XMLHttpRequest();
      request.open('POST', base.replace(/\/+$/, '') + '/launch', true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.timeout = 6000;
      request.onload = function () {
        try {
          var result = JSON.parse(request.responseText);
          done('http', request.status === 200 && result.ok ? null : result.error || '실행 요청 실패');
        } catch (error) { done('http', error.message); }
      };
      request.onerror = function () { done('http', 'PC B 연결 실패'); };
      request.ontimeout = function () { done('http', 'PC B 응답 시간 초과'); };
      request.send(JSON.stringify({ app: config.app }));
    } catch (error) { done('http', error.message); }
  }
  window.wakeHdmi(config.hdmi, function (error) { done('hdmi', error); });
}());
