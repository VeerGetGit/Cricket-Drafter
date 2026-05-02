// ================================================================
//  PHASE MANAGEMENT
// ================================================================
let currentPhase = "draft";   // "draft" | "match_setup" | "match" | "result"
let draftData = null;

function showPhase(phase) {
    currentPhase = phase;
    document.querySelectorAll(".phase").forEach(el => el.classList.add("hidden"));
    document.getElementById("phase-" + phase).classList.remove("hidden");
}

// ================================================================
//  DRAFT PHASE
// ================================================================
function start() {
    fetch("/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            captain1: document.getElementById("c1").value,
            captain2: document.getElementById("c2").value,
            call: document.getElementById("call").value
        })
    })
    .then(res => res.json())
    .then(data => {
        updateDraftUI(data);
        showPhase("draft");
    });
}

function pickPlayer(player) {
    fetch("/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player })
    })
    .then(res => res.json())
    .then(data => {
        updateDraftUI(data);
        // if (data.finished) {
        //     draftData = data;
        //     showMatchSetupBanner(data);
        // }
    });
}

function updateDraftUI(data) {
    document.getElementById("result").innerText =
        data.winner ? "Toss Winner: " + data.winner + "  |  Toss: " + data.result.toUpperCase() : "";
    document.getElementById("turn").innerText =
        data.turn && !data.finished ? "▸ " + data.turn + "'s Pick" : (data.finished ? "✔ Draft Complete!" : "");

    const t1 = document.getElementById("team1");
    const t2 = document.getElementById("team2");
    if (data.team1) t1.innerText = data.team1.join("\n");
    if (data.team2) t2.innerText = data.team2.join("\n");

    let html = "";
    if (data.players && data.players.length > 0) {
        data.players.forEach(p => {
            html += `<button onclick="pickPlayer('${p}')">${p}</button>`;
        });
        document.getElementById("players-label").textContent = "▸ Select a player to draft";
    } else {
        document.getElementById("players-label").textContent = data.finished ? "" : "";
    }
    document.getElementById("players").innerHTML = html;

    // ── NEW: show banner whenever both teams are equal size (and non-empty) ──
    const t1Len = data.team1 ? data.team1.length : 0;
    const t2Len = data.team2 ? data.team2.length : 0;
    const canStart = t1Len > 0 && t2Len > 0 && t1Len === t2Len;

    if (canStart) {
        showMatchSetupBanner(data);
    } else {
        document.getElementById("match-launch-banner").classList.add("hidden");
    }
}

function showMatchSetupBanner(data) {
    // Pre-fill match setup with draft team names
    document.getElementById("ms-team1-name").value = "Team 1 (" + data.team1[0] + ")";
    document.getElementById("ms-team2-name").value = "Team 2 (" + data.team2[0] + ")";
    document.getElementById("ms-wickets").value = Math.min(10, data.team1.length - 1 || 1);
    document.getElementById("match-launch-banner").classList.remove("hidden");
}

function goToMatchSetup() {
    document.getElementById("match-launch-banner").classList.add("hidden");
    showPhase("match_setup");
}

// ================================================================
//  MATCH SETUP PHASE
// ================================================================
function startMatch() {
    const team1Name = document.getElementById("ms-team1-name").value.trim() || "Team 1";
    const team2Name = document.getElementById("ms-team2-name").value.trim() || "Team 2";
    const overs = parseInt(document.getElementById("ms-overs").value) || 5;
    const wickets = parseInt(document.getElementById("ms-wickets").value) || 10;

    const team1 = draftData ? draftData.team1 : [];
    const team2 = draftData ? draftData.team2 : [];

    fetch("/match/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            team1, team2,
            team1_name: team1Name,
            team2_name: team2Name,
            overs, wickets
        })
    })
    .then(res => res.json())
    .then(ms => {
        showPhase("match");
        renderMatch(ms);
    });
}

// ================================================================
//  MATCH PHASE
// ================================================================
function addBall(event) {
    fetch("/match/ball", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: String(event) })
    })
    .then(res => res.json())
    .then(ms => {
        if (ms.done) {
            showPhase("result");
            renderResult(ms);
        } else {
            renderMatch(ms);
        }
    });
}

function undoLast() {
    fetch("/match/undo", { method: "POST" })
    .then(res => res.json())
    .then(ms => renderMatch(ms));
}

function endInningsManual() {
    fetch("/match/end_innings", { method: "POST" })
    .then(res => res.json())
    .then(ms => {
        if (ms.done) {
            showPhase("result");
            renderResult(ms);
        } else {
            renderMatch(ms);
        }
    });
}

function renderMatch(ms) {
    const inn = ms.innings;
    const s = ms.scores[inn];
    const batting = inn === 0 ? ms.team1_name : ms.team2_name;
    const bowling = inn === 0 ? ms.team2_name : ms.team1_name;

    const ovsCompleted = Math.floor(s.balls / 6);
    const ballsInOver = s.balls % 6;
    const crr = s.balls > 0 ? ((s.runs / s.balls) * 6).toFixed(2) : "0.00";

    document.getElementById("m-innings").textContent = inn === 0 ? "1st Innings" : "2nd Innings";
    document.getElementById("m-batting").textContent = batting;
    document.getElementById("m-bowling").textContent = bowling;
    document.getElementById("m-score").textContent = s.runs + "/" + s.wickets;
    document.getElementById("m-overs").textContent = ovsCompleted + "." + ballsInOver + " / " + ms.total_overs + " ov";
    document.getElementById("m-crr").textContent = crr;
    document.getElementById("m-extras").textContent = s.extras || 0;

    // This over runs
    let thisOverRuns = 0;
    const log = s.ball_log || [];
    for (let j = log.length - 1; j >= 0; j--) {
        if (log[j].type === "OVER_END") break;
        thisOverRuns += log[j].runs || 0;
    }
    document.getElementById("m-this-over").textContent = thisOverRuns;

    // Target bar
    const targetBar = document.getElementById("m-target-bar");
    if (inn === 1) {
        const target = ms.scores[0].runs + 1;
        const need = target - s.runs;
        const ballsLeft = (ms.total_overs * 6) - s.balls;
        document.getElementById("m-target").textContent = "Target: " + target;
        document.getElementById("m-need").textContent =
            need <= 0 ? "Target Chased!" : "Need " + need + " in " + ballsLeft + " balls";
        targetBar.classList.remove("hidden");
    } else {
        targetBar.classList.add("hidden");
    }

    // Over dots — current over
    const dots = document.getElementById("m-over-dots");
    const currentOverBalls = [];
    for (let j = log.length - 1; j >= 0; j--) {
        if (log[j].type === "OVER_END") break;
        currentOverBalls.unshift(log[j]);
    }

    // Over history pills
    const overHistory = document.getElementById("m-over-history");
    let historyHtml = "";
    let overBalls = [];
    let overNum = 1;
    log.forEach(b => {
        if (b.type === "OVER_END") {
            if (overBalls.length) {
                const overRuns = overBalls.reduce((a, x) => a + (x.runs || 0), 0);
                const overWkts = overBalls.filter(x => x.wicket).length;
                historyHtml += `<div class="over-pill">Ov ${overNum}: ${overRuns}R${overWkts ? " " + overWkts + "W" : ""}</div>`;
                overNum++;
                overBalls = [];
            }
        } else {
            overBalls.push(b);
        }
    });
    overHistory.innerHTML = historyHtml;

    let dotsHtml = "";
    currentOverBalls.forEach(b => {
        const type = b.type;
        let cls = "dot ";
        if (type === "W") cls += "dot-W";
        else if (type === "WD") cls += "dot-WD";
        else if (type === "NB") cls += "dot-NB";
        else if (type === "4") cls += "dot-4";
        else if (type === "6") cls += "dot-6";
        else cls += "dot-" + type;
        dotsHtml += `<div class="${cls}">${type}</div>`;
    });
    for (let k = currentOverBalls.length; k < 6; k++) {
        dotsHtml += `<div class="dot dot-empty">·</div>`;
    }
    dots.innerHTML = dotsHtml;

    // Wicket tracker dots
    const wDots = document.getElementById("m-wicket-dots");
    let wHtml = "";
    for (let w = 0; w < ms.max_wickets; w++) {
        wHtml += `<div class="wicket-dot ${w < s.wickets ? "wicket-fallen" : "wicket-alive"}"></div>`;
    }
    wDots.innerHTML = wHtml;
}

function renderResult(ms) {
    const s1 = ms.scores[0], s2 = ms.scores[1];

    document.getElementById("r-winner").textContent =
        ms.winner === "Tie" ? "Match Tied!" : ms.winner + " Win!";
    document.getElementById("r-margin").textContent = ms.win_margin || "";

    const ov1 = Math.floor(s1.balls / 6) + "." + (s1.balls % 6);
    const ov2 = Math.floor(s2.balls / 6) + "." + (s2.balls % 6);

    document.getElementById("r-t1-name").textContent = ms.team1_name;
    document.getElementById("r-t1-score").textContent = s1.runs + "/" + s1.wickets;
    document.getElementById("r-t1-overs").textContent = ov1 + " overs";
    document.getElementById("r-t1-extras").textContent = "Extras: " + (s1.extras || 0);

    document.getElementById("r-t2-name").textContent = ms.team2_name;
    document.getElementById("r-t2-score").textContent = s2.runs + "/" + s2.wickets;
    document.getElementById("r-t2-overs").textContent = ov2 + " overs";
    document.getElementById("r-t2-extras").textContent = "Extras: " + (s2.extras || 0);
}

function newMatch() {
    // Go back to match setup keeping draft data
    if (draftData) {
        showPhase("match_setup");
    } else {
        showPhase("draft");
    }
}

function fullReset() {
    fetch("/reset", { method: "POST" });
    draftData = null;
    document.getElementById("result").innerText = "";
    document.getElementById("turn").innerText = "";
    document.getElementById("team1").innerText = "";
    document.getElementById("team2").innerText = "";
    document.getElementById("players").innerHTML = "";
    document.getElementById("players-label").textContent = "";
    document.getElementById("match-launch-banner").classList.add("hidden");
    showPhase("draft");
}