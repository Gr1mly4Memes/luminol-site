// ===== Luminol — config + copy + live status =====
// Single source of truth for the IP — HTML uses [data-mc-ip] placeholders.
const MC_SERVER_ADDRESS = "finishes-ames.tun.ply.gg";
const MC_VERSION = "26.2";
const DISCORD_INVITE = "https://discord.gg/TAhvjB9cAy";

// Fill every IP placeholder from the single constant (fixes "wrong IP" drift).
document.querySelectorAll("[data-mc-ip]").forEach((el) => {
    el.textContent = MC_SERVER_ADDRESS;
});
document.getElementById("year").textContent = new Date().getFullYear();

// ---- Copy IP (works on http + https, with fallback) ----
async function copyIP(btn) {
    const done = () => {
        if (!btn) return;
        const original = btn.dataset.original || btn.textContent;
        btn.dataset.original = original;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = original), 1500);
    };
    try {
        await navigator.clipboard.writeText(MC_SERVER_ADDRESS);
        done();
    } catch {
        // Fallback for non-secure contexts (plain http://, some browsers)
        const ta = document.createElement("textarea");
        ta.value = MC_SERVER_ADDRESS;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
        done();
    }
}

// ---- Live Minecraft status via mcstatus.io (Playit.gg-compatible) ----
// mcsrvstat.us resolves Playit tunnels to IPv6 and reports offline even when
// the server is up. mcstatus.io follows the SRV record over IPv4 correctly,
// so it is the primary source here, with mcsrvstat.us as fallback.
async function fetchJSON(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchMCStatus() {
    const pill = document.getElementById("mc-status");
    const text = document.getElementById("mc-status-text");
    const hint = document.getElementById("status-hint");
    const statPlayers = document.getElementById("stat-players");
    const statStatus = document.getElementById("stat-status");
    const navDot = document.getElementById("nav-dot");
    const footerStatus = document.getElementById("footer-status");

    // Never show server-software names — display only "Java <number>".
    // Display only "Java <number>", falling back to the known version.
    const toDisplayVersion = (raw) => {
        const m = String(raw || "").match(/(\d+\.\d+(?:\.\d+)?)/);
        return "Java " + (m ? m[1] : MC_VERSION);
    };
    const setOffline = (msg, hintMsg) => {
        pill.classList.remove("online");
        pill.classList.add("offline");
        text.textContent = msg;
        if (statStatus) statStatus.textContent = "Offline";
        if (statPlayers) statPlayers.textContent = "0";
        if (footerStatus) footerStatus.textContent = "Status: offline";
        if (navDot) navDot.className = "dot offline";
        if (hint && hintMsg) { hint.textContent = hintMsg; hint.hidden = false; }
    };
    const setOnline = (online, max, version) => {
        pill.classList.remove("offline");
        pill.classList.add("online");
        text.textContent = `Online — ${online}/${max} players${version ? " · " + version : ""}`;
        if (statStatus) statStatus.textContent = "Online";
        if (statPlayers) statPlayers.textContent = String(online);
        if (footerStatus) footerStatus.textContent = `Status: online — ${online}/${max}`;
        if (navDot) navDot.className = "dot online";
        if (hint) hint.hidden = true;
    };

    try {
        // Primary: mcstatus.io (handles Playit.gg SRV → port 35773 correctly)
        const data = await fetchJSON(`https://api.mcstatus.io/v2/status/java/${MC_SERVER_ADDRESS}`);

        if (data && data.online) {
            const online = data.players?.online ?? 0;
            const max = data.players?.max ?? "?";
            setOnline(online, max, toDisplayVersion(data.version?.name_clean));
            return;
        }

        // Fallback: mcsrvstat.us (may misreport Playit tunnels as offline)
        try {
            const fb = await fetchJSON(`https://api.mcsrvstat.us/3/${MC_SERVER_ADDRESS}`);
            if (fb && fb.online) {
                setOnline(fb.players?.online ?? 0, fb.players?.max ?? "?", toDisplayVersion(fb.version));
                return;
            }
        } catch {}

        // Playit.gg tunnels only respond while the host PC is online.
        setOffline(
            "Server is offline",
            "The tunnel only answers while the host PC is running — ask staff in Discord to start it."
        );
    } catch (err) {
        setOffline("Could not reach status API", "Status check failed — the IP copy button still works. Try refreshing.");
    }
}

fetchMCStatus();
setInterval(fetchMCStatus, 60 * 1000);

// ===== Page transitions: scroll reveals + nav spy + target flash =====
(function () {
    // Reduced motion check removed to force animations

    // 1. Reveal elements as they scroll into view.
    // Uses IntersectionObserver + a scroll sweep fallback, so fast jumps
    // (scrollbar drag, End key, instant scrollTo) can't leave content hidden.
    const revealEls = Array.from(
        document.querySelectorAll(
            ".section, .split, .card, .faq, .cta-banner, .rules-list li, .stats-strip"
        )
    );
    revealEls.forEach((el) => el.classList.add("reveal"));
    const pending = new Set(revealEls);

    const show = (el) => {
        el.classList.add("visible");
        pending.delete(el);
        revealer.unobserve(el);
    };
    const sweep = () => {
        const vh = window.innerHeight;
        pending.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.top < vh * 0.92 && r.bottom > 0) show(el);
        });
    };

    const revealer = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) show(e.target);
            });
            if (pending.size === 0) {
                revealer.disconnect();
                window.removeEventListener("scroll", onScroll, { passive: true });
            }
        },
        { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    revealEls.forEach((el) => revealer.observe(el));

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            sweep();
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    sweep(); // reveal anything already in view on load

    // 2. Highlight the nav link for the section in view
    const navMap = new Map();
    document.querySelectorAll(".nav-links a[href^='#']").forEach((a) => {
        navMap.set(a.getAttribute("href").slice(1), a);
    });
    const spy = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                const link = navMap.get(e.target.id);
                if (!link) return;
                if (e.isIntersecting) {
                    navMap.forEach((a) => a.classList.remove("active"));
                    link.classList.add("active");
                }
            });
        },
        { rootMargin: "-40% 0px -55% 0px" }
    );
    navMap.forEach((_, id) => {
        const target = document.getElementById(id);
        if (target) spy.observe(target);
    });

    // 3. Brief glow flash on the section you navigated to
    document.querySelectorAll("a[href^='#']").forEach((a) => {
        a.addEventListener("click", (e) => {
            const target = document.querySelector(a.getAttribute("href"));
            if (!target) return;

            // Apply page transition to nav links and card links
            const isNavLink = a.closest('.nav-links');
            const isCardLink = a.closest('.card-link');
            const isStepLink = a.closest('.step');

            if (isNavLink || isCardLink || isStepLink) {
                e.preventDefault();

                // Page transition: fade out, scroll, then fade in
                document.body.classList.add('page-transition');

                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'auto' });
                    document.body.classList.remove('page-transition');
                    document.body.classList.add('page-transition-in');

                    setTimeout(() => {
                        document.body.classList.remove('page-transition-in');
                        target.classList.remove("section-flash");
                        setTimeout(() => {
                            target.classList.add("section-flash");
                            setTimeout(() => target.classList.remove("section-flash"), 1300);
                        }, 50);
                    }, 500);
                }, 300);
            } else {
                // Regular anchor links just get the flash effect
                target.classList.remove("section-flash");
                setTimeout(() => {
                    target.classList.add("section-flash");
                    setTimeout(() => target.classList.remove("section-flash"), 1300);
                }, 450);
            }
        });
    });
})();
