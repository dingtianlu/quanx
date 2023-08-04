var qlconf = {
  url: "http://127.0.0.1:57--",
  is_pwd : false,
  client_id: "***",
  client_secret: "***"
};
$prefs.setValueForKey(JSON.stringify(qlconf), "#ql");
var ql = $prefs.valueForKey("#ql");
console.log(ql);
$done({});