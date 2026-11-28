// Yuvantara Portal Scripts

// 1. Mobile Menu Toggle & Dropdowns
const n = document.querySelector('.nav'), d = [...document.querySelectorAll('.dd')];
const burger = document.querySelector('.burger');
if (burger && n) {
  burger.onclick = () => n.classList.toggle('open');
}
d.forEach(x => x.addEventListener('toggle', () => {
  if (x.open) d.forEach(o => { if (o !== x) o.open = false; });
}));
document.addEventListener('click', e => {
  d.forEach(x => { if (!x.contains(e.target)) x.open = false; });
});

// 2. Base Path Resolution & Image Loader
(function() {
  // Compute site root (empty "" on index.html, "../" on 1-depth subpages, "../../" on 2-depth)
  var linkTag = document.querySelector('link[href*="style.css"]');
  var siteRoot = '';
  if (linkTag) {
    var href = linkTag.getAttribute('href') || '';
    var m = href.match(/^(\.\.\/)+/);
    if (m) {
      siteRoot = m[0]; // e.g. "../" or "../../"
    }
  }
  window.__yuvantaraBasePath = siteRoot;

  var assetsDir = siteRoot + 'assets/';

  // Ensure config.js, db.js, cloud-db.js, qr-generator.js, header.js, footer.js are loaded
  var requiredScripts = ['config.js', 'db.js', 'cloud-db.js', 'qr-generator.js', 'header.js', 'footer.js'];
  // Scripts added here MUST run in this order (config.js before db.js before cloud-db.js): dynamically inserted scripts are
  // async by default, which let db.js run before config.js - the data-reset epoch was then skipped on this page and a brand-new
  // visitor's session / pending enrollment was wiped when they reached the payment page. Also carry the cache-busting version.
  var siteVer = '';
  try { var cs = document.currentScript || document.querySelector('script[src*="site.js"]'); var vm = cs && cs.src && cs.src.match(/\?v=[^&#]+/); siteVer = vm ? vm[0] : ''; } catch (e) {}
  requiredScripts.forEach(function(s) {
    var hasScript = document.querySelector('script[src*="' + s + '"]');
    if (!hasScript) {
      var sc = document.createElement('script');
      sc.async = false;
      sc.src = assetsDir + s + siteVer;
      document.head.appendChild(sc);
    }
  });

  var baseImgDir = assetsDir + 'images/';

  var IM = {
    'technologies':    baseImgDir + 'innovation.jpg',
    'cybersecurity':   baseImgDir + 'cyber.jpg',
    'infrastructure':  baseImgDir + 'automation.jpg',
    'managed-services':baseImgDir + 'management.jpg',
    'machine-learning':baseImgDir + 'machine.jpg',
    'healthcare':      baseImgDir + 'medical.jpg',
    'logistics':       baseImgDir + 'robotics-lab.jpg',
    'education':       baseImgDir + 'python.jpg',
    'ai':              baseImgDir + 'ai.jpg',
    'robotics':        baseImgDir + 'robotics.jpg',
    'innovation':      baseImgDir + 'innovation.jpg',
    'agriculture':     baseImgDir + 'agriculture.jpg',
    'python':          baseImgDir + 'python.jpg',
    'management':      baseImgDir + 'management.jpg',
    'financial':       baseImgDir + 'financial.jpg',
    'bio-research':    baseImgDir + 'bio-research.jpg',
    'connect':         baseImgDir + 'connect.jpg'
  };

  function imgs(r) {
    (r || document).querySelectorAll('img[data-img]').forEach(function(i) {
      var b = i.dataset.img;
      if (IM[b]) {
        i.src = IM[b];
        i.onerror = function() {
          i.parentNode.classList.add('noimg');
          i.remove();
        };
        return;
      }
      var x = ['png', 'jpg', 'jpeg', 'webp'], k = 0;
      i.onerror = function() {
        if (++k < x.length) i.src = baseImgDir + b + '.' + x[k];
        else { i.parentNode.classList.add('noimg'); i.remove(); }
      };
      i.src = baseImgDir + b + '.' + x[0];
    });
  }
  imgs();
  window.imgs = imgs;
})();

// 3. Dynamic User State in Navigation
function updateNavUserState() {
  if (!window.YuvantaraDB) return;
  var user = YuvantaraDB.getCurrentUser();
  if (!user) return;

  var basePath = window.__yuvantaraBasePath || '';

  // Once logged in, hide option to apply for internship program
  // (Students keep the course-specific "Enroll" buttons: those enroll the logged-in account directly.)
  document.querySelectorAll('[data-auth="signup"]').forEach(function(btn) {
    if (user.role === 'student' && btn.dataset.course) { btn.style.display = ''; return; }
    btn.style.display = 'none';
  });

  var loginBtns = document.querySelectorAll('[data-auth="login"]');
  loginBtns.forEach(function(btn) {
    btn.removeAttribute('data-auth');
    if (user.role === 'admin') {
      btn.textContent = 'Admin Console';
      btn.onclick = function(e) {
        e.preventDefault();
        window.location.href = basePath + 'admin_login_777/index.html';
      };
    } else {
      btn.textContent = 'My Portal (' + (user.name ? user.name.split(' ')[0] : 'Student') + ')';
      btn.onclick = function(e) {
        e.preventDefault();
        window.location.href = basePath + 'portal/index.html';
      };
    }
  });
}
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(updateNavUserState, 150);
});

// 3b. Enrollment helper (shared by the Login modal, the Portal login gate and the course "Enroll" buttons)
(function() {
  var FALLBACK_COURSES = [
    'Cybersecurity & SOC Operations', 'Artificial Intelligence & Machine Learning', 'Cloud Infrastructure & DevOps',
    'Python Full-Stack & Automation', 'Robotics & IoT Embedded Systems', 'Data Science & Business Analytics',
    'Full-Stack Web Development (MERN)', 'Embedded Systems & VLSI Design', 'Other Specialized Program'
  ];
  var NO_COURSE_LABEL = 'Just log in (no new enrollment)';

  function courseList() {
    var sel = document.getElementById('s-prog');
    var out = [];
    if (sel) for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value) out.push(sel.options[i].text); }
    return out.length ? out : FALLBACK_COURSES;
  }

  // Adds an optional "Enroll in a course" dropdown to a login form (right before its submit button).
  function addCourseSelect(form, id) {
    if (!form || document.getElementById(id)) return document.getElementById(id);
    var wrap = document.createElement('div');
    wrap.className = 'fgroup';
    wrap.innerHTML = '<label for="' + id + '">Enroll in a course <span style="font-weight:400;color:#64748B">(optional)</span></label>' +
                     '<select id="' + id + '"></select>' +
                     '<small id="' + id + '-hint" style="display:none;color:#64748B;font-size:.78rem;margin-top:4px"></small>';
    var sel = wrap.querySelector('select');
    var none = document.createElement('option'); none.value = ''; none.textContent = NO_COURSE_LABEL; sel.appendChild(none);
    courseList().forEach(function(c) { var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    var submit = form.querySelector('[type="submit"]');
    if (submit) form.insertBefore(wrap, submit); else form.appendChild(wrap);
    sel.addEventListener('change', function() { syncSubmitLabel(form, sel); });
    return sel;
  }

  function syncSubmitLabel(form, sel) {
    var btn = form && form.querySelector('[type="submit"]');
    if (!btn) return;
    if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
    btn.textContent = sel && sel.value ? 'Login & Enroll →' : btn.dataset.origLabel;
  }

  // Selects `course` in a dropdown, adding it as an option when the list does not have it yet.
  function selectCourse(sel, course) {
    if (!sel || !course) return;
    var want = course.toLowerCase();
    for (var i = 0; i < sel.options.length; i++) {
      var t = sel.options[i].text.toLowerCase();
      if (sel.options[i].value && (t === want || t.indexOf(want) !== -1 || want.indexOf(t) !== -1)) { sel.selectedIndex = i; return; }
    }
    var o = document.createElement('option'); o.value = course; o.textContent = course; sel.appendChild(o);
    sel.value = course;
  }

  function basePath() { return window.__yuvantaraBasePath || ''; }

  // Push the (just saved) record to the shared database BEFORE leaving the page, otherwise the redirect can cancel it.
  function goAfterCloudPush(url) {
    var c = window.YuvantaraCloudDB;
    function go() { window.location.href = url; }
    if (c && c.isConfigured && c.isConfigured() && c.flushNow) {
      c.flushNow(5000).then(function(r) {
        if (r && (r.error || r.timedOut)) { try { console.warn('Cloud push did not finish before redirect:', r.error || 'timeout'); } catch (e) {} }
        go();
      });
    } else { go(); }
  }

  // Enroll the logged-in student in `course` and continue to the payment/application page.
  function enrollNow(course) {
    var DB = window.YuvantaraDB;
    var user = DB && DB.getCurrentUser();
    if (!user || user.role !== 'student') {
      if (window.openAuthModal) window.openAuthModal('login', course);
      return;
    }
    function run() {
      var r = DB.enrollStudentInTrack(user.email, course);
      if (!r.success) {
        alert(r.message || 'Could not enroll in this course.');
        if (r.locked) window.location.href = basePath() + 'portal/index.html';
        return;
      }
      if (r.already) {
        alert('You are already enrolled in "' + course + '". Opening your portal.');
        window.location.href = basePath() + 'portal/index.html';
        return;
      }
      var u = r.user;
      try {
        localStorage.setItem('yuvantara_pending_app', JSON.stringify({
          appId: u.id, name: u.name, email: u.email, phone: u.phone, dob: u.dob,
          track: u.track, stream: u.stream, college: u.college, createdAt: Date.now()
        }));
      } catch (e) {}
      goAfterCloudPush(basePath() + 'payment/index.html');
    }
    // make sure we compare against the latest cloud copy of this account
    if (DB.ensureFresh) DB.ensureFresh().then(run); else run();
  }

  window.YuvantaraEnroll = {
    addCourseSelect: addCourseSelect, selectCourse: selectCourse, syncSubmitLabel: syncSubmitLabel,
    enrollNow: enrollNow, goAfterCloudPush: goAfterCloudPush
  };

  document.addEventListener('DOMContentLoaded', function() {
    // Portal login gate gets the same optional course dropdown
    // (No course dropdown on login any more: students choose a program from the list shown after they log in.)
  });
})();

// 4. Login / Sign-up Modal
(function() {
  var modal = document.getElementById('auth-modal');
  var overlay = document.getElementById('auth-overlay');
  if (!modal) return;

  function switchTab(t) {
    modal.querySelectorAll('.auth-tab-btn:not(.link)').forEach(function(b) {
      b.classList.toggle('active', b.dataset.tab === t);
    });
    modal.querySelectorAll('.auth-pane').forEach(function(p) {
      p.classList.toggle('active', p.dataset.pane === t);
    });
  }

  function openModal(tab, preselectCourse) {
    window.__yuvantaraPickedCourse = preselectCourse || '';   // only set when a specific program's Apply button was clicked
    switchTab(tab || 'login');
    if (preselectCourse) {
      var progSelect = document.getElementById('s-prog');
      if (progSelect) {
        for (var i = 0; i < progSelect.options.length; i++) {
          if (progSelect.options[i].text.toLowerCase().indexOf(preselectCourse.toLowerCase()) !== -1) {
            progSelect.selectedIndex = i;
            break;
          }
        }
      }
      // same course pre-selected on the Login tab, so existing students can enroll after logging in
      var lp = document.getElementById('l-prog');
      if (lp) {
        window.YuvantaraEnroll.selectCourse(lp, preselectCourse);
        window.YuvantaraEnroll.syncSubmitLabel(document.getElementById('form-login'), lp);
      }
    }
    modal.classList.add('open');
    if (overlay) overlay.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    var successView = document.getElementById('signup-success-view');
    var signupForm = document.getElementById('form-signup');
    if (successView) successView.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
  }

  // Delegated click handler for modal open triggers across the entire page (header, hero, cards, footer)
  document.addEventListener('click', function(e) {
    // "Explore all / View all programs" links: visitors must log in or sign up first; then they see the program list.
    var gate = e.target.closest && e.target.closest('[data-programs-gate]');
    if (gate) {
      var gu = window.YuvantaraDB && YuvantaraDB.getCurrentUser && YuvantaraDB.getCurrentUser();
      if (!gu) {
        e.preventDefault();
        openModal('login', '');
        return;
      }
      if (gu.role === 'student') {
        var bought = gu.paymentStatus === 'paid' || ['pending', 'active', 'completed'].indexOf(gu.accountStatus) !== -1;
        if (!bought) { e.preventDefault(); window.location.href = (window.__yuvantaraBasePath || '') + 'portal/index.html'; return; }
      }
      return;   // admins and enrolled students follow the link to the full catalog
    }
    var btn = e.target.closest('[data-auth]');
    if (btn) {
      e.preventDefault();
      var tab = btn.dataset.auth || 'login';
      var course = btn.dataset.course || '';
      // Already logged in as a student and clicked a course's Enroll button -> enroll that account directly
      var sessUser = window.YuvantaraDB && YuvantaraDB.getCurrentUser && YuvantaraDB.getCurrentUser();
      if (tab === 'signup' && course && sessUser && sessUser.role === 'student') {
        if (confirm('Enroll in "' + course + '" with your account (' + sessUser.email + ')?')) window.YuvantaraEnroll.enrollNow(course);
        return;
      }
      openModal(tab, course);
      return;
    }

    var tabBtn = e.target.closest('.auth-tab-btn');
    if (tabBtn && modal && modal.contains(tabBtn) && !tabBtn.classList.contains('link')) {
      e.preventDefault();
      switchTab(tabBtn.dataset.tab);
      return;
    }
  });

  // Close triggers
  var closeBtn = modal.querySelector('.auth-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // Simple Captchas
  function newCaptcha(id) {
    var a = Math.ceil(Math.random() * 9), b = Math.ceil(Math.random() * 9);
    var el = document.getElementById(id);
    if (el) { el.dataset.ans = a + b; el.textContent = a + ' + ' + b + ' = ?'; }
  }
  newCaptcha('cap-login-q');
  newCaptcha('cap-signup-q');

  // ── Email OTP helper: lazy-loads assets/otp-service.js, resolves true when the email is verified ──
  function withOtp(flag, email, purpose, name) {
    var cfg = (window.YUVANTARA_CONFIG || {}).otp;
    if (!cfg || cfg.enabled === false || cfg[flag] === false) return Promise.resolve(true);
    function run() { return window.YuvantaraOTP.verifyEmail({ email: email, purpose: purpose, name: name }); }
    if (window.YuvantaraOTP) return run();
    return new Promise(function (resolve) {
      var sc = document.createElement('script');
      sc.src = (window.__yuvantaraBasePath || '') + 'assets/otp-service.js?v=20261127c';
      sc.onload = function () { resolve(run()); };
      sc.onerror = function () { alert('Could not load email verification. Please refresh and try again.'); resolve(false); };
      document.head.appendChild(sc);
    });
  }

  // Login form handler with YuvantaraDB Authentication
  var loginForm = document.getElementById('form-login');
  if (loginForm) {
    // Ensure Forgot Password link is present in modal
    var passLabel = loginForm.querySelector('label[for="l-pass"]');
    if (passLabel && !loginForm.querySelector('a[href*="forgot-password"]')) {
      var basePath = window.__yuvantaraBasePath || '';
      var fpLink = document.createElement('a');
      fpLink.href = basePath + 'forgot-password/index.html';
      fpLink.textContent = 'Forgot password?';
      fpLink.style.cssText = 'font-size:.82rem;color:var(--ac);text-decoration:none;float:right;font-weight:normal';
      passLabel.appendChild(fpLink);
    }
    // Optional "Enroll in a course" dropdown on the Login tab (enroll without using the Sign-up form)
    // (No course dropdown on the login form: after login, students without a course see the full program list.)
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var inp = document.getElementById('cap-login-a');
      var q = document.getElementById('cap-login-q');
      if (inp && q && parseInt(inp.value) !== parseInt(q.dataset.ans)) {
        inp.setCustomValidity('Incorrect captcha solution. Please calculate again.');
        inp.reportValidity();
        newCaptcha('cap-login-q');
        inp.value = '';
        return;
      }
      if (inp) inp.setCustomValidity('');

      var email = document.getElementById('l-email').value.trim();
      var pass = document.getElementById('l-pass').value;

      if (window.YuvantaraDB && YuvantaraDB.validateEmail) {
        var emailCheck = YuvantaraDB.validateEmail(email);
        if (!emailCheck.valid) {
          alert(emailCheck.message);
          return;
        }
      }

      if (window.YuvantaraDB) {
        var loginP = YuvantaraDB.loginAsync ? YuvantaraDB.loginAsync(email, pass) : Promise.resolve(YuvantaraDB.login(email, pass));
        loginP.then(function(res) {
          if (res.success) {
            var chosenCourse = window.__yuvantaraPickedCourse || '';
            var basePath = window.__yuvantaraBasePath || '';
            var isAdmin = res.user.role === 'admin' || res.user.role === 'superadmin';
            function goAfterLogin() {
              closeModal();
              if (isAdmin) {
                window.location.href = basePath + 'admin_login_777/index.html';
              } else if (chosenCourse) {
                window.YuvantaraEnroll.enrollNow(chosenCourse);   // login + enroll in one step
              } else {
                window.location.href = basePath + 'portal/index.html';
              }
            }
            if (isAdmin) { goAfterLogin(); return; }   // admin accounts skip the email OTP
            // Students: password was correct, now confirm the email OTP before letting them in
            withOtp('onLogin', res.user.email || email, 'login', res.user.name).then(function (ok) {
              if (ok) { goAfterLogin(); return; }
              try { YuvantaraDB.logout(); } catch (e) {}
              alert('Login cancelled: email verification was not completed.');
              newCaptcha('cap-login-q');
            });
          } else {
            alert('Login failed: ' + (res.message || 'Invalid email or password.'));
            newCaptcha('cap-login-q');
          }
        });
        return;
      } else {
        alert('Welcome back, ' + email + '! Logging in...');
        closeModal();
      }
    });
  }

  // Signup never asks for a course: hide the track dropdown (it is still filled when a program's own "Apply" button opened the form)
  (function hideTrackField() {
    var sp = document.getElementById('s-prog');
    if (!sp) return;
    sp.required = false; sp.removeAttribute('required');
    var g = sp.closest ? sp.closest('.fgroup') : null;
    if (g) g.style.display = 'none';
  })();

  // Signup / Internship Application form handler
  var signupForm = document.getElementById('form-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // Pull the latest cloud accounts first so a duplicate email registered on another device is detected.
      if (!signupForm.__fresh && window.YuvantaraDB && YuvantaraDB.ensureFresh && window.YuvantaraCloudDB && YuvantaraCloudDB.isConfigured()) {
        YuvantaraDB.ensureFresh(60000).then(function() {
          signupForm.__fresh = true;
          try { signupForm.dispatchEvent(new Event('submit', { cancelable: true })); } finally { signupForm.__fresh = false; }
        });
        return;
      }
      var inp = document.getElementById('cap-signup-a');
      var q = document.getElementById('cap-signup-q');
      if (inp && q) {
        var userAns = parseInt(inp.value, 10);
        var expectedAns = parseInt(q.dataset.ans, 10);
        if (isNaN(userAns) || userAns !== expectedAns) {
          alert('Incorrect captcha solution. Please solve: ' + (q.textContent || 'the question'));
          newCaptcha('cap-signup-q');
          inp.value = '';
          inp.focus();
          return;
        }
      }

      var name = document.getElementById('s-name').value.trim();
      var email = document.getElementById('s-email').value.trim();
      var phone = document.getElementById('s-phone').value.trim();
      var dobEl = document.getElementById('s-dob');
      var dob = dobEl ? dobEl.value.trim() : '';
      var pass = document.getElementById('s-pass').value;
      var passConfirmEl = document.getElementById('s-pass-confirm');
      var passConfirm = passConfirmEl ? passConfirmEl.value : '';
      var declEl = document.getElementById('s-declaration');
      var prog = document.getElementById('s-prog') ? document.getElementById('s-prog').value : '';
      var stream = document.getElementById('s-stream') ? document.getElementById('s-stream').value : '';
      var college = document.getElementById('s-college') ? document.getElementById('s-college').value.trim() : '';

      if (!dob) {
        alert('Please select your Date of Birth.');
        if (dobEl) dobEl.focus();
        return;
      }

      if (passConfirmEl && pass !== passConfirm) {
        alert('Passwords do not match. Please ensure both passwords are identical.');
        passConfirmEl.focus();
        return;
      }

      if (declEl && !declEl.checked) {
        alert('Please check the Self-Declaration box to confirm that your details are accurate.');
        declEl.focus();
        return;
      }

      if (window.YuvantaraDB) {
        // Strict anti-fake email verification
        var ev = YuvantaraDB.validateEmail(email);
        if (!ev.valid) {
          alert(ev.message);
          var ee = document.getElementById('s-email'); if (ee) ee.focus();
          return;
        }
        email = ev.email;

        // Strict anti-fake phone verification
        var pv = YuvantaraDB.validatePhone(phone);
        if (!pv.valid) {
          alert(pv.message);
          var pe = document.getElementById('s-phone'); if (pe) pe.focus();
          return;
        }
        phone = pv.phone;

        // Password strength check
        if (!pass || pass.length < 8) {
          alert('Password must be at least 8 characters long.');
          return;
        }
        if (!/[0-9]/.test(pass)) {
          alert('Password must contain at least one number.');
          return;
        }

        // Check for duplicate email in users DB
        if (YuvantaraDB.getUserByEmail(email)) {
          alert('An account with this email already exists. Please log in below' + (prog ? ' — "' + prog + '" is pre-selected, so you can enroll right after logging in.' : '.'));
          var le = document.getElementById('l-email'); if (le) le.value = email;
          openModal('login', prog);
          return;
        }

        // Check if application already submitted (prevent duplicate submissions)
        var existingApps = YuvantaraDB.getApplications();
        var alreadyApplied = existingApps.some(function(a) {
          return a.email && a.email.toLowerCase() === email.toLowerCase() && a.status !== 'rejected';
        });
        if (alreadyApplied) {
          alert('You have already submitted an application with this email (' + email + '). Please log in or contact admissions at yuvantara@yuvantaraventure.com.');
          return;
        }

        // 0. Email OTP: the applicant must prove they own this email before the account is created
        if (signupForm.__otpEmail !== email) {
          withOtp('onSignup', email, 'signup', name).then(function (ok) {
            if (!ok) return;
            signupForm.__otpEmail = email;
            signupForm.dispatchEvent(new Event('submit', { cancelable: true }));
          });
          return;
        }
        signupForm.__otpEmail = '';

        // 1. Submit application to database (sets status to 'pending')
        var appResult = YuvantaraDB.submitApplication({
          name: name,
          email: email,
          phone: phone,
          dob: dob,
          track: prog,
          stream: stream,
          college: college,
          password: pass,
          rejectIfExists: true
        });

        if (!appResult || !appResult.success) {
          alert('Submission Error: ' + (appResult ? appResult.message : 'Could not submit application. Please try again.'));
          return;
        }

        // 2. (Account is created inside submitApplication with the chosen password hashed.)

        // 2b. Sign the new applicant in right away, so they are not asked to log in again on the payment page / portal.
        try { YuvantaraDB.login(email, pass); } catch (e) {}

        // 3. Post to backend server endpoint if online
        try {
          fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify((function(a){ var c = Object.assign({}, a); delete c.passwordHash; return c; })(appResult.app))
          }).catch(function() {});
        } catch(e) {}

        // 4. Store pending registration data for payment checkout (only when a program was chosen)
        var pendingData = prog ? {
          appId: appResult.app.id,
          name: name, email: email, phone: phone, dob: dob,
          track: prog, stream: stream, college: college,
          createdAt: Date.now()
        } : null;
        try { if (pendingData) localStorage.setItem('yuvantara_pending_app', JSON.stringify(pendingData)); else localStorage.removeItem('yuvantara_pending_app'); } catch(e) {}

        // With a program chosen (its own Apply button) go straight to payment; otherwise the student lands in the
        // portal, which shows the list of all internship programs to choose from.
        closeModal();
        var basePath = window.__yuvantaraBasePath || '';
        // Wait until the new account has reached the shared database, THEN leave the page
        // (redirecting immediately used to cancel the upload, so the admin portal never received the user).
        window.YuvantaraEnroll.goAfterCloudPush(basePath + (prog ? 'payment/index.html' : 'portal/index.html'));
        return;

        // 5. Show applicant a clear success message inside the modal WITHOUT destroying the form
        var paneSignup = modal.querySelector('.auth-pane[data-pane="signup"]');
        if (paneSignup && signupForm) {
          signupForm.style.display = 'none';
          var successView = document.getElementById('signup-success-view');
          if (!successView) {
            successView = document.createElement('div');
            successView.id = 'signup-success-view';
            paneSignup.appendChild(successView);
          }
          successView.style.display = 'block';
          successView.innerHTML =
            '<div style="text-align:center;padding:24px 10px">' +
              '<div style="font-size:3rem;margin-bottom:12px">🎉</div>' +
              '<h2 style="color:#16A34A;font-size:1.4rem;margin:0 0 10px">Application Submitted Successfully!</h2>' +
              '<p style="color:#334155;font-size:.95rem;line-height:1.6;margin:0 0 16px">' +
                'Thank you, <strong>' + (name ? name.replace(/</g, '&lt;') : '') + '</strong>! Your enrollment application for <strong>' + (prog ? prog.replace(/</g, '&lt;') : '') + '</strong> has been received.' +
              '</p>' +
              '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:20px;text-align:left;font-size:.88rem">' +
                '<div style="margin-bottom:6px"><strong>Application ID:</strong> <code>' + appResult.app.id + '</code></div>' +
                '<div style="margin-bottom:6px"><strong>Status:</strong> <span style="background:#FEF3C7;color:#D97706;padding:2px 8px;border-radius:4px;font-weight:600">⏳ Pending Admin Approval</span></div>' +
                '<div><strong>Registered Email:</strong> ' + (email ? email.replace(/</g, '&lt;') : '') + '</div>' +
              '</div>' +
              '<p style="color:#64748B;font-size:.85rem;margin-bottom:20px">' +
                'An administrator will review your application. Once approved, your student portal access will be unlocked.' +
              '</p>' +
              '<button type="button" class="btn p" id="btn-app-success-close" style="width:100%;padding:12px">Close &amp; Go to Login</button>' +
            '</div>';

          signupForm.reset();
          newCaptcha('cap-signup-q');

          var closeSuccessBtn = document.getElementById('btn-app-success-close');
          if (closeSuccessBtn) {
            closeSuccessBtn.onclick = function() {
              successView.style.display = 'none';
              signupForm.style.display = 'block';
              closeModal();
              openModal('login');
            };
          }
        } else {
          alert('✅ Application Submitted Successfully!\n\nApplication ID: ' + appResult.app.id + '\nProgram: ' + prog + '\n\nYour application is now pending review by our administration.');
          if (signupForm) signupForm.reset();
          newCaptcha('cap-signup-q');
          closeModal();
        }

      } else {
        alert('Congratulations ' + name + '! Your application for ' + prog + ' has been received.');
        signupForm.reset();
        newCaptcha('cap-signup-q');
        closeModal();
      }
    });
  }

  window.openAuthModal = openModal;
})();

// 5. Certificate Verification Engine
(function() {
  var verifyForm = document.getElementById('verify-cert-form');
  var resultBox = document.getElementById('cert-result-box');
  if (!verifyForm || !resultBox) return;

  var mockCertificates = {
    'YUV-2026-CS101': {
      name: 'Rohan Sen',
      course: 'Cybersecurity & SOC Operations Industrial Internship',
      duration: '6 Months (Jan 2026 – Jun 2026)',
      grade: 'Grade A+ (Distinction)',
      date: 'June 20, 2026',
      status: 'Valid & Authenticated',
      college: 'National Institute of Technology (NIT), Patna',
      council: 'Yuvantara Cyber Defense Council'
    },
    'YUV-2026-AI204': {
      name: 'Priya Sharma',
      course: 'Artificial Intelligence & Machine Learning Specialization',
      duration: '6 Months (Jan 2026 – Jun 2026)',
      grade: 'Grade A+ (Outstanding)',
      date: 'July 05, 2026',
      status: 'Valid & Authenticated',
      college: 'Indian Institute of Technology (IIT), Patna',
      council: 'Yuvantara AI Research Lab'
    },
    'YUV-2026-PY305': {
      name: 'Amit Kumar',
      course: 'Python Full-Stack & Cloud Computing Internship',
      duration: '3 Months (Feb 2026 – May 2026)',
      grade: 'Grade A (Excellent)',
      date: 'May 30, 2026',
      status: 'Valid & Authenticated',
      college: 'Birla Institute of Technology (BIT), Patna',
      council: 'Yuvantara Software Systems Council'
    },
    'YUV-2026-RB412': {
      name: 'Sneha Kumari',
      course: 'Robotics, IoT & Embedded Systems Internship',
      duration: '6 Months (Jan 2026 – Jun 2026)',
      grade: 'Grade A+ (Distinction)',
      date: 'August 12, 2026',
      status: 'Valid & Authenticated',
      college: 'Patna University, Patna, Bihar',
      council: 'Yuvantara Robotics & Automation Wing'
    }
  };

  function displayCertificate(id) {
    id = (id || '').trim().toUpperCase();
    if (!id) return;

    var cert = null;
    var errBox = document.getElementById('cert-error-box');
    var successBox = document.getElementById('cert-success-box');
    var errMsg = document.getElementById('cert-error-msg');

    // First check YuvantaraDB users for dynamically issued/revoked certificates
    if (window.YuvantaraDB) {
      var allRecords = (typeof YuvantaraDB.getMasterDB === 'function' ? YuvantaraDB.getMasterDB() : YuvantaraDB.getStudents()).filter(function(u) { return u && u.role !== 'admin' && u.role !== 'superadmin'; });
      for (var i = 0; i < allRecords.length; i++) {
        var s = allRecords[i];
        var sCertId = (s.certificate && s.certificate.id) ? s.certificate.id : s.certificateNumber;
        if (sCertId && sCertId.toUpperCase() === id) {
          cert = {
            name: s.name,
            dob: s.dob || (s.certificate && s.certificate.dob) || '2002-05-15',
            course: (s.certificate && s.certificate.title) || s.track || 'Industrial Internship Program',
            duration: (s.certificate && s.certificate.duration) || s.duration || '6 Months Industrial Internship',
            grade: (s.certificate && s.certificate.grade) || s.grade || 'Grade A+ (Distinction)',
            date: (s.certificate && (s.certificate.issueDate || s.certificate.date)) || s.issueDate || '2026',
            status: (s.certificate && s.certificate.status) || s.status || 'valid',
            revokedAt: s.certificate ? s.certificate.revokedAt : null,
            college: s.college || 'Affiliated University',
            council: (s.certificate && s.certificate.authority) || s.authority || 'Yuvantara Academic & Skill Council'
          };
          break;
        }
      }
    }

    // Demo certificates are only honoured on local/dev hosts so a live site never
    // reports made-up people as officially verified.
    var isDevHost = !!(window.YUVANTARA_CONFIG && window.YUVANTARA_CONFIG.demoMode) || /^(localhost|127\.0\.0\.1|)$/.test(window.location.hostname || '');
    if (!cert && isDevHost && mockCertificates[id]) {
      cert = mockCertificates[id];
    }

    if (!cert) {
      // Record not found in official registry
      if (errBox) {
        errBox.style.display = 'block';
        if (errMsg) errMsg.textContent = 'No certificate record found matching ID "' + id + '". Please verify the credential code, or use the Download Certificate page if it was issued recently.';
      }
      if (successBox) successBox.style.display = 'none';
      resultBox.classList.add('active');
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // Record found
    if (errBox) errBox.style.display = 'none';
    if (successBox) successBox.style.display = 'block';

    var isRevoked = (cert.status === 'revoked' || cert.status === 'Revoked');
    var badgeEl = document.getElementById('c-badge');
    var statusEl = document.getElementById('c-status');

    if (badgeEl) {
      if (isRevoked) {
        badgeEl.textContent = '⚠️ CERTIFICATE REVOKED';
        badgeEl.style.background = '#FEE2E2';
        badgeEl.style.color = '#DC2626';
        badgeEl.style.borderColor = '#FECACA';
      } else {
        badgeEl.textContent = 'Official Record Verified';
        badgeEl.style.background = '';
        badgeEl.style.color = '';
        badgeEl.style.borderColor = '';
      }
    }

    if (statusEl) {
      if (isRevoked) {
        statusEl.textContent = 'REVOKED & NULLIFIED' + (cert.revokedAt ? ' (' + cert.revokedAt + ')' : '');
        statusEl.style.color = '#DC2626';
      } else {
        statusEl.textContent = cert.status || 'Valid & Authenticated';
        statusEl.style.color = '#16A34A';
      }
    }

    var authorityEl = document.getElementById('c-authority');
    if (authorityEl) authorityEl.textContent = cert.council || 'Yuvantara Academic & Cyber Defense Council';

    document.getElementById('c-id').textContent = id;
    document.getElementById('c-name').textContent = cert.name;
    document.getElementById('c-course').textContent = cert.course;
    document.getElementById('c-duration').textContent = cert.duration;
    document.getElementById('c-grade').textContent = cert.grade;
    document.getElementById('c-date').textContent = cert.date;
    document.getElementById('c-college').textContent = cert.college;
    var accEl = document.getElementById('c-accreditation');
    if (accEl) accEl.textContent = 'ISO 9001:2015 Certified';

    resultBox.classList.add('active');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function displayFresh(id) {
    var fresh = (window.YuvantaraDB && YuvantaraDB.ensureFresh) ? YuvantaraDB.ensureFresh() : Promise.resolve();
    fresh.then(function() { displayCertificate(id); });
  }

  verifyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var inp = document.getElementById('cert-id-input');
    displayFresh(inp.value);
  });

  // Sample pill clicks
  document.querySelectorAll('.sample-pills span').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var id = pill.textContent.trim();
      var inp = document.getElementById('cert-id-input');
      if (inp) inp.value = id;
      displayFresh(id);
    });
  });

  // Print button
  var printBtn = document.getElementById('btn-print-cert');
  if (printBtn) {
    printBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.print();
    });
  }

  // Auto-verify if URL has ?id=... parameter
  var urlParams = new URLSearchParams(window.location.search);
  var qId = urlParams.get('id');
  if (qId) {
    var inp = document.getElementById('cert-id-input');
    if (inp) inp.value = qId;
    displayFresh(qId);
  }
})();

// ── College name suggestions (CollegeDB via our server; the API key never reaches the browser) ──
(function () {
  'use strict';
  var IDS = ['s-college', 'new-stu-college', 'cert-edit-college', 'p-college'];
  var cache = {};

  // Built-in fallback: used when the server/API returns nothing (no key, daily limit, server asleep, offline).
  // Add more colleges here any time: [name, city, state]
  var LOCAL = [
    ['National Institute of Technology (NIT), Patna', 'Patna', 'Bihar'],
    ['Indian Institute of Technology (IIT), Patna', 'Bihta, Patna', 'Bihar'],
    ['Birla Institute of Technology (BIT), Patna', 'Patna', 'Bihar'],
    ['Patna University', 'Patna', 'Bihar'],
    ['Patna Women\'s College', 'Patna', 'Bihar'],
    ['A.N. College, Patna', 'Patna', 'Bihar'],
    ['Patna Science College', 'Patna', 'Bihar'],
    ['Patna College', 'Patna', 'Bihar'],
    ['Magadh University', 'Bodh Gaya', 'Bihar'],
    ['Babasaheb Bhimrao Ambedkar Bihar University', 'Muzaffarpur', 'Bihar'],
    ['Lalit Narayan Mithila University', 'Darbhanga', 'Bihar'],
    ['Tilka Manjhi Bhagalpur University', 'Bhagalpur', 'Bihar'],
    ['Veer Kunwar Singh University', 'Arrah', 'Bihar'],
    ['Aryabhatta Knowledge University', 'Patna', 'Bihar'],
    ['Bihar Engineering University', 'Patna', 'Bihar'],
    ['Muzaffarpur Institute of Technology (MIT)', 'Muzaffarpur', 'Bihar'],
    ['Bhagalpur College of Engineering', 'Bhagalpur', 'Bihar'],
    ['Darbhanga College of Engineering', 'Darbhanga', 'Bihar'],
    ['Gaya College of Engineering', 'Gaya', 'Bihar'],
    ['Nalanda College of Engineering', 'Chandi, Nalanda', 'Bihar'],
    ['Motihari College of Engineering', 'Motihari', 'Bihar'],
    ['Katihar Engineering College', 'Katihar', 'Bihar'],
    ['Sitamarhi Institute of Technology', 'Sitamarhi', 'Bihar'],
    ['Loknayak Jai Prakash Institute of Technology', 'Chapra', 'Bihar'],
    ['Government Engineering College, Vaishali', 'Vaishali', 'Bihar'],
    ['Cambridge Institute of Technology', 'Ranchi', 'Jharkhand'],
    ['Netaji Subhas University of Technology (NSUT)', 'New Delhi', 'Delhi'],
    ['Delhi Technological University (DTU)', 'New Delhi', 'Delhi'],
    ['Indian Institute of Technology (IIT), Delhi', 'New Delhi', 'Delhi'],
    ['Indian Institute of Technology (IIT), Bombay', 'Mumbai', 'Maharashtra'],
    ['Indian Institute of Technology (IIT), Kanpur', 'Kanpur', 'Uttar Pradesh'],
    ['Indian Institute of Technology (IIT), Kharagpur', 'Kharagpur', 'West Bengal'],
    ['Indian Institute of Technology (IIT), Madras', 'Chennai', 'Tamil Nadu'],
    ['Indian Institute of Technology (IIT), Roorkee', 'Roorkee', 'Uttarakhand'],
    ['Indian Institute of Technology (IIT), Guwahati', 'Guwahati', 'Assam'],
    ['Indian Institute of Technology (IIT), (BHU) Varanasi', 'Varanasi', 'Uttar Pradesh'],
    ['Indian Institute of Technology (ISM), Dhanbad', 'Dhanbad', 'Jharkhand'],
    ['National Institute of Technology (NIT), Jamshedpur', 'Jamshedpur', 'Jharkhand'],
    ['National Institute of Technology (NIT), Durgapur', 'Durgapur', 'West Bengal'],
    ['National Institute of Technology (NIT), Rourkela', 'Rourkela', 'Odisha'],
    ['National Institute of Technology (NIT), Trichy', 'Tiruchirappalli', 'Tamil Nadu'],
    ['National Institute of Technology (NIT), Warangal', 'Warangal', 'Telangana'],
    ['National Institute of Technology (NIT), Surathkal', 'Mangaluru', 'Karnataka'],
    ['National Institute of Technology (NIT), Allahabad (MNNIT)', 'Prayagraj', 'Uttar Pradesh'],
    ['National Institute of Technology (NIT), Kurukshetra', 'Kurukshetra', 'Haryana'],
    ['Indian Institute of Information Technology (IIIT), Bhagalpur', 'Bhagalpur', 'Bihar'],
    ['Indian Institute of Information Technology (IIIT), Hyderabad', 'Hyderabad', 'Telangana'],
    ['Indian Institute of Information Technology (IIIT), Allahabad', 'Prayagraj', 'Uttar Pradesh'],
    ['Indian Institute of Information Technology (IIIT), Delhi', 'New Delhi', 'Delhi'],
    ['Birla Institute of Technology and Science (BITS), Pilani', 'Pilani', 'Rajasthan'],
    ['Birla Institute of Technology (BIT), Mesra', 'Ranchi', 'Jharkhand'],
    ['Vellore Institute of Technology (VIT)', 'Vellore', 'Tamil Nadu'],
    ['SRM Institute of Science and Technology', 'Chennai', 'Tamil Nadu'],
    ['Manipal Institute of Technology', 'Manipal', 'Karnataka'],
    ['Amity University', 'Noida', 'Uttar Pradesh'],
    ['Lovely Professional University (LPU)', 'Phagwara', 'Punjab'],
    ['Chandigarh University', 'Mohali', 'Punjab'],
    ['Kalinga Institute of Industrial Technology (KIIT)', 'Bhubaneswar', 'Odisha'],
    ['Symbiosis Institute of Technology', 'Pune', 'Maharashtra'],
    ['College of Engineering, Pune (COEP)', 'Pune', 'Maharashtra'],
    ['Jadavpur University', 'Kolkata', 'West Bengal'],
    ['University of Delhi', 'New Delhi', 'Delhi'],
    ['Jawaharlal Nehru University (JNU)', 'New Delhi', 'Delhi'],
    ['Jamia Millia Islamia', 'New Delhi', 'Delhi'],
    ['Banaras Hindu University (BHU)', 'Varanasi', 'Uttar Pradesh'],
    ['Aligarh Muslim University (AMU)', 'Aligarh', 'Uttar Pradesh'],
    ['Anna University', 'Chennai', 'Tamil Nadu'],
    ['Osmania University', 'Hyderabad', 'Telangana'],
    ['Visvesvaraya Technological University (VTU)', 'Belagavi', 'Karnataka'],
    ['Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)', 'Bhopal', 'Madhya Pradesh'],
    ['Dr. A.P.J. Abdul Kalam Technical University (AKTU)', 'Lucknow', 'Uttar Pradesh'],
    ['Maulana Abul Kalam Azad University of Technology (MAKAUT)', 'Kolkata', 'West Bengal'],
    ['Ranchi University', 'Ranchi', 'Jharkhand'],
    ['Birsa Institute of Technology (BIT), Sindri', 'Dhanbad', 'Jharkhand']
  ];
  function localSearch(q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return LOCAL.slice(0, 8).map(function (c) { return { name: c[0], city: c[1], state: c[2] }; });
    return LOCAL.filter(function (c) {
      var hay = (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).slice(0, 10).map(function (c) { return { name: c[0], city: c[1], state: c[2] }; });
  }

  function apiBase() {
    var c = window.YUVANTARA_CONFIG || {};
    return (c.api && c.api.baseUrl) || '/api';
  }

  // Custom dropdown (works on every phone/desktop browser; replaces the unreliable native <datalist>)
  var styleAdded = false;
  function addStyle() {
    if (styleAdded) return; styleAdded = true;
    var st = document.createElement('style');
    st.textContent =
      '.yuv-sugg{position:absolute;z-index:5000;background:#fff;border:1.5px solid #CBD5E1;border-radius:10px;box-shadow:0 12px 32px rgba(15,23,42,.18);max-height:240px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:none;margin:0;padding:4px;list-style:none}' +
      '.yuv-sugg li{padding:9px 12px;border-radius:8px;cursor:pointer;font-size:.92rem;color:#0F172A;line-height:1.3}' +
      '.yuv-sugg li small{display:block;color:#64748B;font-size:.78rem;margin-top:2px}' +
      '.yuv-sugg li.on,.yuv-sugg li:hover{background:#EFF6FF}' +
      '.yuv-sugg .yuv-hint{cursor:default;color:#64748B;font-size:.8rem}.yuv-sugg .yuv-hint:hover{background:transparent}';
    document.head.appendChild(st);
  }

  function attach(input) {
    if (!input || input.__collegeSuggest) return;
    input.__collegeSuggest = true;
    addStyle();
    input.removeAttribute('list');
    input.setAttribute('autocomplete', 'off');
    if (!input.getAttribute('placeholder') || /^e\.g\./.test(input.getAttribute('placeholder'))) {
      input.setAttribute('placeholder', 'Start typing and pick your college');
    }
    var host = input.parentNode;
    if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var box = document.createElement('ul');
    box.className = 'yuv-sugg';
    box.setAttribute('role', 'listbox');
    host.appendChild(box);

    var timer = null, items = [], active = -1, current = '';

    function hide() { box.style.display = 'none'; active = -1; }
    function place() {
      box.style.left = input.offsetLeft + 'px';
      box.style.top = (input.offsetTop + input.offsetHeight + 3) + 'px';
      box.style.width = input.offsetWidth + 'px';
    }
    function highlight() {
      Array.prototype.forEach.call(box.querySelectorAll('li[data-i]'), function (li) {
        li.className = (+li.getAttribute('data-i') === active) ? 'on' : '';
      });
      var el = box.querySelector('li.on'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    function choose(i) {
      var c = items[i]; if (!c) return;
      input.value = c.name;
      hide();
      try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    function render(results, hint) {
      items = results || [];
      box.innerHTML = '';
      active = -1;
      if (!items.length) {
        if (!hint) { hide(); return; }
        var h = document.createElement('li'); h.className = 'yuv-hint'; h.textContent = hint; box.appendChild(h);
      }
      items.forEach(function (c, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('data-i', i);
        li.textContent = c.name;
        var loc = [c.city, c.state].filter(Boolean).join(', ');
        if (loc) { var sm = document.createElement('small'); sm.textContent = loc; li.appendChild(sm); }
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        box.appendChild(li);
      });
      place();
      box.style.display = 'block';
    }

    function update() {
      var q = input.value.trim().toLowerCase();
      current = q;
      clearTimeout(timer);
      if (q.length < 3) {
        render(localSearch(q), q.length ? 'Keep typing… (or type your college name in full)' : '');
        return;
      }
      if (cache[q]) { render(cache[q]); return; }
      var loc = localSearch(q);
      render(loc, loc.length ? '' : 'Searching…');   // instant results from the built-in list while the server answers
      timer = setTimeout(function () {
        fetch(apiBase() + '/colleges?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (current !== q) return;   // user kept typing
            var res = (d && d.results) || [];
            if (res.length) { cache[q] = res; render(res); }
            else {
              if (d && d.reason && window.console) console.info('College API gave no results:', d.reason);
              render(localSearch(q), 'No match in the list. You can type your college name manually.');
            }
          })
          .catch(function (e) {
            if (current !== q) return;
            if (window.console) console.info('College API unreachable:', e && e.message);
            render(localSearch(q), 'No match in the list. You can type your college name manually.');
          });
      }, 400);
    }

    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('click', function () { if (box.style.display === 'none') update(); });
    input.addEventListener('blur', function () { setTimeout(hide, 200); });
    input.addEventListener('keydown', function (e) {
      if (box.style.display === 'none' || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; highlight(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { hide(); }
    });
  }

  function init() { IDS.forEach(function (id) { attach(document.getElementById(id)); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init, 1500);   // modals injected after load
})();
