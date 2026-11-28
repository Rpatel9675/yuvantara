// Yuvantara Email OTP client.
// The server (server/server.js) generates, emails and verifies the code.
// The browser never sees or generates the code.
(function (window) {
  'use strict';

  function apiBase() {
    var c = window.YUVANTARA_CONFIG || {};
    return (c.api && c.api.baseUrl) || '/api';
  }

  function post(path, body) {
    return fetch(apiBase() + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return { success: false, error: 'Unexpected server response.' }; })
        .then(function (d) {
          if (!res.ok || !d.success) throw new Error(d.error || 'Request failed. Please try again.');
          return d;
        });
    }, function () {
      throw new Error('Cannot reach the server. Please check your connection and try again.');
    });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var TITLES = {
    signup: 'Verify your email to finish signing up',
    login: 'Enter the code to log in',
    forgot_password: 'Verify your email to reset your password'
  };

  var OTP = {
    isEnabled: function (key) {
      var o = (window.YUVANTARA_CONFIG || {}).otp;
      if (!o || o.enabled === false) return false;
      return o[key] !== false;
    },

    sendOtp: function (email, purpose, name) {
      return post('/auth/send-otp', { email: email, purpose: purpose, name: name });
    },

    verifyOtp: function (email, code, purpose) {
      return post('/auth/verify-otp', { email: email, code: code, purpose: purpose });
    },

    // Opens a dialog, sends the code and resolves true once the user enters the correct code (false if cancelled).
    verifyEmail: function (opts) {
      var email = String(opts.email || '').trim().toLowerCase();
      var purpose = opts.purpose || 'verification';
      var name = opts.name || 'Student';

      return new Promise(function (resolve) {
        var old = document.getElementById('yuv-otp-overlay');
        if (old) old.remove();

        var css = document.createElement('style');
        css.textContent =
          '#yuv-otp-overlay{position:fixed;inset:0;background:rgba(10,14,23,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
          '#yuv-otp-box{background:#fff;color:#0F172A;border-radius:16px;max-width:400px;width:100%;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center}' +
          '#yuv-otp-box h3{margin:0 0 8px;font-size:1.15rem}' +
          '#yuv-otp-box p{margin:0 0 14px;color:#475569;font-size:.9rem;line-height:1.5}' +
          '#yuv-otp-code{width:100%;box-sizing:border-box;text-align:center;font-size:1.7rem;letter-spacing:.5rem;padding:12px;border:1.5px solid #CBD5E1;border-radius:10px;margin-bottom:10px;color:#0F172A;background:#fff}' +
          '#yuv-otp-msg{min-height:20px;font-size:.85rem;margin-bottom:10px}' +
          '#yuv-otp-box button{cursor:pointer;border-radius:10px;font-size:.95rem;font-weight:600;padding:11px 16px;border:0}' +
          '#yuv-otp-verify{width:100%;background:#2563EB;color:#fff}' +
          '#yuv-otp-verify:disabled{opacity:.6;cursor:wait}' +
          '.yuv-otp-row{display:flex;justify-content:space-between;margin-top:12px}' +
          '.yuv-otp-link{background:none!important;color:#2563EB;padding:4px 2px!important;font-size:.85rem!important}' +
          '.yuv-otp-link:disabled{color:#94A3B8;cursor:not-allowed}';
        document.head.appendChild(css);

        var ov = document.createElement('div');
        ov.id = 'yuv-otp-overlay';
        ov.innerHTML =
          '<div id="yuv-otp-box" role="dialog" aria-modal="true" aria-label="Email verification">' +
          '<div style="font-size:2rem;margin-bottom:6px">📧</div>' +
          '<h3>' + esc(TITLES[purpose] || 'Verify your email') + '</h3>' +
          '<p id="yuv-otp-info">Sending a 6-digit code to <strong>' + esc(email) + '</strong>…</p>' +
          '<input id="yuv-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="6-digit code">' +
          '<div id="yuv-otp-msg" role="alert"></div>' +
          '<button id="yuv-otp-verify" type="button">Verify</button>' +
          '<div class="yuv-otp-row"><button id="yuv-otp-resend" class="yuv-otp-link" type="button" disabled>Resend code</button>' +
          '<button id="yuv-otp-cancel" class="yuv-otp-link" type="button" style="color:#64748B!important">Cancel</button></div>' +
          '<p style="margin:12px 0 0;font-size:.78rem;color:#94A3B8">Sent by Yuvantara Venture. Check your spam folder if you don’t see it.</p>' +
          '</div>';
        document.body.appendChild(ov);

        var codeEl = ov.querySelector('#yuv-otp-code');
        var msgEl = ov.querySelector('#yuv-otp-msg');
        var infoEl = ov.querySelector('#yuv-otp-info');
        var verifyBtn = ov.querySelector('#yuv-otp-verify');
        var resendBtn = ov.querySelector('#yuv-otp-resend');
        var timer = null;
        var done = false;

        function finish(ok) {
          if (done) return;
          done = true;
          clearInterval(timer);
          ov.remove(); css.remove();
          resolve(ok);
        }
        function setMsg(t, good) { msgEl.style.color = good ? '#059669' : '#DC2626'; msgEl.textContent = t || ''; }
        function startCooldown() {
          var left = 30;
          resendBtn.disabled = true;
          resendBtn.textContent = 'Resend in ' + left + 's';
          clearInterval(timer);
          timer = setInterval(function () {
            left--;
            if (left <= 0) { clearInterval(timer); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
            else resendBtn.textContent = 'Resend in ' + left + 's';
          }, 1000);
        }
        function send() {
          setMsg('');
          return OTP.sendOtp(email, purpose, name).then(function (d) {
            infoEl.innerHTML = d.dispatched === false
              ? 'Development mode: no email server is configured. The code was printed in the server console.'
              : 'We sent a 6-digit code to <strong>' + esc(email) + '</strong>. It is valid for 10 minutes.';
            startCooldown();
            codeEl.focus();
          }).catch(function (err) {
            infoEl.textContent = 'We could not send the code.';
            setMsg(err.message);
            resendBtn.disabled = false; resendBtn.textContent = 'Try again';
          });
        }

        verifyBtn.onclick = function () {
          var code = codeEl.value.replace(/\D/g, '');
          if (code.length !== 6) { setMsg('Enter the 6-digit code from your email.'); return; }
          verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying…';
          OTP.verifyOtp(email, code, purpose).then(function () {
            setMsg('Email verified ✓', true);
            setTimeout(function () { finish(true); }, 350);
          }).catch(function (err) {
            setMsg(err.message);
            verifyBtn.disabled = false; verifyBtn.textContent = 'Verify';
            codeEl.select();
          });
        };
        codeEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyBtn.click(); });
        resendBtn.onclick = send;
        ov.querySelector('#yuv-otp-cancel').onclick = function () { finish(false); };

        send();
      });
    }
  };

  window.YuvantaraOTP = OTP;
})(window);
