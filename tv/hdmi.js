// Contract: docs/tv-service.md. The service chooses the HDMI target; no payload is required.
window.wakeHdmi = function (config, done) {
  if (!config.appId || !config.operation) { done('HDMI 내부 서비스 호출값을 설정해 주세요.'); return; }
  if (!window.tizen) { done('HDMI 호출은 TV에서 확인하세요.'); return; }
  try {
    var data = (config.data || []).map(function (item) {
      return new tizen.ApplicationControlData(item.key, item.value);
    });
    var control = new tizen.ApplicationControl(config.operation, config.uri || null, null, null, data, 'SINGLE');
    tizen.application.launchAppControl(control, config.appId, function () { done(null); }, function (error) { done(error.name + ': ' + error.message); });
  } catch (error) { done(error.message); }
};
