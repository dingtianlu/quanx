/**
 * 自动同步京东cookie到青龙环境变量
 */

const $ = new API('ql', true);

const title = '🐉 通知提示';

const jd_cookies = JSON.parse($.read('#CookiesJD') || '[]');

let remark = {};
try {
    const _remark = JSON.parse(
        JSON.parse($.read('#jd_ck_remark') || '{}').remark || '[]'
    );

    _remark.forEach((item) => {
        remark[item.username] = item;
    });
} catch (e) {
    console.log(e);
}

// 获取cookie字符串中的pin=
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

    // 查看当前青龙环境中的 默认 JD_COOKIE
    const cookiesRes = await $.ql.select();
    const ids = cookiesRes.data.map((item) => item.id);
    await $.ql.delete(ids);
    const wskeyRes = await $.ql.select('JD_WSCK');
    await $.ql.delete(wskeyRes.data.map((item) => item.id));
    $.log('清空 JD_COOKIE. JD_WSCK');

    const addData = [];
    const wsCookie = [];

    // 读取当前圈x中保存的cookies
    for (const jd_cookie of jd_cookies) {
        const username = getUsername(jd_cookie.cookie);
        let remarks = '';
        if (remark[username]) {
            remarks = remark[username].nickname;

            remarks += `&${remark[username].remark}`;
            if (remark[username].qywxUserId)
                remarks += `&${remark[username].qywxUserId}`;
        } else {
            remarks = username;
        }
        addData.push({ name: 'JD_COOKIE', value: jd_cookie.cookie, remarks });

        //圈x中有wskey就一起同步到青龙
        if (jd_cookie.wskey) {
            wsCookie.push({
                name: 'JD_WSCK',
                remarks: remarks.split('&')[0],
                value:
                    jd_cookie.wskey.indexOf('pt_pin') !== -1
                        ? jd_cookie.wskey
                        : `${jd_cookie.wskey}pt_pin=${encodeURI(username)};`,
            });
        }
    }
    // 请求青龙服务 添加环境变量
    if (addData.length) await $.ql.add(addData);
    if (wsCookie.length) await $.ql.add(wsCookie);

    const _cookiesRes = await $.ql.select();
    const _ids = [];
    // 检查添加后的cookie 是否有效，能否访问京东
    for (let index = 0; index < _cookiesRes.data.length; index++) {
        const item = _cookiesRes.data[index];
        const response = await TotalBean(item.value);
        if (response.retcode !== '0') _ids.push(item);
    }

    // 禁用过期账号对应的cookie
    if (_ids.length > 0) {
        const ids = _ids.map((item) => item.id);
        console.log(
            `过期账号：${_ids
                .map((item) => item.remarks || getUsername(item.value))
                .join(`\n`)}`
        );
        await $.ql.disabled(ids);
    }

    const cookieText = jd_cookies.map((item) => item.userName).join(`\n`);
    if ($.read('mute') !== 'true') {
        return $.notify(title, '', `🐉 已同步账号： ${cookieText}`);
    }
})()
    .catch((e) => {
        $.log(JSON.stringify(e));
    })
    .finally(() => {
        $.done();
    });

async function TotalBean(Cookie) {
    const opt = {
        url: 'https://me-api.jd.com/user_new/info/GetJDUserInfoUnion?sceneval=2&sceneval=2&g_login_type=1&g_ty=ls',
        headers: {
            cookie: Cookie,
            Referer: 'https://home.m.jd.com/',
        },
    };
    return $.http.get(opt).then((response) => {
        try {
            return JSON.parse(response.body);
        } catch (e) {
            return {};
        }
    });
}


// prettier-ignore
/*********************************** API *************************************/
function ENV() { const e = "undefined" != typeof $task, t = "undefined" != typeof $loon, s = "undefined" != typeof $httpClient && !t, i = "function" == typeof require && "undefined" != typeof $jsbox; return { isQX: e, isLoon: t, isSurge: s, isNode: "function" == typeof require && !i, isJSBox: i, isRequest: "undefined" != typeof $request, isScriptable: "undefined" != typeof importModule } } function HTTP(e = { baseURL: "" }) { const { isQX: t, isLoon: s, isSurge: i, isScriptable: n, isNode: o } = ENV(), r = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/; const u = {}; return ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"].forEach(l => u[l.toLowerCase()] = (u => (function (u, l) { l = "string" == typeof l ? { url: l } : l; const h = e.baseURL; h && !r.test(l.url || "") && (l.url = h ? h + l.url : l.url); const a = (l = { ...e, ...l }).timeout, c = { onRequest: () => { }, onResponse: e => e, onTimeout: () => { }, ...l.events }; let f, d; if (c.onRequest(u, l), t) f = $task.fetch({ method: u, ...l }); else if (s || i || o) f = new Promise((e, t) => { (o ? require("request") : $httpClient)[u.toLowerCase()](l, (s, i, n) => { s ? t(s) : e({ statusCode: i.status || i.statusCode, headers: i.headers, body: n }) }) }); else if (n) { const e = new Request(l.url); e.method = u, e.headers = l.headers, e.body = l.body, f = new Promise((t, s) => { e.loadString().then(s => { t({ statusCode: e.response.statusCode, headers: e.response.headers, body: s }) }).catch(e => s(e)) }) } const p = a ? new Promise((e, t) => { d = setTimeout(() => (c.onTimeout(), t(`${u} URL: ${l.url} exceeds the timeout ${a} ms`)), a) }) : null; return (p ? Promise.race([p, f]).then(e => (clearTimeout(d), e)) : f).then(e => c.onResponse(e)) })(l, u))), u } function API(e = "untitled", t = !1) { const { isQX: s, isLoon: i, isSurge: n, isNode: o, isJSBox: r, isScriptable: u } = ENV(); return new class { constructor(e, t) { this.name = e, this.debug = t, this.http = HTTP(), this.env = ENV(), this.node = (() => { if (o) { return { fs: require("fs") } } return null })(), this.initCache(); Promise.prototype.delay = function (e) { return this.then(function (t) { return ((e, t) => new Promise(function (s) { setTimeout(s.bind(null, t), e) }))(e, t) }) } } initCache() { if (s && (this.cache = JSON.parse($prefs.valueForKey(this.name) || "{}")), (i || n) && (this.cache = JSON.parse($persistentStore.read(this.name) || "{}")), o) { let e = "root.json"; this.node.fs.existsSync(e) || this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.root = {}, e = `${this.name}.json`, this.node.fs.existsSync(e) ? this.cache = JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)) : (this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.cache = {}) } } persistCache() { const e = JSON.stringify(this.cache, null, 2); s && $prefs.setValueForKey(e, this.name), (i || n) && $persistentStore.write(e, this.name), o && (this.node.fs.writeFileSync(`${this.name}.json`, e, { flag: "w" }, e => console.log(e)), this.node.fs.writeFileSync("root.json", JSON.stringify(this.root, null, 2), { flag: "w" }, e => console.log(e))) } write(e, t) { if (this.log(`SET ${t}`), -1 !== t.indexOf("#")) { if (t = t.substr(1), n || i) return $persistentStore.write(e, t); if (s) return $prefs.setValueForKey(e, t); o && (this.root[t] = e) } else this.cache[t] = e; this.persistCache() } read(e) { return this.log(`READ ${e}`), -1 === e.indexOf("#") ? this.cache[e] : (e = e.substr(1), n || i ? $persistentStore.read(e) : s ? $prefs.valueForKey(e) : o ? this.root[e] : void 0) } delete(e) { if (this.log(`DELETE ${e}`), -1 !== e.indexOf("#")) { if (e = e.substr(1), n || i) return $persistentStore.write(null, e); if (s) return $prefs.removeValueForKey(e); o && delete this.root[e] } else delete this.cache[e]; this.persistCache() } notify(e, t = "", l = "", h = {}) { const a = h["open-url"], c = h["media-url"]; if (s && $notify(e, t, l, h), n && $notification.post(e, t, l + `${c ? "\n多媒体:" + c : ""}`, { url: a }), i) { let s = {}; a && (s.openUrl = a), c && (s.mediaUrl = c), "{}" === JSON.stringify(s) ? $notification.post(e, t, l) : $notification.post(e, t, l, s) } if (o || u) { const s = l + (a ? `\n点击跳转: ${a}` : "") + (c ? `\n多媒体: ${c}` : ""); if (r) { require("push").schedule({ title: e, body: (t ? t + "\n" : "") + s }) } else console.log(`${e}\n${t}\n${s}\n\n`) } } log(e) { this.debug && console.log(`[${this.name}] LOG: ${this.stringify(e)}`) } info(e) { console.log(`[${this.name}] INFO: ${this.stringify(e)}`) } error(e) { console.log(`[${this.name}] ERROR: ${this.stringify(e)}`) } wait(e) { return new Promise(t => setTimeout(t, e)) } done(e = {}) { s || i || n ? $done(e) : o && !r && "undefined" != typeof $context && ($context.headers = e.headers, $context.statusCode = e.statusCode, $context.body = e.body) } stringify(e) { if ("string" == typeof e || e instanceof String) return e; try { return JSON.stringify(e, null, 2) } catch (e) { return "[object Object]" } } }(e, t) }
/*****************************************************************************/
