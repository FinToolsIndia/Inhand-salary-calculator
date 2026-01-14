// GDPR Cookie Consent Management
class GDPRConsent {
    constructor() {
        this.consentKey = 'fintoolsindia_gdpr_consent';
        this.init();
    }

    init() {
        // Check if user has already given consent
        const consent = localStorage.getItem(this.consentKey);
        if (!consent) {
            this.showConsentBanner();
        } else {
            const consentData = JSON.parse(consent);
            if (consentData.analytics) {
                this.loadAnalytics();
            }
            if (consentData.ads) {
                this.enableAds();
            }
        }
    }

    showConsentBanner() {
        const banner = document.createElement('div');
        banner.className = 'cookie-consent';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <h4>🍪 We value your privacy</h4>
                    <p>We use cookies and similar technologies to improve your experience, analyze site usage, and assist in our marketing. We also share information about your use of our site with our advertising and analytics partners. By clicking "Accept All", you consent to our use of cookies. <a href="privacy.html" target="_blank">Learn more</a></p>
                </div>
                <div class="cookie-consent-buttons">
                    <button class="cookie-consent-btn decline" onclick="gdprConsent.decline()">
                        Decline All
                    </button>
                    <button class="cookie-consent-btn settings" onclick="gdprConsent.showSettings()">
                        Cookie Settings
                    </button>
                    <button class="cookie-consent-btn accept" onclick="gdprConsent.acceptAll()">
                        Accept All
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }

    showSettings() {
        // Hide current banner
        const banner = document.querySelector('.cookie-consent');
        if (banner) banner.remove();

        // Show detailed settings
        const settingsBanner = document.createElement('div');
        settingsBanner.className = 'cookie-consent';
        settingsBanner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <h4>🔧 Cookie Preferences</h4>
                    <div style="margin: 15px 0;">
                        <label style="display: block; margin: 10px 0;">
                            <input type="checkbox" id="essential-cookies" checked disabled>
                            <strong>Essential Cookies</strong> (Required)
                            <br><small>These cookies are necessary for the website to function and cannot be switched off.</small>
                        </label>
                        <label style="display: block; margin: 10px 0;">
                            <input type="checkbox" id="analytics-cookies">
                            <strong>Analytics Cookies</strong>
                            <br><small>These cookies help us understand how visitors interact with our website.</small>
                        </label>
                        <label style="display: block; margin: 10px 0;">
                            <input type="checkbox" id="advertising-cookies">
                            <strong>Advertising Cookies</strong>
                            <br><small>These cookies are used to show you relevant ads and support our free service.</small>
                        </label>
                    </div>
                </div>
                <div class="cookie-consent-buttons">
                    <button class="cookie-consent-btn decline" onclick="gdprConsent.decline()">
                        Save & Decline All
                    </button>
                    <button class="cookie-consent-btn accept" onclick="gdprConsent.saveSettings()">
                        Save Preferences
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(settingsBanner);
    }

    acceptAll() {
        const consent = {
            timestamp: Date.now(),
            essential: true,
            analytics: true,
            ads: true
        };
        
        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        this.hideConsentBanner();
        this.loadAnalytics();
        this.enableAds();
    }

    decline() {
        const consent = {
            timestamp: Date.now(),
            essential: true,
            analytics: false,
            ads: false
        };
        
        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        this.hideConsentBanner();
        this.disableAds();
    }

    saveSettings() {
        const analytics = document.getElementById('analytics-cookies')?.checked || false;
        const ads = document.getElementById('advertising-cookies')?.checked || false;
        
        const consent = {
            timestamp: Date.now(),
            essential: true,
            analytics: analytics,
            ads: ads
        };
        
        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        this.hideConsentBanner();
        
        if (analytics) {
            this.loadAnalytics();
        }
        if (ads) {
            this.enableAds();
        } else {
            this.disableAds();
        }
    }

    hideConsentBanner() {
        const banner = document.querySelector('.cookie-consent');
        if (banner) {
            banner.classList.add('hidden');
            setTimeout(() => banner.remove(), 300);
        }
    }

    loadAnalytics() {
        // Load Google Analytics if not already loaded
        if (!window.gtag) {
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
            document.head.appendChild(script);
            
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
        }
    }

    enableAds() {
        // AdSense is already loaded, just ensure ads can display
        if (window.adsbygoogle) {
            // Refresh ads if needed
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.log('AdSense refresh attempted');
            }
        }
    }

    disableAds() {
        // Hide ad containers
        const adContainers = document.querySelectorAll('.ad-container');
        adContainers.forEach(container => {
            container.style.display = 'none';
        });
    }

    // Method to check if user has consented to specific cookie type
    hasConsent(type) {
        const consent = localStorage.getItem(this.consentKey);
        if (!consent) return false;
        
        const consentData = JSON.parse(consent);
        return consentData[type] || false;
    }

    // Method to revoke consent (for privacy policy page)
    revokeConsent() {
        localStorage.removeItem(this.consentKey);
        location.reload();
    }
}

// Initialize GDPR consent management
let gdprConsent;
document.addEventListener('DOMContentLoaded', function() {
    gdprConsent = new GDPRConsent();
});
