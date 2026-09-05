// ===== Luminol — Server Status + Copy IP =====

// 🎯 CHANGE THESE TWO VALUES
const MC_SERVER_ADDRESS = "finishes-ames.tun.ply.gg";   // Your Minecraft server IP
const DISCORD_INVITE    = "https://discord.gg/TAhvjB9cAy"; // Your invite link

// ---- Copy IP button ----
function copyIP() {
    navigator.clipboard.writeText(MC_SERVER_ADDRESS).then(() => {
        const btn = document.querySelector(".btn-gold");
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = original), 1500);
    });
}

// ---- Live Minecraft status via mcsrvstat.us ----
async function fetchMCStatus() {
    const el = document.getElementById("mc-status");
    try {
        // API requires a descriptive User-Agent【turn1search5】
        const res = await fetch(
            `https://api.mcsrvstat.us/3/${MC_SERVER_ADDRESS}`,
            { headers: { "User-Agent": "Luminol-Website/1.0" } }
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        if (data.online) {
            const p = data.players;
            el.textContent = `🟢 Online — ${p.online}/${p.max} players · ${data.version}`;
            el.classList.add("online");
        } else {
            el.textContent = "🔴 Server is offline";
            el.classList.add("offline");
        }
    } catch (err) {
        el.textContent = "⚠️ Could not reach status API";
        el.classList.add("offline");
    }
}
fetchMCStatus();
setInterval(fetchMCStatus, 5 * 60 * 1000); // refresh every 5 min (API cache window)