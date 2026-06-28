// panel_onboarding.js - Interactive onboarding tour for PrimeVocab

class OnboardingTour {
    constructor() {
        this.currentStep = 0;
        this.overlay = null;
        this.modal = null;
        this.highlightedElement = null;

        this.steps = [
            {
                titleKey: "onboarding_welcome_title",
                descKey: "onboarding_welcome_desc",
                target: null,
                icon: "🚀",
                tab: null
            },
            {
                titleKey: "onboarding_subtitles_title",
                descKey: "onboarding_subtitles_desc",
                target: "#tab-subtitle",
                icon: "🎬",
                tab: "subtitle"
            },
            {
                titleKey: "onboarding_settings_title",
                descKey: "onboarding_settings_desc",
                target: "#tab-settings",
                icon: "⚙️",
                tab: "settings"
            },
            {
                titleKey: "onboarding_dictionary_title",
                descKey: "onboarding_dictionary_desc",
                target: "#tab-archive",
                icon: "📚",
                tab: "archive"
            },
            {
                titleKey: "onboarding_review_title",
                descKey: "onboarding_review_desc",
                target: "#tab-review",
                icon: "⚡",
                tab: "review",
                subtab: "srs"
            },
            {
                titleKey: "onboarding_games_title",
                descKey: "onboarding_games_desc",
                target: "#subtab-games",
                icon: "🎮",
                tab: "review",
                subtab: "games"
            },
            {
                titleKey: "onboarding_shortcuts_title",
                descKey: "onboarding_shortcuts_desc",
                target: "#help-btn",
                icon: "⌨️",
                tab: null
            }
        ];
    }

    init() {
        // Check if onboarding completed before
        chrome.storage.local.get({ onboardingCompleted: false }, (data) => {
            if (!data.onboardingCompleted) {
                // Ensure locale messages are loaded before showing
                const checkAndStart = () => {
                    if (window.i18nInitialized) {
                        this.start();
                    } else {
                        setTimeout(checkAndStart, 50);
                    }
                };
                checkAndStart();
            }
        });
    }

    start() {
        this.currentStep = 0;
        this.createUI();
        this.showStep(0);
    }

    createUI() {
        if (this.overlay) return;

        this.overlay = document.createElement("div");
        this.overlay.className = "onboarding-overlay";
        this.overlay.style.display = "flex";

        this.modal = document.createElement("div");
        this.modal.className = "onboarding-modal";

        this.overlay.appendChild(this.modal);
        
        const appContainer = document.querySelector(".app");
        if (appContainer) {
            appContainer.appendChild(this.overlay);
        } else {
            document.body.appendChild(this.overlay);
        }
    }

    showStep(index) {
        this.currentStep = index;
        const step = this.steps[index];

        // Clear previous highlight
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove("onboarding-highlight-target");
            this.highlightedElement = null;
        }
        document.querySelectorAll(".onboarding-parent-highlight").forEach(p => {
            p.classList.remove("onboarding-parent-highlight");
        });

        // Navigate tab if necessary
        if (step.tab) {
            if (typeof switchMainTab === "function") {
                switchMainTab(step.tab);
            }
            if (step.subtab && typeof switchReviewSubtab === "function") {
                switchReviewSubtab(step.subtab);
            }
        }

        // Apply new highlight
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                this.highlightedElement = el;
                el.classList.add("onboarding-highlight-target");
                
                // Lift parent elements stacking context above overlay, but stop before the main panel page container
                let parent = el.parentElement;
                while (parent && parent !== document.body && !parent.classList.contains("app") && !parent.classList.contains("panel")) {
                    parent.classList.add("onboarding-parent-highlight");
                    parent = parent.parentElement;
                }

                // Auto scroll to element if needed
                el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
            }
        }

        const titleText = getMessage(step.titleKey) || step.titleKey;
        const descText = getMessage(step.descKey) || step.descKey;
        const nextBtnText = index === this.steps.length - 1 ? getMessage("onboarding_btn_finish") || "Finish Tour 🎉" : getMessage("onboarding_btn_next") || "Next";
        const prevBtnText = getMessage("onboarding_btn_prev") || "Back";
        const skipBtnText = getMessage("onboarding_btn_skip") || "Skip";
        const closeTooltip = getMessage("tooltip_close_panel") || "Close";

        this.modal.innerHTML = `
            <button class="onboarding-close-btn" title="${closeTooltip}">&times;</button>
            <div class="onboarding-icon">${step.icon}</div>
            <h3 class="onboarding-title">${titleText}</h3>
            <p class="onboarding-desc">${descText}</p>
            <div class="onboarding-progress-dots">
                ${this.steps.map((_, i) => `<span class="progress-dot ${i === index ? 'active' : ''}"></span>`).join('')}
            </div>
            <div class="onboarding-actions">
                <button class="onboarding-btn secondary onboarding-skip-btn">${skipBtnText}</button>
                <div class="onboarding-nav-btns">
                    <button class="onboarding-btn secondary onboarding-prev-btn" ${index === 0 ? 'disabled style="opacity:0.4; pointer-events:none;"' : ''}>${prevBtnText}</button>
                    <button class="onboarding-btn primary onboarding-next-btn">${nextBtnText}</button>
                </div>
            </div>
        `;

        // Position modal (always centered as requested by the user)
        this.positionModal(null);

        // Bind events
        this.modal.querySelector(".onboarding-close-btn").addEventListener("click", () => this.finish());
        this.modal.querySelector(".onboarding-skip-btn").addEventListener("click", () => this.finish());
        if (index > 0) {
            this.modal.querySelector(".onboarding-prev-btn").addEventListener("click", () => this.showStep(index - 1));
        }
        this.modal.querySelector(".onboarding-next-btn").addEventListener("click", () => {
            if (index < this.steps.length - 1) {
                this.showStep(index + 1);
            } else {
                this.finish();
            }
        });
    }

    positionModal(targetSelector) {
        // Keep the modal centered in the viewport overlay
        this.modal.style.position = "relative";
        this.modal.style.top = "auto";
        this.modal.style.left = "auto";
        this.modal.style.margin = "0 auto";
    }

    finish() {
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove("onboarding-highlight-target");
            this.highlightedElement = null;
        }
        document.querySelectorAll(".onboarding-parent-highlight").forEach(p => {
            p.classList.remove("onboarding-parent-highlight");
        });
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        chrome.storage.local.set({ onboardingCompleted: true });
        
        // Return to Subtitles tab at the end of the tour
        if (typeof switchMainTab === "function") {
            switchMainTab("subtitle");
        }
    }
}

// Instantiate and expose globally so it can be re-run
window.primevocabOnboarding = new OnboardingTour();
document.addEventListener("DOMContentLoaded", () => {
    window.primevocabOnboarding.init();
    
    // Bind tour button
    const tourBtn = document.getElementById("tour-btn");
    if (tourBtn) {
        tourBtn.addEventListener("click", () => {
            window.primevocabOnboarding.start();
        });
    }
});
