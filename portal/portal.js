// Yuvantara Student Portal Controller
(function() {
  'use strict';

  var currentUser = null;

  function initPortal() {
    currentUser = window.YuvantaraDB ? YuvantaraDB.getCurrentUser() : null;

    var studentView = document.getElementById('student-view');
    var loginGate = document.getElementById('login-gate');

    if (!currentUser || currentUser.role !== 'student') {
      if (studentView) studentView.style.display = 'none';
      if (loginGate) loginGate.style.display = 'block';
      bindGateEvents();
      return;
    }

    if (loginGate) loginGate.style.display = 'none';
    if (studentView) studentView.style.display = 'block';

    renderStudentData();
    bindPortalEvents();
  }

  // ── Program picker: shown to a student who has not purchased / been enrolled in any course yet ──
  function hasPurchase(u) {
    var committed = ['pending', 'active', 'completed'];
    return !!u && (u.paymentStatus === 'paid' || !!u.certificateNumber ||
      committed.indexOf(u.accountStatus) !== -1 || committed.indexOf(u.status) !== -1);
  }

  var pickerFilter = { cat: 'all', q: '' };

  function hideProgramPicker() {
    var el = document.getElementById('program-picker');
    if (el) el.remove();
    var sv = document.getElementById('student-view');
    if (sv) sv.style.display = 'block';
  }

  function showProgramPicker() {
    var sv = document.getElementById('student-view');
    if (!sv) return;
    sv.style.display = 'none';
    var programs = window.YUVANTARA_PROGRAMS || [];
    var host = document.getElementById('program-picker');
    if (!host) {
      host = document.createElement('div');
      host.id = 'program-picker';
      sv.parentNode.insertBefore(host, sv);
      if (!document.getElementById('program-picker-style')) {
        var st = document.createElement('style');
        st.id = 'program-picker-style';
        st.textContent =
          '#program-picker{max-width:1100px;margin:0 auto;padding:8px 0 40px}' +
          '#program-picker .pp-head{background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1px solid #DBEAFE;border-radius:16px;padding:24px 26px;margin-bottom:20px}' +
          '#program-picker h2{margin:0 0 6px;color:#0F172A;font-size:1.5rem}' +
          '#program-picker .pp-sub{margin:0;color:#475569;font-size:.95rem;line-height:1.55}' +
          '#program-picker .pp-cont{margin-top:14px;padding:12px 14px;border-radius:10px;background:#fff;border:1px solid #BFDBFE;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;font-size:.9rem;color:#1E3A8A}' +
          '#program-picker .pp-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}' +
          '#program-picker .pp-search{flex:1;min-width:220px;padding:10px 14px;border:1px solid #CBD5E1;border-radius:10px;font-size:.92rem;background:#fff;color:#0F172A}' +
          '#program-picker .pp-chip{padding:7px 14px;border-radius:99px;border:1px solid #CBD5E1;background:#fff;color:#334155;font-size:.82rem;font-weight:600;cursor:pointer}' +
          '#program-picker .pp-chip.on{background:#2563EB;border-color:#2563EB;color:#fff}' +
          '#program-picker .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}' +
          '#program-picker .pp-card{display:flex;flex-direction:column;justify-content:space-between;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:18px;box-shadow:0 1px 3px rgba(15,23,42,.05)}' +
          '#program-picker .pp-card.sel{border-color:#2563EB;box-shadow:0 0 0 2px rgba(37,99,235,.18)}' +
          '#program-picker .pp-tag{display:inline-block;background:#EEF2FF;color:#4338CA;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;margin-bottom:8px}' +
          '#program-picker .pp-card h3{margin:0 0 6px;font-size:1.05rem;color:#0F172A}' +
          '#program-picker .pp-card p{margin:0 0 10px;color:#64748B;font-size:.86rem;line-height:1.5}' +
          '#program-picker .pp-meta{font-size:.8rem;color:#475569;margin-bottom:12px}' +
          '#program-picker .pp-btn{width:100%;padding:10px 14px;border:0;border-radius:10px;background:#2563EB;color:#fff;font-weight:700;font-size:.9rem;cursor:pointer}' +
          '#program-picker .pp-btn:hover{background:#1D4ED8}' +
          '#program-picker .pp-empty{padding:40px;text-align:center;color:#64748B}';
        document.head.appendChild(st);
      }
      host.innerHTML =
        '<div class="pp-head">' +
          '<h2 id="pp-title"></h2>' +
          '<p class="pp-sub">You have not enrolled in an internship program yet. Choose one from the list below and continue to payment (₹236 incl. GST). You can pick a different program any time before you pay.</p>' +
          '<div class="pp-cont" id="pp-cont" style="display:none"></div>' +
        '</div>' +
        '<div class="pp-tools"><input type="search" class="pp-search" id="pp-search" placeholder="🔍 Search programs (e.g. AI, cloud, robotics)…"></div>' +
        '<div class="pp-tools" id="pp-chips"></div>' +
        '<div class="pp-grid" id="pp-grid"></div>';

      host.addEventListener('click', function(e) {
        var chip = e.target.closest('.pp-chip');
        if (chip) { pickerFilter.cat = chip.dataset.cat; drawProgramPicker(); return; }
        var btn = e.target.closest('[data-enroll]');
        if (btn) {
          var course = btn.getAttribute('data-enroll');
          btn.disabled = true; btn.textContent = 'Opening payment…';
          if (window.YuvantaraEnroll) window.YuvantaraEnroll.enrollNow(course);
        }
      });
      host.querySelector('#pp-search').addEventListener('input', function(e) { pickerFilter.q = e.target.value; drawProgramPicker(); });
    }
    drawProgramPicker();
  }

  function drawProgramPicker() {
    var programs = window.YUVANTARA_PROGRAMS || [];
    var title = document.getElementById('pp-title');
    if (title) title.textContent = 'Welcome, ' + ((currentUser && currentUser.name) || 'Student').split(' ')[0] + ' 👋 Choose your internship program';

    var cont = document.getElementById('pp-cont');
    var chosen = currentUser && currentUser.track;
    if (cont) {
      if (chosen) {
        cont.style.display = 'flex';
        cont.innerHTML = '<span>You selected <strong>' + escapeHtml(chosen) + '</strong> but have not paid yet.</span>' +
          '<button type="button" class="pp-btn" style="width:auto;padding:8px 16px" data-enroll="' + escapeAttr(chosen) + '">Continue to payment →</button>';
      } else { cont.style.display = 'none'; }
    }

    var cats = [{ k: 'all', t: 'All Programs (' + programs.length + ')' }];
    var CAT_LABELS = { cyber: 'Cybersecurity & Defense', ai: 'AI & Data Science', cloud: 'Cloud & DevOps', software: 'Software & Web',
                       hardware: 'Hardware, Robotics & VLSI', automation: 'Automation & QA' };
    programs.forEach(function(p) {
      if (!cats.some(function(c) { return c.k === p.cat; })) cats.push({ k: p.cat, t: CAT_LABELS[p.cat] || p.tag });
    });
    var chips = document.getElementById('pp-chips');
    if (chips) chips.innerHTML = cats.map(function(c) {
      return '<button type="button" class="pp-chip' + (pickerFilter.cat === c.k ? ' on' : '') + '" data-cat="' + escapeHtml(c.k) + '">' + escapeHtml(c.t) + '</button>';
    }).join('');

    var q = (pickerFilter.q || '').trim().toLowerCase();
    var list = programs.filter(function(p) {
      if (pickerFilter.cat !== 'all' && p.cat !== pickerFilter.cat) return false;
      return !q || (p.name + ' ' + p.desc + ' ' + p.tag).toLowerCase().indexOf(q) !== -1;
    });
    var grid = document.getElementById('pp-grid');
    if (!grid) return;
    if (!list.length) { grid.innerHTML = '<div class="pp-empty">No programs match your search.</div>'; return; }
    grid.innerHTML = list.map(function(p) {
      var sel = chosen && chosen.toLowerCase() === p.name.toLowerCase();
      return '<div class="pp-card' + (sel ? ' sel' : '') + '">' +
        '<div><span class="pp-tag">' + escapeHtml(p.tag) + '</span><h3>' + escapeHtml(p.name) + '</h3><p>' + escapeHtml(p.desc) + '</p>' +
        '<div class="pp-meta">⏱️ ' + escapeHtml(p.duration) + ' &nbsp;·&nbsp; 📜 Verified Certificate</div></div>' +
        '<button type="button" class="pp-btn" data-enroll="' + escapeAttr(p.name) + '">' + (sel ? 'Continue to payment →' : 'Enroll &amp; Pay ₹236') + '</button>' +
      '</div>';
    }).join('');
  }

  // ── Render Student Data ──
  function renderStudentData() {
    if (!currentUser) return;

    // Always refresh from DB for latest state
    var fresh = YuvantaraDB.getUserByEmail(currentUser.email);
    if (fresh) currentUser = fresh;

    // No course purchased yet -> show the list of all internship programs instead of the dashboard
    if (!hasPurchase(currentUser)) { showProgramPicker(); return; }
    hideProgramPicker();

    // Avatar initials
    var initials = (currentUser.name || 'Student')
      .split(' ').map(function(n) { return n[0]; })
      .slice(0, 2).join('').toUpperCase();

    var stuAvatar = document.getElementById('stu-avatar');
    if (stuAvatar) stuAvatar.textContent = initials || 'ST';

    // Header info
    setText('stu-name', currentUser.name);
    setText('stu-track', currentUser.track || 'Industrial Internship');
    setText('stu-track-pill', (currentUser.track || 'Active Track') + ' • Enrolled');
    setText('stu-college', currentUser.college || 'Engineering Institute');
    setText('stu-email', currentUser.email);
    setText('stu-id', currentUser.id || 'USR-101');

    // ── Account pending activation? ──
    var isPending = currentUser.accountStatus === 'pending' || currentUser.accountStatus === 'pending_payment';
    renderPendingBanner(isPending);

    // Progress — grayed out when pending
    var pct = typeof currentUser.progress === 'number' ? currentUser.progress : 0;
    setText('stu-pct-text', isPending ? 'Activating...' : pct + '%');
    var barFill = document.getElementById('stu-bar-fill');
    if (barFill) barFill.style.width = (isPending ? 0 : pct) + '%';

    // Curriculum action button state
    var actionBox = document.getElementById('box-curriculum-action');
    if (actionBox) {
      if (pct >= 100) {
        if (currentUser.certificate && currentUser.certificate.id && currentUser.certificate.status !== 'revoked') {
          actionBox.innerHTML =
            '<span style="color:#15803D;font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;gap:6px">✅ 100% Milestone Completion Achieved &bull; Official Certificate Minted</span>' +
            '<button type="button" class="btn p" id="btn-view-my-cert" style="font-size:.85rem">🎓 View Your Verified Certificate</button>';
          var btnViewCert = document.getElementById('btn-view-my-cert');
          if (btnViewCert) {
            btnViewCert.addEventListener('click', function() {
              var certTab = document.querySelector('.portal-tab-btn[data-tab="certificate"]');
              if (certTab) certTab.click();
            });
          }
          var btnEditTrigger = document.getElementById('btn-edit-my-cert-trigger');
          if (btnEditTrigger) {
            btnEditTrigger.addEventListener('click', openConfirmCertModal);
          }
        } else {
          actionBox.innerHTML =
            '<span style="color:#15803D;font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;gap:6px">🎉 100% Course Completed!</span>' +
            '<button type="button" class="btn p" id="btn-trigger-cert-modal" style="font-size:.88rem">🎓 Generate Certificate</button>';
          var btnTrigger = document.getElementById('btn-trigger-cert-modal');
          if (btnTrigger) {
            btnTrigger.addEventListener('click', openConfirmCertModal);
          }
        }
      } else {
        actionBox.innerHTML =
          '<button type="button" class="btn p" id="btn-complete-curriculum" style="font-size:.88rem">' +
          '🎓 Complete All Milestones (100%)' +
          '</button>';
        var btnComplete = document.getElementById('btn-complete-curriculum');
        if (btnComplete) {
          btnComplete.addEventListener('click', function() {
            var allDoneModules = [
              { name: 'Module 1: Orientation & Core Foundations', status: 'completed' },
              { name: 'Module 2: Lab Setup & Environment Diagnostics', status: 'completed' },
              { name: 'Module 3: Hands-on Case Studies & Practical Labs', status: 'completed' },
              { name: 'Module 4: Mid-Term Evaluation & Milestone Submission', status: 'completed' },
              { name: 'Module 5: Capstone Project & Certification', status: 'completed' }
            ];
            var res = YuvantaraDB.updateStudent(currentUser.email, {
              progress: 100,
              modules: allDoneModules
            }, 'System Automated Council');
            if (res.success && res.user) {
              currentUser = res.user;
            } else {
              currentUser = YuvantaraDB.getUserByEmail(currentUser.email) || currentUser;
            }
            renderStudentData();
            // Automatically prompt the modal to review and edit name & college!
            openConfirmCertModal();
          });
        }
      }
    }

    renderModulesList(currentUser.modules || [], isPending);
    renderCertificateSection(currentUser, isPending);
    renderDocumentsSection(currentUser);

    // Profile form prefill — track is now a readonly text input (locked)
    setVal('p-name', currentUser.name || '');
    setVal('p-email', currentUser.email || '');
    setVal('p-phone', currentUser.phone || '');
    setVal('p-dob', currentUser.dob || '');
    setVal('p-stream', currentUser.stream || '');
    setVal('p-college', currentUser.college || '');
    setVal('p-track', currentUser.track || 'Cybersecurity & SOC Operations');

    // Show payment info if available
    renderPaymentInfo(currentUser);
  }

  // ── Pending Banner ──
  function renderPendingBanner(isPending) {
    var old = document.getElementById('pending-activation-banner');
    if (old) old.remove();
    if (!isPending) return;

    var banner = document.createElement('div');
    banner.id = 'pending-activation-banner';
    banner.style.cssText = 'background:linear-gradient(135deg,#FFFBEB,#FFF7ED);border:2px solid #F59E0B;border-radius:14px;padding:22px 24px;margin-bottom:24px;display:flex;align-items:flex-start;gap:16px;box-shadow:0 6px 20px rgba(245,158,11,.15)';
    banner.innerHTML =
      '<div style="font-size:2.5rem;flex-shrink:0;line-height:1">⏳</div>' +
      '<div style="flex:1">' +
        '<div style="display:inline-block;background:#FEF3C7;color:#B45309;font-weight:700;font-size:.78rem;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Verification In Progress</div>' +
        '<h3 style="margin:0 0 8px;color:#92400E;font-size:1.2rem">Please wait for 2 hours — Course content will be visible after access grant</h3>' +
        '<p style="margin:0 0 12px;color:#78350F;font-size:.92rem;line-height:1.5">' +
          'Your enrollment and payment (₹236) have been securely logged. An admission authority administrator is currently reviewing your registration to grant official internship access. Please wait up to <strong>2 hours</strong>. Once approved, your complete curriculum, video lectures, and live lab environment will unlock automatically.' +
        '</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
          '<span style="font-size:.8rem;background:#DCFCE7;color:#15803D;border:1px solid #86EFAC;border-radius:99px;padding:3px 10px;font-weight:600">✅ Payment Received (₹236)</span>' +
          '<span style="font-size:.8rem;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:99px;padding:3px 10px;font-weight:600">⏳ Admission Authority: Reviewing (Wait ~2 Hours)</span>' +
          '<span style="font-size:.8rem;background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;border-radius:99px;padding:3px 10px;font-weight:600">🔒 Content: Unlocks on Admin Approval</span>' +
        '</div>' +
        '<button type="button" id="btn-check-approval" style="margin:0 0 12px;padding:8px 16px;border-radius:8px;border:1px solid #F59E0B;background:#fff;color:#92400E;font-weight:700;font-size:.85rem;cursor:pointer">🔄 Check approval status</button>' +
        '<p style="margin:0;font-size:.82rem;color:#92400E">Admissions Helpdesk: <a href="mailto:yuvantara@yuvantaraventure.com" style="color:#1D4ED8;font-weight:600">yuvantara@yuvantaraventure.com</a> · <a href="tel:+919876543210" style="color:#1D4ED8;font-weight:600">+91 98765 43210</a></p>' +
      '</div>';

    var portalNav = document.querySelector('.portal-nav-bar');
    if (portalNav) portalNav.parentNode.insertBefore(banner, portalNav);

    var checkBtn = document.getElementById('btn-check-approval');
    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        checkBtn.disabled = true; checkBtn.textContent = '⏳ Checking…';
        YuvantaraDB.ensureFresh().then(function() { refreshFromDb(); });
      });
    }
  }

  // Re-read the latest record (e.g. after an admin approval arrived from the cloud) and redraw the dashboard.
  function refreshFromDb() {
    if (!currentUser) return;
    var fresh = YuvantaraDB.getUserByEmail(currentUser.email);
    if (!fresh) return;
    currentUser = fresh;
    // keep the stored session in step so a later page load does not start from the old "pending" state
    var sess = YuvantaraDB.getCurrentUser();
    if (sess) { var r = Object.assign({}, fresh); r._sessionExpiry = sess._sessionExpiry; YuvantaraDB.setCurrentUser(r); }
    renderStudentData();
  }

  window.addEventListener('yuvantara_cloud_synced', function() {
    // do not redraw while the student is typing in a form or has a dialog open
    var a = document.activeElement;
    var typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    var modalOpen = document.querySelector('.modal-box.open, .modal.open, .modal.active');
    if (!typing && !modalOpen) refreshFromDb();
  });

  // ── Show payment reference if paid ──
  function renderPaymentInfo(user) {
    var old = document.getElementById('payment-ref-bar');
    if (old) old.remove();
    if (!user.paymentRef) return;

    var bar = document.createElement('div');
    bar.id = 'payment-ref-bar';
    bar.style.cssText = 'background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:.82rem;color:#1E40AF;display:flex;flex-wrap:wrap;gap:12px;align-items:center';
    bar.innerHTML =
      '<span>💳 <strong>Payment Ref:</strong> ' + escapeHtml(user.paymentRef) + '</span>' +
      '<span>📅 <strong>Date:</strong> ' + escapeHtml(user.paidAt || '—') + '</span>' +
      '<span>💰 <strong>Amount:</strong> ₹' + (user.paymentAmount || 236) + '</span>' +
      (user.paymentMethod ? '<span>🏦 <strong>Method:</strong> ' + escapeHtml(user.paymentMethod) + '</span>' : '');

    var portalNav = document.querySelector('.portal-nav-bar');
    if (portalNav) portalNav.parentNode.insertBefore(bar, portalNav.nextSibling);
  }

  // ── Modules List ──
  function renderModulesList(modules, isPending) {
    var container = document.getElementById('stu-module-list');
    if (!container) return;

    if (isPending) {
      container.innerHTML =
        '<div style="text-align:center;padding:40px 24px;color:#92400E;background:#FFFBEB;border-radius:14px;border:2px dashed #FCD34D">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">🔒</div>' +
        '<strong style="display:block;font-size:1.15rem;margin-bottom:8px;color:#92400E">Course Content Locked — Waiting for Admin Access Grant</strong>' +
        '<p style="font-size:.92rem;color:#78350F;max-width:540px;margin:0 auto 16px;line-height:1.6">Please wait for 2 hours. Once the administrator grants your internship access, all course modules, hands-on labs, and learning resources will unlock automatically here.</p>' +
        '<span style="display:inline-block;background:#FEF3C7;color:#B45309;padding:6px 14px;border-radius:8px;font-size:.84rem;font-weight:600;border:1px solid #FDE68A">⏱️ Estimated Unlock Window: Within 2 Hours</span>' +
        '</div>';
      return;
    }

    if (!modules || modules.length === 0) {
      modules = [
        { name: 'Module 1: Orientation & Core Foundations', status: 'pending' },
        { name: 'Module 2: Lab Setup & Environment Diagnostics', status: 'pending' },
        { name: 'Module 3: Hands-on Case Studies & Practical Labs', status: 'pending' },
        { name: 'Module 4: Mid-Term Evaluation & Milestone Submission', status: 'pending' },
        { name: 'Module 5: Capstone Project & Certification', status: 'pending' }
      ];
    }

    var html = '';
    modules.forEach(function(m, idx) {
      var badgeClass = 'badge-wait', badgeLabel = 'Pending', icon = '⏳';
      if (m.status === 'completed') { badgeClass = 'badge-done'; badgeLabel = 'Completed'; icon = '✅'; }
      else if (m.status === 'in-progress') { badgeClass = 'badge-active'; badgeLabel = 'In Progress'; icon = '⚡'; }

      html += '<div class="module-item ' + (m.status || 'pending') + '">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span style="font-size:1.1rem">' + icon + '</span>' +
          '<div>' +
            '<strong style="color:#0F172A;font-size:.95rem">' + escapeHtml(m.name) + '</strong>' +
            '<small style="display:block;color:#64748B">Milestone #' + (idx + 1) + ' of ' + modules.length + '</small>' +
          '</div>' +
        '</div>' +
        '<span class="module-status-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
      '</div>';
    });

    container.innerHTML = html;
  }

  // ── Certificate Section ──
  function renderCertificateSection(user, isPending) {
    var certWrap = document.getElementById('cert-official-wrap');
    var emptyWrap = document.getElementById('cert-empty-wrap');
    var uploadedPreview = document.getElementById('uploaded-cert-preview');

    var cert = user.certificate;

    if (isPending) {
      // Account not yet activated — no cert content yet
      if (certWrap) certWrap.style.display = 'none';
      if (emptyWrap) {
        emptyWrap.style.display = 'block';
        emptyWrap.innerHTML =
          '<div style="font-size:3rem;margin-bottom:12px">⏳</div>' +
          '<h3 style="color:#92400E;margin:0 0 10px">Awaiting Content Activation</h3>' +
          '<p style="color:#374151;max-width:460px;margin:0 auto">Your certificate section will be accessible once your account is activated (within 2–6 hours).</p>';
      }
      if (uploadedPreview) uploadedPreview.style.display = 'none';
      return;
    }

    if (cert && cert.id && cert.status !== 'revoked') {
      // Official cert issued / verified
      if (certWrap) certWrap.style.display = 'block';
      if (emptyWrap) emptyWrap.style.display = 'none';

      setText('cert-c-name', user.name);
      setText('cert-c-college', user.college || 'National Institute of Technology (NIT), Patna');
      setText('cert-c-track', cert.title || user.track || 'Industrial Internship');
      setText('cert-c-duration', cert.duration || '6 Months (Jan 2026 – Jun 2026)');
      setText('cert-c-grade', cert.grade || 'Grade A+ (Distinction)');
      setText('cert-c-id', cert.id);
      setText('cert-c-date', cert.issueDate || cert.date || 'June 20, 2026');
      setText('cert-c-authority', cert.authority || 'Yuvantara Academic & Cyber Defense Council');
      setText('cert-c-status', cert.status || 'Valid & Verified');

      var qrTarget = document.getElementById('cert-qr-box');
      if (qrTarget && window.YuvantaraQR) {
        var verifyUrl = cert.qrCodeUrl || ('https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(cert.id));
        YuvantaraQR.renderTo('cert-qr-box', verifyUrl, 76);
      }
      setText('cert-qr-num', cert.id);

      var verifyLink = document.getElementById('btn-verify-cert-link');
      if (verifyLink) verifyLink.href = '../verify-certificate/index.html?id=' + encodeURIComponent(cert.id);

    } else if (cert && cert.status === 'revoked') {
      // Revoked by admin
      if (certWrap) certWrap.style.display = 'none';
      if (emptyWrap) {
        emptyWrap.style.display = 'block';
        emptyWrap.innerHTML =
          '<div style="font-size:3.5rem;margin-bottom:12px">🚫</div>' +
          '<h3 style="color:#DC2626;margin:0 0 10px">Certificate Revoked</h3>' +
          '<p style="color:#374151;max-width:480px;margin:0 auto 16px">Your official Yuvantara Certificate has been revoked' +
          (cert.revokedAt ? ' on <strong>' + cert.revokedAt + '</strong>' : '') +
          '. Please contact your program coordinator for further details or to appeal.</p>' +
          '<div style="display:inline-flex;align-items:center;gap:8px;background:#FEE2E2;color:#DC2626;border:1.5px solid #FECACA;border-radius:10px;padding:10px 20px;font-weight:600;font-size:.95rem">' +
          '❌ Certificate No Longer Valid</div>' +
          '<div style="margin-top:16px"><a href="mailto:yuvantara@yuvantaraventure.com" style="color:#1D4ED8;font-weight:600;text-decoration:underline">📧 yuvantara@yuvantaraventure.com</a></div>';
      }

    } else {
      // Not yet generated
      if (certWrap) certWrap.style.display = 'none';
      if (emptyWrap) {
        emptyWrap.style.display = 'block';
        if (typeof user.progress === 'number' && user.progress >= 100) {
          emptyWrap.innerHTML =
            '<div style="font-size:3.5rem;margin-bottom:12px">🎉</div>' +
            '<h3 style="color:#0F172A;margin:0 0 10px">100% Course Completed!</h3>' +
            '<p style="color:#475569;max-width:520px;margin:0 auto 20px">Congratulations on completing all milestones! Please click below to review and confirm your official Name and College before generating your verified certificate.</p>' +
            '<button type="button" class="btn p" id="btn-cert-pane-generate" style="font-size:1rem;padding:12px 28px">🎓 Review Details &amp; Generate Certificate</button>';
          var btnGenNow = document.getElementById('btn-cert-pane-generate');
          if (btnGenNow) {
            btnGenNow.addEventListener('click', openConfirmCertModal);
          }
        } else {
          emptyWrap.innerHTML =
            '<div style="font-size:3.5rem;margin-bottom:12px">📜</div>' +
            '<h3 style="color:#0F172A;margin:0 0 10px">Curriculum in Progress</h3>' +
            '<p style="color:#475569;max-width:480px;margin:0 auto 16px">Your official institutional certificate will be available upon 100% curriculum completion.</p>' +
            '<p style="font-size:.88rem;color:#64748B">Current Progress: <strong>' + (user.progress || 0) + '%</strong></p>';
        }
      }
    }

    // Uploaded certificate doc
    if (user.uploadedCertificate) {
      if (uploadedPreview) {
        uploadedPreview.style.display = 'flex';
        setText('uploaded-doc-title', user.uploadedCertificate.name || 'Uploaded_Certificate');
        setText('uploaded-doc-date', 'Uploaded on ' + (user.uploadedCertificate.uploadedAt || 'recently'));
        var viewBtn = document.getElementById('btn-view-uploaded');
        if (viewBtn) {
          viewBtn.href = user.uploadedCertificate.dataUrl || '#';
          viewBtn.setAttribute('download', user.uploadedCertificate.name || 'Yuvantara_Certificate');
        }
      }
    } else {
      if (uploadedPreview) uploadedPreview.style.display = 'none';
    }
  }

  // ── Official Documents Section ──
  function renderDocumentsSection(user) {
    if (!user) return;
    var offRef = (user.offerLetter && user.offerLetter.refNo) || ('YUV/2026/OFF-' + (user.id ? user.id.replace(/\D/g, '') || '101' : '101'));
    setText('doc-ref-offer', offRef);
    setText('doc-status-offer', user.paymentStatus === 'paid' ? 'Issued & Digitally Signed' : 'Pending Payment');

    var invNo = (user.invoice && user.invoice.invoiceNo) || ('YUV-INV-2026-00' + (user.id ? user.id.replace(/\D/g, '') || '101' : '101'));
    setText('doc-ref-invoice', invNo);

    // Invoice is only available once payment is complete
    var invPaid = user.paymentStatus === 'paid';
    setText('doc-badge-invoice', invPaid ? 'Paid & Generated' : 'Payment Pending');
    var invBadge = document.getElementById('doc-badge-invoice');
    if (invBadge) { invBadge.style.background = invPaid ? '' : '#FEF3C7'; invBadge.style.color = invPaid ? '' : '#B45309'; }
    ['btn-view-invoice-action', 'btn-print-invoice-action'].forEach(function(id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.disabled = !invPaid;
      b.style.opacity = invPaid ? '' : '.5';
      b.style.cursor = invPaid ? '' : 'not-allowed';
      b.title = invPaid ? '' : 'Available once payment is completed';
    });

    var cert = user.certificate;
    if ((!cert || !cert.id) && typeof user.progress === 'number' && user.progress >= 100) {
      // Completed but no number yet: allocate a unique one now
      var alloc = YuvantaraDB.ensureCertificateNumber(user.email, 'System Automated Council');
      if (alloc && alloc.user) {
        user = alloc.user;
        currentUser = alloc.user;
        cert = user.certificate;
      }
    }

    if (cert && cert.id && cert.status !== 'revoked') {
      setText('doc-ref-cert', cert.id);
      setText('doc-status-cert', 'Issued & Verified');
    } else if (cert && cert.status === 'revoked') {
      setText('doc-ref-cert', cert.id || '—');
      setText('doc-status-cert', 'Revoked');
    } else {
      setText('doc-ref-cert', 'In Progress');
      setText('doc-status-cert', (user.progress || 0) + '% Completed');
    }
  }

  function openOfferLetterModal(user) {
    if (!user) return;
    var offRef = (user.offerLetter && user.offerLetter.refNo) || ('YUV/2026/OFF-' + (user.id ? user.id.replace(/\D/g, '') || '101' : '101'));
    var issueDate = (user.offerLetter && user.offerLetter.issuedDate) || user.paidAt || 'May 15, 2026';

    setText('ol-ref-num', offRef);
    setText('ol-issue-date', issueDate);
    setText('ol-candidate-name', user.name || 'Candidate');
    setText('ol-salutation-name', user.name ? user.name.split(' ')[0] : 'Candidate');
    setText('ol-candidate-college', user.college || 'Engineering Institute');
    setText('ol-candidate-stream', user.stream || 'B.Tech / B.E');
    setText('ol-candidate-email', user.email || '');
    setText('ol-candidate-phone', user.phone || '');
    setText('ol-track-name', user.track || 'Cybersecurity & SOC Operations');
    setText('ol-reg-ref', user.paymentRef || ('REG-' + (user.id || '101')));

    var olQrTarget = document.getElementById('ol-qr-box');
    if (olQrTarget && window.YuvantaraQR) {
      var verifyUrl = 'https://yuvantaraventure.com/verify-certificate/index.html?ref=' + encodeURIComponent(offRef);
      YuvantaraQR.renderTo('ol-qr-box', verifyUrl, 64);
    }
    setText('ol-qr-ref', offRef);

    var modal = document.getElementById('modal-offer-letter');
    var overlay = document.getElementById('auth-overlay');
    if (modal) {
      modal.classList.add('open', 'active');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (overlay) {
      overlay.classList.add('open', 'active');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function openInvoiceModal(user) {
    if (!user) return;
    if (user.paymentStatus !== 'paid') { alert('Your tax invoice will be available once payment is completed.'); return; }
    var invNo = (user.invoice && user.invoice.invoiceNo) || ('YUV-INV-2026-00' + (user.id ? user.id.replace(/\D/g, '') || '101' : '101'));
    var invDate = (user.invoice && user.invoice.date) || user.paidAt || 'May 15, 2026';

    setText('inv-modal-no', invNo);
    setText('inv-modal-date', invDate);
    setText('inv-modal-mode', user.paymentMethod || 'Online UPI / NetBanking');
    setText('inv-modal-tx', user.paymentRef || ('PAY-' + (user.id ? user.id.replace(/\D/g, '') : '882194')));
    setText('inv-modal-name', user.name || 'Student');
    setText('inv-modal-email', user.email || '');
    setText('inv-modal-phone', user.phone || '');
    setText('inv-modal-track', user.track || 'Cybersecurity & SOC Operations');

    var modal = document.getElementById('modal-invoice');
    var overlay = document.getElementById('auth-overlay');
    if (modal) {
      modal.classList.add('open', 'active');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (overlay) {
      overlay.classList.add('open', 'active');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function openConfirmCertModal() {
    if (!currentUser) return;
    var nameInput = document.getElementById('cert-edit-name');
    var collegeInput = document.getElementById('cert-edit-college');
    if (nameInput) nameInput.value = currentUser.name || '';
    if (collegeInput) collegeInput.value = currentUser.college || 'National Institute of Technology (NIT), Patna';

    var modal = document.getElementById('modal-confirm-cert');
    var overlay = document.getElementById('auth-overlay');
    if (modal) {
      modal.classList.add('open', 'active');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (overlay) {
      overlay.classList.add('open', 'active');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (nameInput) nameInput.focus();
  }

  function closeAllModals() {
    ['modal-offer-letter', 'modal-invoice', 'modal-confirm-cert'].forEach(function(id) {
      var m = document.getElementById(id);
      if (m) {
        m.classList.remove('open', 'active');
        m.setAttribute('aria-hidden', 'true');
      }
    });
    var overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.classList.remove('open', 'active');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function printElement(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var printWin = window.open('', '_blank', 'width=880,height=800');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.open();
    printWin.document.write('<!doctype html><html><head><base href="' + document.baseURI + '"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&family=Herr+Von+Muellerhoff&display=swap"><title>Print Document | Yuvantara Venture</title>' +
      '<style>' +
      '@page { margin: 15mm; size: A4; }' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; line-height: 1.5; background: #fff; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      '.cert-seal { width: 78px; height: 78px; border-radius: 50%; border: 2px dashed #94A3B8; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; color: #475569; font-weight: 700; margin: 0 auto; }' +
      '</style>' +
      '</head><body>' + el.innerHTML + '</body></html>');
    printWin.document.close();
    printWin.focus();
    // wait for the logo images and the signature fonts before opening the print dialog
    var waited = 0;
    (function waitThenPrint() {
      var imgs = printWin.document.images, ready = true;
      for (var i = 0; i < imgs.length; i++) { if (!imgs[i].complete) { ready = false; break; } }
      var fontsOk = !printWin.document.fonts || printWin.document.fonts.status === 'loaded';
      waited += 200;
      if ((ready && fontsOk && waited >= 800) || waited >= 4000) {
        printWin.print();
        printWin.close();
      } else {
        setTimeout(waitThenPrint, 200);
      }
    })();
  }

  // ── Portal Tab Switching Engine ──
  function switchPortalTab(target) {
    if (!target) return;
    var tabs = document.querySelectorAll('.portal-tab-btn[data-tab]');
    tabs.forEach(function(b) {
      if (b.dataset.tab === target) b.classList.add('active');
      else b.classList.remove('active');
    });
    document.querySelectorAll('.portal-pane').forEach(function(pane) {
      if (pane.id === 'pane-' + target) pane.classList.add('active');
      else pane.classList.remove('active');
    });
    // Sync student header links
    document.querySelectorAll('[data-student-tab]').forEach(function(l) {
      if (l.getAttribute('data-student-tab') === target) l.classList.add('active');
      else l.classList.remove('active');
    });
  }
  window.switchPortalTab = switchPortalTab;

  // ── Portal Tab Events ──
  function bindPortalEvents() {
    var tabs = document.querySelectorAll('.portal-tab-btn[data-tab]');
    tabs.forEach(function(tabBtn) {
      tabBtn.addEventListener('click', function() {
        switchPortalTab(tabBtn.dataset.tab);
      });
    });

    // Auto-activate tab from URL parameter (?tab=...) or hash (#...)
    var urlParams = new URLSearchParams(window.location.search);
    var initTab = urlParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : '');
    if (initTab) {
      setTimeout(function() { switchPortalTab(initTab); }, 60);
    }

    // ── HR Policy Accordion Events ──
    var policyHeaders = document.querySelectorAll('.policy-accordion-header');
    policyHeaders.forEach(function(header) {
      header.addEventListener('click', function() {
        var item = header.closest('.policy-accordion-item');
        if (!item) return;
        var isOpen = item.classList.contains('open');
        var plusIcon = item.querySelector('.policy-plus-icon');
        var toggleText = item.querySelector('.policy-toggle-text');

        if (isOpen) {
          item.classList.remove('open');
          header.setAttribute('aria-expanded', 'false');
          if (plusIcon) plusIcon.textContent = '+';
          if (toggleText) toggleText.textContent = 'Read Policy';
        } else {
          item.classList.add('open');
          header.setAttribute('aria-expanded', 'true');
          if (plusIcon) plusIcon.textContent = '−';
          if (toggleText) toggleText.textContent = 'Collapse';
        }
      });
    });

    var btnExpandAll = document.getElementById('btn-policy-expand-all');
    if (btnExpandAll) {
      btnExpandAll.addEventListener('click', function() {
        document.querySelectorAll('.policy-accordion-item').forEach(function(item) {
          item.classList.add('open');
          var h = item.querySelector('.policy-accordion-header');
          if (h) h.setAttribute('aria-expanded', 'true');
          var icon = item.querySelector('.policy-plus-icon');
          if (icon) icon.textContent = '−';
          var text = item.querySelector('.policy-toggle-text');
          if (text) text.textContent = 'Collapse';
        });
      });
    }

    var btnCollapseAll = document.getElementById('btn-policy-collapse-all');
    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', function() {
        document.querySelectorAll('.policy-accordion-item').forEach(function(item) {
          item.classList.remove('open');
          var h = item.querySelector('.policy-accordion-header');
          if (h) h.setAttribute('aria-expanded', 'false');
          var icon = item.querySelector('.policy-plus-icon');
          if (icon) icon.textContent = '+';
          var text = item.querySelector('.policy-toggle-text');
          if (text) text.textContent = 'Read Policy';
        });
      });
    }

    // Document & Modal Events
    var btnViewOffer = document.getElementById('btn-view-offer-letter');
    if (btnViewOffer) btnViewOffer.addEventListener('click', function() { openOfferLetterModal(currentUser); });

    ['btn-print-offer-letter', 'btn-print-offer-modal'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function() { printElement('printable-offer-letter'); });
    });

    var btnCloseOffer = document.getElementById('close-offer-modal');
    if (btnCloseOffer) btnCloseOffer.addEventListener('click', closeAllModals);

    var btnViewInvoice = document.getElementById('btn-view-invoice-action');
    if (btnViewInvoice) btnViewInvoice.addEventListener('click', function() { openInvoiceModal(currentUser); });

    ['btn-print-invoice-action', 'btn-print-invoice-modal'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function() {
        if (!currentUser || currentUser.paymentStatus !== 'paid') { alert('Your tax invoice will be available once payment is completed.'); return; }
        printElement('printable-invoice');
      });
    });

    var btnCloseInvoice = document.getElementById('close-invoice-modal');
    if (btnCloseInvoice) btnCloseInvoice.addEventListener('click', closeAllModals);

    var overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.addEventListener('click', closeAllModals);

    var btnNavToCert = document.getElementById('btn-nav-to-cert');
    if (btnNavToCert) {
      btnNavToCert.addEventListener('click', function() {
        var certTab = document.querySelector('.portal-tab-btn[data-tab="certificate"]');
        if (certTab) certTab.click();
      });
    }

    var btnQuickPrintCert = document.getElementById('btn-quick-print-cert');
    if (btnQuickPrintCert) {
      btnQuickPrintCert.addEventListener('click', function() {
        var certTab = document.querySelector('.portal-tab-btn[data-tab="certificate"]');
        if (certTab) certTab.click();
        setTimeout(function() { window.print(); }, 200);
      });
    }

    // Modal Certificate Edit & Minting Events
    var btnEditCert = document.getElementById('btn-edit-cert-details');
    if (btnEditCert) btnEditCert.addEventListener('click', openConfirmCertModal);

    var btnCloseCertModal = document.getElementById('close-confirm-cert-modal');
    if (btnCloseCertModal) btnCloseCertModal.addEventListener('click', closeAllModals);

    var btnCancelCertModal = document.getElementById('btn-cancel-cert-edit');
    if (btnCancelCertModal) btnCancelCertModal.addEventListener('click', closeAllModals);

    var formConfirmCert = document.getElementById('form-confirm-cert');
    if (formConfirmCert) {
      formConfirmCert.addEventListener('submit', function(e) {
        e.preventDefault();
        var newName = (currentUser.name || '').trim();   // locked: never read from the form
        var newCollege = (document.getElementById('cert-edit-college').value || '').trim();
        if (!newName) {
          alert('Please enter your full name for the certificate.');
          return;
        }
        if (!newCollege) {
          alert('Please enter your college or university name.');
          return;
        }

        var res = YuvantaraDB.generateCertificateForStudent(currentUser.email, newName, newCollege);
        if (res.success && res.user) {
          currentUser = res.user;
        } else {
          currentUser = YuvantaraDB.getUserByEmail(currentUser.email) || currentUser;
        }
        closeAllModals();
        renderStudentData();

        var certTab = document.querySelector('.portal-tab-btn[data-tab="certificate"]');
        if (certTab) certTab.click();
        alert('🎉 Official certificate minted successfully with verified candidate details!');
      });
    }

    var btnProfileToBlogs = document.getElementById('btn-profile-to-blogs');
    if (btnProfileToBlogs) {
      btnProfileToBlogs.addEventListener('click', function() {
        var blogTab = document.querySelector('.portal-tab-btn[data-tab="blogs"]');
        if (blogTab) blogTab.click();
      });
    }

    // Logout
    ['btn-portal-logout', 'btn-quick-logout'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function() {
        if (confirm('Are you sure you want to sign out of your Student Portal?')) {
          YuvantaraDB.logout();
          window.location.reload();
        }
      });
    });

    // Print certificate
    ['btn-print-certificate', 'btn-print-certificate-2'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function() { window.print(); });
    });

    // Certificate file upload
    var fileInput = document.getElementById('cert-file-input');
    var browseBtn = document.getElementById('btn-browse-file');
    var selectedName = document.getElementById('selected-filename');
    var uploadAlert = document.getElementById('upload-alert');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', function() { fileInput.click(); });
      fileInput.addEventListener('change', function() {
        if (!fileInput.files || !fileInput.files.length) return;
        var file = fileInput.files[0];
        if (selectedName) selectedName.textContent = file.name;

        var reader = new FileReader();
        reader.onload = function(e) {
          var uploadedDoc = {
            name: file.name,
            uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            dataUrl: e.target.result
          };
          YuvantaraDB.updateStudent(currentUser.email, { uploadedCertificate: uploadedDoc });
          if (uploadAlert) {
            uploadAlert.className = 'alert-box success';
            uploadAlert.textContent = 'Certificate "' + file.name + '" uploaded successfully!';
            uploadAlert.style.display = 'block';
          }
          renderStudentData();
        };
        reader.readAsDataURL(file);
      });
    }

    var removeUploadedBtn = document.getElementById('btn-remove-uploaded');
    if (removeUploadedBtn) {
      removeUploadedBtn.addEventListener('click', function() {
        if (confirm('Remove your uploaded certificate document?')) {
          YuvantaraDB.updateStudent(currentUser.email, { uploadedCertificate: null });
          if (uploadAlert) {
            uploadAlert.className = 'alert-box success';
            uploadAlert.textContent = 'Uploaded certificate removed.';
            uploadAlert.style.display = 'block';
          }
          if (selectedName) selectedName.textContent = '';
          renderStudentData();
        }
      });
    }

    // Edit Profile — track is locked, do NOT include it in updates
    var formProfile = document.getElementById('form-profile');
    var profileAlert = document.getElementById('profile-alert');
    if (formProfile) {
      formProfile.addEventListener('submit', function(e) {
        e.preventDefault();
        // track field is readonly — never send it as an update
        var updates = {
          phone: document.getElementById('p-phone').value.trim(),
          stream: document.getElementById('p-stream').value.trim(),
          college: document.getElementById('p-college').value.trim()
          // track: intentionally excluded — locked at enrollment
        };

        var res = YuvantaraDB.updateStudent(currentUser.email, updates);
        if (res.success) {
          if (profileAlert) {
            profileAlert.className = 'alert-box success';
            profileAlert.textContent = 'Profile information saved successfully.';
            profileAlert.style.display = 'block';
          }
          renderStudentData();
        } else {
          if (profileAlert) {
            profileAlert.className = 'alert-box error';
            profileAlert.textContent = res.message || 'Error updating profile.';
            profileAlert.style.display = 'block';
          }
        }
      });
    }

    // Change Password
    var formPassword = document.getElementById('form-password');
    var passAlert = document.getElementById('pass-alert');
    if (formPassword) {
      formPassword.addEventListener('submit', function(e) {
        e.preventDefault();
        var cur = document.getElementById('pwd-current').value;
        var pnew = document.getElementById('pwd-new').value;
        var pconf = document.getElementById('pwd-confirm').value;

        if (pnew.length < 8) {
          if (passAlert) { passAlert.className = 'alert-box error'; passAlert.textContent = 'New password must be at least 8 characters.'; passAlert.style.display = 'block'; }
          return;
        }
        if (pnew !== pconf) {
          if (passAlert) { passAlert.className = 'alert-box error'; passAlert.textContent = 'New password and confirmation do not match.'; passAlert.style.display = 'block'; }
          return;
        }

        var res = YuvantaraDB.changePassword(currentUser.email, cur, pnew);
        if (res.success) {
          if (passAlert) { passAlert.className = 'alert-box success'; passAlert.textContent = 'Password updated successfully!'; passAlert.style.display = 'block'; }
          formPassword.reset();
        } else {
          if (passAlert) { passAlert.className = 'alert-box error'; passAlert.textContent = res.message || 'Error updating password.'; passAlert.style.display = 'block'; }
        }
      });
    }
  }

  // ── Gate Login Events ──
  function bindGateEvents() {
    var form = document.getElementById('gate-login-form');
    var alertBox = document.getElementById('gate-alert');

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('gate-email').value;
        var pass = document.getElementById('gate-pass').value;
        var gateCourse = (document.getElementById('gate-prog') || {}).value || '';

        YuvantaraDB.loginAsync(email, pass).then(function(res) {
          if (res.success) {
            if (res.user.role === 'admin' || res.user.role === 'superadmin') {
              window.location.href = '../admin_login_777/index.html';
            } else if (gateCourse && window.YuvantaraEnroll) {
              window.YuvantaraEnroll.enrollNow(gateCourse);   // login + enroll in one step
            } else {
              initPortal();
            }
          } else {
            if (alertBox) {
              alertBox.className = 'alert-box error';
              alertBox.textContent = res.message || 'Invalid email or password.';
              alertBox.style.display = 'block';
            }
          }
        });
      });
    }
  }

  // ── Helpers ──
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text || ''; }
  function setVal(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }
  function escapeHtml(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function escapeAttr(str) { return escapeHtml(str).replace(/"/g, '&quot;'); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortal);
  } else {
    initPortal();
  }
})();
