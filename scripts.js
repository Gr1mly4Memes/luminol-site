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

// ---- Live Minecraft status via mcsrvstat.us ----
// NOTE: no custom headers — browsers forbid the `User-Agent` header and it
// breaks the request with CORS. mcsrvstat.us works fine without it.
async function fetchMCStatus() {
    const pill = document.getElementById("mc-status");
    const text = document.getElementById("mc-status-text");
    const hint = document.getElementById("status-hint");
    const statPlayers = document.getElementById("stat-players");
    const statStatus = document.getElementById("stat-status");
    const navDot = document.getElementById("nav-dot");

    const setOffline = (msg, hintMsg) => {
        pill.classList.remove("online");
        pill.classList.add("offline");
        text.textContent = msg;
        if (statStatus) statStatus.textContent = "Offline";
        if (statPlayers) statPlayers.textContent = "0";
        if (navDot) navDot.className = "dot offline";
        if (hint && hintMsg) { hint.textContent = hintMsg; hint.hidden = false; }
    };
    const setOnline = (online, max, version) => {
        pill.classList.remove("offline");
        pill.classList.add("online");
        text.textContent = `Online — ${online}/${max} players${version ? " · " + version : ""}`;
        if (statStatus) statStatus.textContent = "Online";
        if (statPlayers) statPlayers.textContent = String(online);
        if (navDot) navDot.className = "dot online";
        if (hint) hint.hidden = true;
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_ADDRESS}`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        if (data && data.online) {
            const online = data.players?.online ?? 0;
            const max = data.players?.max ?? "?";
            setOnline(online, max, data.version);
        } else {
            // Playit.gg tunnels only respond while the host PC is online.
            setOffline(
                "Server is offline",
                "The tunnel only answers while the host PC is running — ask staff in Discord to start it."
            );
        }
    } catch (err) {
        setOffline("Could not reach status API", "Status check failed — the IP copy button still works. Try refreshing.");
    }
}

fetchMCStatus();
setInterval(fetchMCStatus, 60 * 1000);
