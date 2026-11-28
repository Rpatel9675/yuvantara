// Yuvantara Shared Footer Component
// Guarantees consistent footer, company identity, and working links across all pages
(function() {
  'use strict';

  function initSharedFooter() {
    var curPath = window.location.pathname.toLowerCase();

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

    // 2. Check logged-in user to hide "Apply for Internship"
    var currentUser = null;
    try {
      if (window.YuvantaraDB && typeof YuvantaraDB.getCurrentUser === 'function') {
        currentUser = YuvantaraDB.getCurrentUser();
      } else {
        var rawUser = localStorage.getItem('yuvantara_session_user');
        if (rawUser) currentUser = JSON.parse(rawUser);
      }
    } catch(e) {}

    var applyLinkHtml = '';
    var portalLinkHtml = '';
    if (currentUser) {
      // User is logged in: HIDE option to apply for internship completely
      applyLinkHtml = '';
      if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
        portalLinkHtml = '<a href="' + siteRoot + 'admin_login_777/index.html">Admin Command Center</a>';
      } else {
        portalLinkHtml = '<a href="' + siteRoot + 'portal/index.html">My Student Portal</a>';
      }
    } else {
      applyLinkHtml = '<a href="#" data-auth="signup">Apply for Internship</a>';
      portalLinkHtml = '<a href="#" data-auth="login">Student Portal Login</a>';
    }

    // 3. Build standard footer HTML
    var footerHtml =
      '<div class="w">' +
        '<div class="footer-top">' +
          '<div class="footer-brand">' +
            '<h3 class="foot-logo"><img src="' + siteRoot + 'assets/images/logo-mark-light.png" alt="" width="32" height="44"><span>Yuvantara Venture</span></h3>' +
            '<p>Empowering students and technology teams through advanced industrial internships, enterprise cybersecurity, and robust IT infrastructure solutions.</p>' +
            '<div class="footer-contact-item"><i>📍</i><span>Lekha Nagar, Saguna More, Patna, Bihar</span></div>' +
            '<div class="footer-contact-item"><i>✉️</i><a href="mailto:yuvantara@yuvantaraventure.com">yuvantara@yuvantaraventure.com</a></div>' +
            '<div class="footer-contact-item"><i>📞</i><a href="tel:+919876543210">+91 98765 43210</a></div>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Internship Programs</h4>' +
            '<a href="' + siteRoot + 'internships/index.html" data-auth="signup" data-course="Cybersecurity &amp; SOC Operations">Cybersecurity &amp; SOC</a>' +
            '<a href="' + siteRoot + 'internships/index.html" data-auth="signup" data-course="Artificial Intelligence &amp; Machine Learning">AI &amp; Machine Learning</a>' +
            '<a href="' + siteRoot + 'internships/index.html" data-auth="signup" data-course="Cloud Infrastructure &amp; DevOps">Cloud Infrastructure &amp; DevOps</a>' +
            '<a href="' + siteRoot + 'internships/index.html" data-auth="signup" data-course="Python Full-Stack &amp; Automation">Python Full-Stack &amp; Automation</a>' +
            '<a href="' + siteRoot + 'internships/index.html" data-auth="signup" data-course="Robotics &amp; IoT Embedded Systems">Robotics, IoT &amp; Embedded</a>' +
            '<a href="' + siteRoot + 'internships/index.html">View All 22+ Programs →</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Technology Solutions</h4>' +
            '<a href="' + siteRoot + 'cybersecurity-solutions/index.html">Cybersecurity Solutions</a>' +
            '<a href="' + siteRoot + 'cybersecurity-solutions/network-security/index.html">Network Security &amp; Firewalls</a>' +
            '<a href="' + siteRoot + 'it-infrastructure-solutions/index.html">IT Infrastructure Solutions</a>' +
            '<a href="' + siteRoot + 'managed-services/index.html">Managed IT Services</a>' +
            '<a href="' + siteRoot + 'managed-services/soc-implementation/index.html">SOC Implementation</a>' +
            '<a href="' + siteRoot + 'about/certifications/index.html">ISO 9001 Quality</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Student &amp; Verification</h4>' +
            '<a href="' + siteRoot + 'verify-certificate/index.html">Verify Certificate</a>' +
            '<a href="' + siteRoot + 'internships/index.html">Internship Catalog</a>' +
            applyLinkHtml +
            portalLinkHtml +
            '<a href="' + siteRoot + 'careers/index.html">Careers &amp; Mentorship</a>' +
            '<a href="' + siteRoot + 'contact/index.html">Contact Us</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bar">' +
          '<span>© 2026 Yuvantara Venture. All rights reserved.</span>' +
          '<div class="footer-links">' +
            '<a href="' + siteRoot + 'privacy-policy/index.html">Privacy Policy</a>' +
            '<a href="' + siteRoot + 'terms/index.html">Terms of Use</a>' +
            '<a href="' + siteRoot + 'verify-certificate/index.html">Verify Certificate</a>' +
            '<a href="' + siteRoot + 'sitemap/index.html">Sitemap</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 3. Inject into existing <footer> or create before </body>
    var footerEl = document.querySelector('footer');
    if (footerEl) {
      footerEl.innerHTML = footerHtml;
    } else {
      var newFooter = document.createElement('footer');
      newFooter.innerHTML = footerHtml;
      var scripts = document.querySelectorAll('script');
      if (scripts.length > 0 && scripts[0].parentNode) {
        scripts[0].parentNode.insertBefore(newFooter, scripts[0]);
      } else {
        document.body.appendChild(newFooter);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedFooter);
  } else {
    initSharedFooter();
  }

  window.initSharedFooter = initSharedFooter;
})();
