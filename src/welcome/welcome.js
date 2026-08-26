const items = [...document.querySelectorAll("li")];

async function check() {
  const all = await chrome.storage.local.get(["selectors", "queue", "history"]);
  for (const li of items) {
    const v = li.dataset.verify;
    if (!v) continue;
    let ok = false;
    if (v.startsWith("selectors.")) {
      const key = v.split(".").pop();
      const last = all.selectors?.__lastPlatform || {};
      ok = !!all.selectors && Object.values(all.selectors).some(s => !!s[key]);
    } else if (v === "queue.len>=1") {
      ok = (all.queue || []).length >= 1;
    } else if (v === "history.dryRunOk") {
      ok = (all.history || []).some(h => h.status === "dry-run-ok");
    }
    li.querySelector("[data-next]").disabled = !ok;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  check();
  chrome.storage.onChanged.addListener(check);
  items.forEach(li => li.querySelector("[data-next]")?.addEventListener("click", () => { li.style.display = "none"; }));
  document.getElementById("done").addEventListener("click", async () => {
    await chrome.storage.local.set({ settings: { ...((await chrome.storage.local.get("settings")).settings || {}), onboarded: true } });
    window.close();
  });
  document.getElementById("coffee").addEventListener("click", e => { e.preventDefault(); chrome.tabs.create({ url: "https://donate.stripe.com/28EbITdPK6pa0kv3gU3Ru00" }); });
});