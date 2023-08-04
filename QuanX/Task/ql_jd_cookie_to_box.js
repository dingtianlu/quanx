/**
 * 自动同步 青龙环境变量中的京东cookie 到 boxjs中
 */

const $ = new API('ql', true);

const title = '🐉 通知提示';
const cookiesKey = '#CookiesJD';
let jd_reamrk = $.read('#jd_ck_remark');
let jd_cookies = [];
try {
    jd_cookies = JSON.parse($.read(cookiesKey) || '[]');
    jd_reamrk = JSON.parse(jd_reamrk || '[]');
} catch (e) {
    console.log(e);
}

function getUsername(ck) {
    if (!ck) return '';
    return decodeURIComponent(ck.match(/pin=(.+?);/)[1]);
}

// 获取远程脚本
async function getScriptUrl() {
    const response = await $.http.get({
        url: 'https://raw.githubusercontent.com/dingtianlu/quanx/main/QuanX/Task/ql_api.js',
    });
    return response.body;
}

(async () => {
    const ql_script = (await getScriptUrl()) || '';
    eval(ql_script);
    await $.ql.login();
    const cookiesRes = await $.ql.select();
    const wskeyRes = await $.ql.select('JD_WSCK');

    const JD_CACHE_INFO = await $.ql.select('JD_CACHE_INFO');

    const wskey = {};
    wskeyRes.data.forEach((item) => {
        const pin = getUsername(item.value);
        wskey[pin] = item.value;
    });

    const cookies = cookiesRes.data.map((item) => {
        const key = getUsername(item.value);
        return { userName: key, cookie: item.value };
    });
    const saveCookie = jd_cookies.map((item) => {
        const qlCk = cookies.find((ql) => ql.userName === item.userName);
        let temp = { ...item };
        if (qlCk) {
            temp = { ...temp, ...qlCk };
            if (wskey[item.userName]) temp.wskey = wskey[item.userName];
        }
        return temp;
    });
    const userNames = saveCookie.map((item) => item.userName);
    cookies.forEach((ql) => {
        if (userNames.indexOf(ql.userName) === -1) saveCookie.push(ql);
    });

    if (JD_CACHE_INFO.data.length) {
        const cache_info = JSON.parse(JD_CACHE_INFO.data[0].value);
        jd_reamrk.remark = JSON.parse(jd_reamrk.remark || '[]');

        if (jd_reamrk.remark.length) {
            jd_reamrk.remark = jd_reamrk.remark.map((item, index) => {
                if (cache_info[item.username]) {
                    return { ...item, ...cache_info[item.username], index };
                }
                return item;
            });
            jd_reamrk.remark = JSON.stringify(jd_reamrk.remark, null, `\t`);
            $.write(JSON.stringify(jd_reamrk), `#jd_ck_remark`);
        }

    }

    $.write(JSON.stringify(saveCookie, null, `\t`), cookiesKey);
    if ($.read('mute') !== 'true') {
        return $.notify(
            title,
            '已同步账号',
            `${cookies.map((item) => item.userName).join(`\n`)}`
        );
    }
})()
    .catch((e) => {
        $.log(JSON.stringify(e));
    })
    .finally(() => {
        $.done();
    });

// prettier-ignore
/*********************************** API *************************************/
function ENV() { const e = "undefined" != typeof $task, t = "undefined" != typeof $loon, s = "undefined" != typeof $httpClient && !t, i = "function" == typeof require && "undefined" != typeof $jsbox; return { isQX: e, isLoon: t, isSurge: s, isNode: "function" == typeof require && !i, isJSBox: i, isRequest: "undefined" != typeof $request, isScriptable: "undefined" != typeof importModule } } function HTTP(e = { baseURL: "" }) { const { isQX: t, isLoon: s, isSurge: i, isScriptable: n, isNode: o } = ENV(), r = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/; const u = {}; return ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"].forEach(l => u[l.toLowerCase()] = (u => (function (u, l) { l = "string" == typeof l ? { url: l } : l; const h = e.baseURL; h && !r.test(l.url || "") && (l.url = h ? h + l.url : l.url); const a = (l = { ...e, ...l }).timeout, c = { onRequest: () => { }, onResponse: e => e, onTimeout: () => { }, ...l.events }; let f, d; if (c.onRequest(u, l), t) f = $task.fetch({ method: u, ...l }); else if (s || i || o) f = new Promise((e, t) => { (o ? require("request") : $httpClient)[u.toLowerCase()](l, (s, i, n) => { s ? t(s) : e({ statusCode: i.status || i.statusCode, headers: i.headers, body: n }) }) }); else if (n) { const e = new Request(l.url); e.method = u, e.headers = l.headers, e.body = l.body, f = new Promise((t, s) => { e.loadString().then(s => { t({ statusCode: e.response.statusCode, headers: e.response.headers, body: s }) }).catch(e => s(e)) }) } const p = a ? new Promise((e, t) => { d = setTimeout(() => (c.onTimeout(), t(`${u} URL: ${l.url} exceeds the timeout ${a} ms`)), a) }) : null; return (p ? Promise.race([p, f]).then(e => (clearTimeout(d), e)) : f).then(e => c.onResponse(e)) })(l, u))), u } function API(e = "untitled", t = !1) { const { isQX: s, isLoon: i, isSurge: n, isNode: o, isJSBox: r, isScriptable: u } = ENV(); return new class { constructor(e, t) { this.name = e, this.debug = t, this.http = HTTP(), this.env = ENV(), this.node = (() => { if (o) { return { fs: require("fs") } } return null })(), this.initCache(); Promise.prototype.delay = function (e) { return this.then(function (t) { return ((e, t) => new Promise(function (s) { setTimeout(s.bind(null, t), e) }))(e, t) }) } } initCache() { if (s && (this.cache = JSON.parse($prefs.valueForKey(this.name) || "{}")), (i || n) && (this.cache = JSON.parse($persistentStore.read(this.name) || "{}")), o) { let e = "root.json"; this.node.fs.existsSync(e) || this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.root = {}, e = `${this.name}.json`, this.node.fs.existsSync(e) ? this.cache = JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)) : (this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.cache = {}) } } persistCache() { const e = JSON.stringify(this.cache, null, 2); s && $prefs.setValueForKey(e, this.name), (i || n) && $persistentStore.write(e, this.name), o && (this.node.fs.writeFileSync(`${this.name}.json`, e, { flag: "w" }, e => console.log(e)), this.node.fs.writeFileSync("root.json", JSON.stringify(this.root, null, 2), { flag: "w" }, e => console.log(e))) } write(e, t) { if (this.log(`SET ${t}`), -1 !== t.indexOf("#")) { if (t = t.substr(1), n || i) return $persistentStore.write(e, t); if (s) return $prefs.setValueForKey(e, t); o && (this.root[t] = e) } else this.cache[t] = e; this.persistCache() } read(e) { return this.log(`READ ${e}`), -1 === e.indexOf("#") ? this.cache[e] : (e = e.substr(1), n || i ? $persistentStore.read(e) : s ? $prefs.valueForKey(e) : o ? this.root[e] : void 0) } delete(e) { if (this.log(`DELETE ${e}`), -1 !== e.indexOf("#")) { if (e = e.substr(1), n || i) return $persistentStore.write(null, e); if (s) return $prefs.removeValueForKey(e); o && delete this.root[e] } else delete this.cache[e]; this.persistCache() } notify(e, t = "", l = "", h = {}) { const a = h["open-url"], c = h["media-url"]; if (s && $notify(e, t, l, h), n && $notification.post(e, t, l + `${c ? "\n多媒体:" + c : ""}`, { url: a }), i) { let s = {}; a && (s.openUrl = a), c && (s.mediaUrl = c), "{}" === JSON.stringify(s) ? $notification.post(e, t, l) : $notification.post(e, t, l, s) } if (o || u) { const s = l + (a ? `\n点击跳转: ${a}` : "") + (c ? `\n多媒体: ${c}` : ""); if (r) { require("push").schedule({ title: e, body: (t ? t + "\n" : "") + s }) } else console.log(`${e}\n${t}\n${s}\n\n`) } } log(e) { this.debug && console.log(`[${this.name}] LOG: ${this.stringify(e)}`) } info(e) { console.log(`[${this.name}] INFO: ${this.stringify(e)}`) } error(e) { console.log(`[${this.name}] ERROR: ${this.stringify(e)}`) } wait(e) { return new Promise(t => setTimeout(t, e)) } done(e = {}) { s || i || n ? $done(e) : o && !r && "undefined" != typeof $context && ($context.headers = e.headers, $context.statusCode = e.statusCode, $context.body = e.body) } stringify(e) { if ("string" == typeof e || e instanceof String) return e; try { return JSON.stringify(e, null, 2) } catch (e) { return "[object Object]" } } }(e, t) }
/*****************************************************************************/
