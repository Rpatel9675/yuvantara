// Yuvantara Shared Header Component
// Ensures identical links, active states, dropdowns, and responsive navigation across all pages
(function() {
  'use strict';

  function initSharedHeader() {
    // 1. Determine site root relative path
    var siteRoot = '';
    var linkTag = document.querySelector('link[href*="style.css"]');
    if (linkTag) {
      var href = linkTag.getAttribute('href') || '';
      var m = href.match(/^(\.\.\/)+/);
      if (m) siteRoot = m[0];
    } else {
      var path = window.location.pathname.replace(/\/$/, '');
      var depth = (path.match(/\//g) || []).length;
      if (depth > 1) {
        siteRoot = '../'.repeat(depth - 1);
      }
    }
    window.__yuvantaraBasePath = siteRoot;

    // 2. Identify active section based on current URL
    var curPath = window.location.pathname.toLowerCase();
    var isInternships = curPath.indexOf('/internships') !== -1;
    var isSolutions = curPath.indexOf('/cybersecurity-solutions') !== -1 ||
                      curPath.indexOf('/it-infrastructure-solutions') !== -1 ||
                      curPath.indexOf('/managed-services') !== -1 ||
                      curPath.indexOf('/industries') !== -1;
    var isResources = curPath.indexOf('/blog') !== -1 ||
                      curPath.indexOf('/case-studies') !== -1 ||
                      curPath.indexOf('/verify-certificate') !== -1 ||
                      curPath.indexOf('/use-cases') !== -1 ||
                      curPath.indexOf('/resources') !== -1;
    var isAbout = curPath.indexOf('/about') !== -1 || curPath.indexOf('/careers') !== -1;
    var isSupport = curPath.indexOf('/support') !== -1;

    // 3. Check logged-in user
    var currentUser = null;
    try {
      if (window.YuvantaraDB && typeof YuvantaraDB.getCurrentUser === 'function') {
        currentUser = YuvantaraDB.getCurrentUser();
      } else {
        var rawUser = localStorage.getItem('yuvantara_session_user');
        if (rawUser) currentUser = JSON.parse(rawUser);
      }
    } catch(e) {}

    var headerHtml = '';

    // ── CASE 1: LOGGED IN STUDENT ──
    // Desktop: Clean corporate navigation + My Portal button + Logout (no 7 items in top bar)
    // Small Devices (Mobile): The 7 Student Options are available inside the mobile menu drawer
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      var activeTab = 'progress';
      if (curPath.indexOf('/portal/') !== -1) {
        var params = new URLSearchParams(window.location.search);
        activeTab = params.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : 'progress');
      }

      var firstName = (currentUser.name || 'Student').split(' ')[0];

      headerHtml =
        '<div class="w bar">' +
          '<a class="logo" href="' + siteRoot + 'index.html" aria-label="Yuvantara Venture home"><img class="logo-img" src="' + siteRoot + 'assets/images/logo-mark-light.png" alt="" width="32" height="44"><span class="logo-text">Yuvantara<small>Venture</small></span></a>' +
          '<button class="burger" aria-label="Toggle navigation menu" aria-expanded="false">Menu</button>' +
          '<nav class="nav" role="navigation" aria-label="Main Navigation">' +
            '<a href="' + siteRoot + 'internships/index.html"' + (isInternships ? ' class="active"' : '') + '>Internships</a>' +
            '<details class="dd mg' + (isSolutions ? ' active' : '') + '">' +
              '<summary>Solutions</summary>' +
              '<div class="menu mega">' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'cybersecurity-solutions/index.html">Cybersecurity Solutions</a></h4>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/endpoint-security/index.html">Endpoint Security<small>EDR, antivirus &amp; device hardening</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/network-security/index.html">Network Security<small>Firewalls, IPS &amp; segmentation</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/siem/index.html">SIEM<small>Log collection &amp; correlation</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/email-security/index.html">Email Security<small>Phishing &amp; malware defence</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/vulnerability-management/index.html">Vulnerability Management<small>Scanning &amp; patch priority</small></a>' +
                '</div>' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'it-infrastructure-solutions/index.html">IT Infrastructure Solutions</a></h4>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/unified-endpoint-management/index.html">Unified Endpoint Management<small>Control &amp; deploy devices</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/cloud-infrastructure-hosting/index.html">Cloud Infrastructure<small>Cloud hosting &amp; migration</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/enterprise-networking/index.html">Enterprise Networking<small>Switching &amp; SD-WAN</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/backup-disaster-recovery/index.html">Backup &amp; Recovery<small>Immutable reliable backup</small></a>' +
                '</div>' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'managed-services/index.html">Managed Services</a></h4>' +
                  '<a href="' + siteRoot + 'managed-services/managed-it-services/index.html">Managed IT Services<small>Service desk &amp; support</small></a>' +
                  '<a href="' + siteRoot + 'managed-services/managed-cybersecurity/index.html">Managed Cybersecurity<small>Round-the-clock SOC defense</small></a>' +
                  '<a href="' + siteRoot + 'managed-services/soc-implementation/index.html">SOC Implementation<small>Build your own SOC</small></a>' +
                '</div>' +
              '</div>' +
            '</details>' +
            '<details class="dd' + (isResources ? ' active' : '') + '">' +
              '<summary>Resources</summary>' +
              '<div class="menu">' +
                '<a href="' + siteRoot + 'blog/index.html">Blog<small>Technical guides &amp; blueprints</small></a>' +
                '<a href="' + siteRoot + 'case-studies/index.html">Case Studies<small>Real engagements</small></a>' +
                '<a href="' + siteRoot + 'verify-certificate/index.html">Verify Certificate<small>Instant credential authentication</small></a>' +
                '<a href="' + siteRoot + 'use-cases/index.html">Use Cases<small>Problems we solve</small></a>' +
                '<a href="' + siteRoot + 'resources/downloads/index.html">Downloads<small>Brochures &amp; datasheets</small></a>' +
              '</div>' +
            '</details>' +
            '<details class="dd' + (isAbout ? ' active' : '') + '">' +
              '<summary>About</summary>' +
              '<div class="menu">' +
                '<a href="' + siteRoot + 'about/index.html">Our Company<small>Who we are &amp; leadership</small></a>' +
                '<a href="' + siteRoot + 'about/certifications/index.html">Certifications<small>ISO 9001 standard</small></a>' +
                '<a href="' + siteRoot + 'careers/index.html">Careers<small>Join our engineering team</small></a>' +
              '</div>' +
            '</details>' +
            '<a href="' + siteRoot + 'support/index.html"' + (isSupport ? ' class="active"' : '') + '>Support</a>' +
            '<a class="btn" style="margin:0 0 0 6px;padding:9px 16px;background:#1E40AF;color:#fff;border-color:#2563EB" href="' + siteRoot + 'portal/index.html">🎓 My Portal (' + escapeHtml(firstName) + ')</a>' +
            '<button type="button" class="btn btn-header-logout" style="margin:0 0 0 4px;padding:9px 14px;background:#334155;color:#fff;border-color:#475569;cursor:pointer">Logout</button>' +

            // ── THE 7 STUDENT PORTAL OPTIONS (PRESENT IN SMALL DEVICES / MOBILE MENU) ──
            '<div class="student-mobile-menu" aria-label="Student Mobile Navigation">' +
              '<div style="font-size:.78rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em;padding:12px 14px 6px">Student Portal Navigation</div>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=progress" class="student-nav-item' + (activeTab === 'progress' ? ' active' : '') + '" data-student-tab="progress"><span>📊</span> Internship Progress</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=documents" class="student-nav-item' + (activeTab === 'documents' ? ' active' : '') + '" data-student-tab="documents"><span>📄</span> Official Documents</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=policy" class="student-nav-item' + (activeTab === 'policy' ? ' active' : '') + '" data-student-tab="policy"><span>📜</span> Company Policy</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=certificate" class="student-nav-item' + (activeTab === 'certificate' ? ' active' : '') + '" data-student-tab="certificate"><span>🎓</span> Certificate (Download &amp; Upload)</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=blogs" class="student-nav-item' + (activeTab === 'blogs' ? ' active' : '') + '" data-student-tab="blogs"><span>📰</span> Company &amp; Internship Blogs</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=profile" class="student-nav-item' + (activeTab === 'profile' ? ' active' : '') + '" data-student-tab="profile"><span>👤</span> Edit Profile</a>' +
              '<a href="' + siteRoot + 'portal/index.html?tab=password" class="student-nav-item' + (activeTab === 'password' ? ' active' : '') + '" data-student-tab="password"><span>🔒</span> Password Modification</a>' +
            '</div>' +
          '</nav>' +
        '</div>';

    // ── CASE 2: LOGGED IN ADMIN ──
    } else if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) {
      headerHtml =
        '<div class="w bar">' +
          '<a class="logo" href="' + siteRoot + 'index.html" aria-label="Yuvantara Venture home"><img class="logo-img" src="' + siteRoot + 'assets/images/logo-mark-light.png" alt="" width="32" height="44"><span class="logo-text">Yuvantara<small>Venture</small></span></a>' +
          '<button class="burger" aria-label="Toggle navigation menu" aria-expanded="false">Menu</button>' +
          '<nav class="nav" role="navigation" aria-label="Admin Navigation">' +
            '<a href="' + siteRoot + 'admin_login_777/index.html" class="student-nav-item active"><span>👑</span> Admin Console</a>' +
            '<a href="' + siteRoot + 'admin_login_777/index.html#replicas" class="student-nav-item"><span>🛡️</span> 7 Database Replicas</a>' +
            '<a href="' + siteRoot + 'admin_login_777/index.html#audit" class="student-nav-item"><span>📋</span> Audit Logs</a>' +
            '<a href="' + siteRoot + 'verify-certificate/index.html" class="student-nav-item"><span>🎓</span> Verify Certificate</a>' +
            '<button type="button" class="btn btn-header-logout" style="margin:0 0 0 6px;padding:7px 14px;background:#DC2626;color:#fff;border-color:#DC2626;cursor:pointer;font-size:.85rem;font-weight:600;border-radius:8px">Logout</button>' +
          '</nav>' +
        '</div>';

    // ── CASE 3: PUBLIC / GUEST VISITOR ──
    } else {
      headerHtml =
        '<div class="w bar">' +
          '<a class="logo" href="' + siteRoot + 'index.html" aria-label="Yuvantara Venture home"><img class="logo-img" src="' + siteRoot + 'assets/images/logo-mark-light.png" alt="" width="32" height="44"><span class="logo-text">Yuvantara<small>Venture</small></span></a>' +
          '<button class="burger" aria-label="Toggle navigation menu" aria-expanded="false">Menu</button>' +
          '<nav class="nav" role="navigation" aria-label="Main Navigation">' +
            '<a href="' + siteRoot + 'internships/index.html"' + (isInternships ? ' class="active"' : '') + '>Internships</a>' +
            '<details class="dd mg' + (isSolutions ? ' active' : '') + '">' +
              '<summary>Solutions</summary>' +
              '<div class="menu mega">' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'cybersecurity-solutions/index.html">Cybersecurity Solutions</a></h4>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/endpoint-security/index.html">Endpoint Security<small>EDR, antivirus &amp; device hardening</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/network-security/index.html">Network Security<small>Firewalls, IPS &amp; segmentation</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/siem/index.html">SIEM<small>Log collection &amp; correlation</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/email-security/index.html">Email Security<small>Phishing &amp; malware defence</small></a>' +
                  '<a href="' + siteRoot + 'cybersecurity-solutions/vulnerability-management/index.html">Vulnerability Management<small>Scanning &amp; patch priority</small></a>' +
                '</div>' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'it-infrastructure-solutions/index.html">IT Infrastructure Solutions</a></h4>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/unified-endpoint-management/index.html">Unified Endpoint Management<small>Control &amp; deploy devices</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/cloud-infrastructure-hosting/index.html">Cloud Infrastructure<small>Cloud hosting &amp; migration</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/enterprise-networking/index.html">Enterprise Networking<small>Switching &amp; SD-WAN</small></a>' +
                  '<a href="' + siteRoot + 'it-infrastructure-solutions/backup-disaster-recovery/index.html">Backup &amp; Recovery<small>Immutable reliable backup</small></a>' +
                '</div>' +
                '<div>' +
                  '<h4><a href="' + siteRoot + 'managed-services/index.html">Managed Services</a></h4>' +
                  '<a href="' + siteRoot + 'managed-services/managed-it-services/index.html">Managed IT Services<small>Service desk &amp; support</small></a>' +
                  '<a href="' + siteRoot + 'managed-services/managed-cybersecurity/index.html">Managed Cybersecurity<small>Round-the-clock SOC defense</small></a>' +
                  '<a href="' + siteRoot + 'managed-services/soc-implementation/index.html">SOC Implementation<small>Build your own SOC</small></a>' +
                '</div>' +
              '</div>' +
            '</details>' +
            '<details class="dd' + (isResources ? ' active' : '') + '">' +
              '<summary>Resources</summary>' +
              '<div class="menu">' +
                '<a href="' + siteRoot + 'blog/index.html">Blog<small>Technical guides &amp; blueprints</small></a>' +
                '<a href="' + siteRoot + 'case-studies/index.html">Case Studies<small>Real engagements</small></a>' +
                '<a href="' + siteRoot + 'verify-certificate/index.html">Verify Certificate<small>Instant credential authentication</small></a>' +
                '<a href="' + siteRoot + 'use-cases/index.html">Use Cases<small>Problems we solve</small></a>' +
                '<a href="' + siteRoot + 'resources/downloads/index.html">Downloads<small>Brochures &amp; datasheets</small></a>' +
              '</div>' +
            '</details>' +
            '<details class="dd' + (isAbout ? ' active' : '') + '">' +
              '<summary>About</summary>' +
              '<div class="menu">' +
                '<a href="' + siteRoot + 'about/index.html">Our Company<small>Who we are &amp; leadership</small></a>' +
                '<a href="' + siteRoot + 'about/certifications/index.html">Certifications<small>ISO 9001 standard</small></a>' +
                '<a href="' + siteRoot + 'careers/index.html">Careers<small>Join our engineering team</small></a>' +
              '</div>' +
            '</details>' +
            '<a href="' + siteRoot + 'support/index.html"' + (isSupport ? ' class="active"' : '') + '>Support</a>' +
            '<button class="btn p" style="margin:0 0 0 8px;padding:9px 18px" data-auth="signup">Apply for Internship</button>' +
            '<button class="btn" style="margin:0 0 0 4px;padding:9px 16px" data-auth="login">Login</button>' +
          '</nav>' +
        '</div>';
    }

    // 4. Mount into header element
    var headerEl = document.querySelector('header');
    if (headerEl) {
      headerEl.innerHTML = headerHtml;
    } else {
      var mainEl = document.getElementById('main') || document.querySelector('main');
      var newHeader = document.createElement('header');
      newHeader.innerHTML = headerHtml;
      if (mainEl && mainEl.parentNode) {
        mainEl.parentNode.insertBefore(newHeader, mainEl);
      } else {
        document.body.insertBefore(newHeader, document.body.firstChild);
      }
    }

    // 5. Bind Mobile Burger & Dropdowns
    var nav = document.querySelector('.nav');
    var burger = document.querySelector('.burger');
    var dropdowns = document.querySelectorAll('.dd');

    if (burger && nav) {
      burger.onclick = function(e) {
        e.stopPropagation();
        var isOpen = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };
    }

    dropdowns.forEach(function(dd) {
      dd.addEventListener('toggle', function() {
        if (dd.open) {
          dropdowns.forEach(function(other) {
            if (other !== dd) other.open = false;
          });
        }
      });
    });

    // 6. Student tab switching within portal without page reload
    document.addEventListener('click', function(e) {
      // Logout button click
      var logoutBtn = e.target.closest('.btn-header-logout');
      if (logoutBtn) {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          if (window.YuvantaraDB && typeof YuvantaraDB.logout === 'function') {
            YuvantaraDB.logout();
          } else {
            localStorage.removeItem('yuvantara_session_user');
          }
          window.location.href = siteRoot + 'index.html';
        }
        return;
      }

      // Student tab link click while on portal page
      var studentLink = e.target.closest('[data-student-tab]');
      if (studentLink && window.location.pathname.indexOf('/portal/') !== -1) {
        e.preventDefault();
        var tabName = studentLink.getAttribute('data-student-tab');
        if (window.switchPortalTab) {
          window.switchPortalTab(tabName);
        } else {
          var tabBtn = document.querySelector('.portal-tab-btn[data-tab="' + tabName + '"]');
          if (tabBtn) tabBtn.click();
        }
        document.querySelectorAll('[data-student-tab]').forEach(function(l) { l.classList.remove('active'); });
        studentLink.classList.add('active');
        if (nav && burger) {
          nav.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      // Close dropdowns on outside click
      dropdowns.forEach(function(dd) {
        if (!dd.contains(e.target)) dd.open = false;
      });
      if (nav && burger && !nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dropdowns.forEach(function(dd) { dd.open = false; });
        if (nav && burger) {
          nav.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Ensure header is initialized both immediately and on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedHeader);
  } else {
    initSharedHeader();
  }

  window.initSharedHeader = initSharedHeader;
})();
