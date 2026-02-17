const STORAGE_KEY = "adforge_state_v1";

const defaultState = {
  profile: null,
  claims: [],
  offers: [],
  adKit: [],
  approvals: null,
};

const playbooks = {
  HVAC: ["Seasonal Tune-up", "Emergency Repair", "High-Efficiency Upgrade"],
  Solar: ["Bill Reduction", "Battery Backup", "Zero-Down Financing"],
  Dentists: ["Smile Makeover", "Implant Consult", "New Patient Exam"],
  Custom: ["Local Offer", "Trust Angle", "Speed-to-Lead Angle"],
};

const layouts = ["Proof-forward", "Offer-forward", "Local trust"];

let state = loadState();

const intakeForm = document.getElementById("intakeForm");
const claimForm = document.getElementById("claimForm");
const claimInput = document.getElementById("claimInput");
const claimStatus = document.getElementById("claimStatus");
const claimsList = document.getElementById("claimsList");
const policyText = document.getElementById("policyText");
const riskOutput = document.getElementById("riskOutput");
const statusBadge = document.getElementById("statusBadge");
const offersOutput = document.getElementById("offersOutput");
const adKitOutput = document.getElementById("adKitOutput");
const offerSelection = document.getElementById("offerSelection");
const proofSelection = document.getElementById("proofSelection");
const claimChecklist = document.getElementById("claimChecklist");
const approvalResult = document.getElementById("approvalResult");

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function renderAll() {
  renderProfile();
  renderClaims();
  renderOffers();
  renderAdKit();
  renderApprovalInputs();
}

function renderProfile() {
  if (!state.profile) {
    statusBadge.textContent = "No client profile saved yet.";
    return;
  }
  statusBadge.textContent = `${state.profile.brandName} (${state.profile.niche}) • ${state.profile.serviceArea} • ${approvedClaims().length} approved claims`;
}

function approvedClaims() {
  return state.claims.filter((c) => c.status === "Approved");
}

function renderClaims() {
  if (!state.claims.length) {
    claimsList.innerHTML = "<p class='muted'>No claims yet.</p>";
    return;
  }
  claimsList.innerHTML = state.claims
    .map((claim, idx) => `
      <div class="item-row">
        <div>
          <strong>${claim.status}</strong> — ${escapeHtml(claim.text)}
        </div>
        <button data-idx="${idx}" class="btn btn-secondary btn-sm remove-claim" type="button">Remove</button>
      </div>
    `)
    .join("");

  document.querySelectorAll(".remove-claim").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.claims.splice(Number(btn.dataset.idx), 1);
      saveState();
    });
  });
}

function renderOffers() {
  offersOutput.innerHTML = state.offers.length
    ? state.offers
        .map(
          (offer) => `
        <article class="item-card">
          <h3>${escapeHtml(offer.angle)}</h3>
          <p><strong>Hooks:</strong> ${escapeHtml(offer.hooks.join(" | "))}</p>
          <p><strong>Objection answer:</strong> ${escapeHtml(offer.objection)}</p>
          <p><strong>Proof stack:</strong> ${escapeHtml(offer.proof)}</p>
          <p><strong>CTA:</strong> ${escapeHtml(offer.cta)}</p>
        </article>`
        )
        .join("")
    : "<p class='muted'>Generate offers after adding approved claims.</p>";
}

function renderAdKit() {
  adKitOutput.innerHTML = state.adKit.length
    ? state.adKit
        .map(
          (ad) => `
      <article class="item-card">
        <h3>${escapeHtml(ad.format)} • ${escapeHtml(ad.layout)} • ${escapeHtml(ad.angle)}</h3>
        <p><strong>Primary text:</strong> ${escapeHtml(ad.primaryText)}</p>
        <p><strong>Headline:</strong> ${escapeHtml(ad.headline)}</p>
        <p><strong>Proof line:</strong> ${escapeHtml(ad.proofLine)}</p>
        <p><strong>CTA:</strong> ${escapeHtml(ad.cta)}</p>
        <p><strong>Creative direction:</strong> ${escapeHtml(ad.creative)}</p>
      </article>`
        )
        .join("")
    : "<p class='muted'>Build kit after generating offers.</p>";
}

function renderApprovalInputs() {
  offerSelection.innerHTML = state.offers
    .map((o, i) => `<option value="${i}">${escapeHtml(o.angle)}</option>`)
    .join("");

  proofSelection.innerHTML = approvedClaims()
    .map((c, i) => `<option value="${i}">${escapeHtml(c.text)}</option>`)
    .join("");

  claimChecklist.innerHTML = approvedClaims().length
    ? `<p><strong>Claim Approval Checklist</strong></p>${approvedClaims()
        .map(
          (c, i) => `<label><input type="checkbox" name="claimCheck" value="${i}" /> ${escapeHtml(c.text)}</label>`
        )
        .join("")}`
    : "<p class='muted'>No approved claims available for checklist.</p>";
}

function generateOffers() {
  if (!state.profile) {
    alert("Save client profile first.");
    return;
  }
  const approved = approvedClaims();
  if (!approved.length) {
    alert("Add at least one approved claim first.");
    return;
  }

  const angles = playbooks[state.profile.niche] || playbooks.Custom;
  state.offers = angles.slice(0, 3).map((angle, i) => ({
    angle,
    hooks: [`${state.profile.serviceArea}: ${angle}`, `Trusted ${state.profile.niche.toLowerCase()} partner`],
    objection: `Not sure if this is right? We start with a quick fit check and clear next step.`,
    proof: approved[i % approved.length].text,
    cta: `Book your ${angle.toLowerCase()} call`,
  }));
  saveState();
}

function buildAdKit() {
  if (!state.offers.length) {
    alert("Generate offers first.");
    return;
  }

  const formats = ["Feed", "Story"];
  state.adKit = state.offers.flatMap((offer, i) =>
    formats.map((format, j) => ({
      angle: offer.angle,
      format,
      layout: layouts[(i + j) % layouts.length],
      primaryText: `${offer.hooks[0]}. ${offer.objection}`,
      headline: `${state.profile.brandName}: ${offer.angle}`,
      proofLine: offer.proof,
      cta: offer.cta,
      creative: `Use ${format.toLowerCase()} framing with ${layouts[(i + j) % layouts.length].toLowerCase()} visual.`,
    }))
  );
  saveState();
}

function riskCheck(text) {
  const patterns = [
    { re: /you\s+are|your\s+(age|health|income)/i, label: "Personal attributes inference" },
    { re: /guaranteed|100%|instant results/i, label: "Unrealistic guarantees" },
    { re: /cure|diagnose|treatment|disease/i, label: "Sensitive/health-like language" },
    { re: /finance|financing|zero-down/i, label: "Financing claim may need disclaimer" },
  ];
  const flags = patterns.filter((p) => p.re.test(text)).map((p) => p.label);
  return flags.length ? flags : ["No obvious risk patterns detected."];
}

function rewrite(text, mode) {
  let output = text
    .replace(/guaranteed/gi, "designed to")
    .replace(/100%/gi, "high")
    .replace(/instant results/gi, "fast response")
    .replace(/cure|diagnose|treatment|disease/gi, "service");

  if (/finance|financing|zero-down/i.test(output)) {
    output += " Terms and eligibility apply.";
  }

  if (mode === "strict") {
    output = output.replace(/best|top|#1/gi, "trusted");
  }

  return output;
}

function downloadFile(name, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  if (!state.adKit.length) {
    alert("Generate ad kit first.");
    return;
  }
  const rows = ["angle,format,layout,headline,proof,cta", ...state.adKit.map((a) => [a.angle, a.format, a.layout, a.headline, a.proofLine, a.cta].map(csvSafe).join(","))];
  downloadFile("adforge-copy-sheet.csv", rows.join("\n"), "text/csv");
}

function exportBrief() {
  if (!state.adKit.length) {
    alert("Generate ad kit first.");
    return;
  }
  const selected = state.adKit[0];
  const brief = `AdForge One-page Brief\n\nBrand: ${state.profile?.brandName || "-"}\nNiche: ${state.profile?.niche || "-"}\nService Area: ${state.profile?.serviceArea || "-"}\n\nAd: ${selected.headline}\nPrimary Text: ${selected.primaryText}\nProof: ${selected.proofLine}\nCTA: ${selected.cta}\nCreative: ${selected.creative}`;
  downloadFile("adforge-brief.txt", brief);
}

function exportClaims() {
  const approved = approvedClaims();
  if (!approved.length) {
    alert("No approved claims to export.");
    return;
  }
  downloadFile("approved-claims.json", JSON.stringify(approved, null, 2), "application/json");
}

function csvSafe(v) {
  const s = String(v || "").replace(/"/g, '""');
  return `"${s}"`;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

intakeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(intakeForm);
  state.profile = Object.fromEntries(data.entries());
  saveState();
});

claimForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.claims.push({ text: claimInput.value.trim(), status: claimStatus.value });
  claimInput.value = "";
  saveState();
});

document.getElementById("generateOffersBtn").addEventListener("click", generateOffers);
document.getElementById("generateKitBtn").addEventListener("click", buildAdKit);

document.getElementById("riskCheckBtn").addEventListener("click", () => {
  riskOutput.textContent = riskCheck(policyText.value).join(" • ");
});

document.getElementById("rewriteSaferBtn").addEventListener("click", () => {
  policyText.value = rewrite(policyText.value, "safer");
});

document.getElementById("rewriteStrictBtn").addEventListener("click", () => {
  policyText.value = rewrite(policyText.value, "strict");
});

document.getElementById("approvalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const checks = Array.from(document.querySelectorAll("input[name='claimCheck']:checked")).map((el) => Number(el.value));
  const approved = approvedClaims();
  state.approvals = {
    offer: state.offers[Number(offerSelection.value)]?.angle || null,
    tone: document.getElementById("toneSelection").value,
    proof: approved[Number(proofSelection.value)]?.text || null,
    approvedClaims: checks.map((i) => approved[i]?.text).filter(Boolean),
    changeRequest: {
      type: document.getElementById("changeType").value,
      note: document.getElementById("changeNote").value,
    },
  };
  approvalResult.textContent = `Saved: Offer=${state.approvals.offer || "n/a"}, Tone=${state.approvals.tone}, Proof=${state.approvals.proof || "n/a"}.`;
  saveState();
});

document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
document.getElementById("exportBriefBtn").addEventListener("click", exportBrief);
document.getElementById("exportClaimsBtn").addEventListener("click", exportClaims);

renderAll();
