from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

# ------------------ PLAYERS ------------------
players = [
    "Veer","Singh","Pandey","Gupta","HarshVardhan","Dj",
    "Divyansh","Himanshu","Shashwat","Dikshant","Harshitt",
    "Kaustubh","Amit","Krishk","Harshitg","Abhishek"
]

state = {}
match_state = {}

# ------------------ HOME ------------------
@app.route("/")
def home():
    return render_template("index.html")


# ------------------ START GAME ------------------
@app.route("/start", methods=["POST"])
def start():
    global state

    data = request.json
    c1 = data["captain1"]
    c2 = data["captain2"]
    call = data["call"].lower()

    result = random.choice(["head", "tail"])

    if call == result:
        winner = c1
        other = c2
    else:
        winner = c2
        other = c1

    filtered_players = [
        p for p in players
        if p.lower() not in [c1.lower(), c2.lower()]
    ]

    total_players = len(filtered_players) + 2
    team_size = total_players // 2

    state = {
        "winner": winner,
        "other": other,
        "players": filtered_players,
        "team1": [winner],
        "team2": [other],
        "turn": winner,
        "team_size": team_size,
        "leftover": [],
        "result": result,
        "finished": False
    }

    return jsonify(state)


# ------------------ PICK PLAYER ------------------
@app.route("/pick", methods=["POST"])
def pick():
    global state

    player = request.json["player"]

    if player not in state["players"] or state.get("finished"):
        return jsonify(state)

    team1_full = len(state["team1"]) >= state["team_size"]
    team2_full = len(state["team2"]) >= state["team_size"]

    state["players"].remove(player)

    if team1_full and team2_full:
        state["leftover"].append(player)
        state["finished"] = True
        return jsonify(state)

    if state["turn"] == state["winner"] and not team1_full:
        state["team1"].append(player)
        state["turn"] = state["other"]
    elif state["turn"] == state["other"] and not team2_full:
        state["team2"].append(player)
        state["turn"] = state["winner"]
    else:
        if not team1_full:
            state["team1"].append(player)
        elif not team2_full:
            state["team2"].append(player)
        else:
            state["leftover"].append(player)

    if len(state["team1"]) >= state["team_size"] and len(state["team2"]) >= state["team_size"]:
        state["finished"] = True

    return jsonify(state)


# ------------------ RESET DRAFT ------------------
@app.route("/reset", methods=["POST"])
def reset():
    global state
    state = {}
    return jsonify({"message": "Game reset"})


# ================================================================
#  MATCH / SCORING ROUTES
# ================================================================

# ------------------ START MATCH ------------------
@app.route("/match/start", methods=["POST"])
def match_start():
    global match_state

    data = request.json
    team1 = data["team1"]       # list of player names
    team2 = data["team2"]       # list of player names
    team1_name = data["team1_name"]
    team2_name = data["team2_name"]
    total_overs = int(data.get("overs", 5))
    max_wickets = int(data.get("wickets", len(team1) - 1))  # e.g. 10 or team size - 1

    def empty_innings():
        return {"runs": 0, "wickets": 0, "balls": 0, "ball_log": [], "extras": 0}

    match_state = {
        "team1_name": team1_name,
        "team2_name": team2_name,
        "team1_players": team1,
        "team2_players": team2,
        "total_overs": total_overs,
        "max_wickets": max_wickets,
        "innings": 0,           # 0 = 1st, 1 = 2nd
        "scores": [empty_innings(), empty_innings()],
        "done": False,
        "winner": None,
        "win_margin": None
    }

    return jsonify(match_state)


# ------------------ ADD BALL ------------------
@app.route("/match/ball", methods=["POST"])
def match_ball():
    global match_state

    if match_state.get("done"):
        return jsonify(match_state)

    data = request.json
    event = data["event"]   # "0","1","2","3","4","5","6","W","WD","NB"

    inn = match_state["innings"]
    s = match_state["scores"][inn]
    total_overs = match_state["total_overs"]
    max_wickets = match_state["max_wickets"]

    # --- process event ---
    extra = event in ("WD", "NB")
    wicket = event == "W"
    runs = 0

    if wicket:
        s["wickets"] += 1
    elif extra:
        runs = 1
        s["extras"] += 1
        s["runs"] += 1
    else:
        runs = int(event)
        s["runs"] += runs

    if not extra:
        s["balls"] += 1

    s["ball_log"].append({
        "type": event,
        "runs": runs,
        "wicket": wicket,
        "extra": extra
    })

    # --- check innings end ---
    overs_done = s["balls"] // 6
    balls_in_over = s["balls"] % 6

    innings_over = (overs_done >= total_overs) or (s["wickets"] >= max_wickets)

    # 2nd innings: check if target chased
    if inn == 1:
        target = match_state["scores"][0]["runs"] + 1
        if s["runs"] >= target:
            _finish_match()
            return jsonify(match_state)

    if innings_over:
        if inn == 0:
            match_state["innings"] = 1
        else:
            _finish_match()

    return jsonify(match_state)


# ------------------ UNDO ------------------
@app.route("/match/undo", methods=["POST"])
def match_undo():
    global match_state

    inn = match_state["innings"]
    s = match_state["scores"][inn]
    log = s["ball_log"]

    if not log:
        return jsonify(match_state)

    last = log.pop()

    s["runs"] = max(0, s["runs"] - last["runs"])
    if last["wicket"]:
        s["wickets"] = max(0, s["wickets"] - 1)
    if not last["extra"]:
        s["balls"] = max(0, s["balls"] - 1)
    if last["extra"]:
        s["extras"] = max(0, s["extras"] - 1)

    return jsonify(match_state)


# ------------------ END INNINGS MANUALLY ------------------
@app.route("/match/end_innings", methods=["POST"])
def end_innings():
    global match_state

    if match_state.get("done"):
        return jsonify(match_state)

    if match_state["innings"] == 0:
        match_state["innings"] = 1
    else:
        _finish_match()

    return jsonify(match_state)


# ------------------ INTERNAL: FINISH MATCH ------------------
def _finish_match():
    global match_state

    s1 = match_state["scores"][0]
    s2 = match_state["scores"][1]
    t1 = match_state["team1_name"]
    t2 = match_state["team2_name"]

    if s2["runs"] > s1["runs"]:
        rem = match_state["max_wickets"] - s2["wickets"]
        match_state["winner"] = t2
        match_state["win_margin"] = f"by {rem} wicket{'s' if rem != 1 else ''}"
    elif s1["runs"] > s2["runs"]:
        diff = s1["runs"] - s2["runs"]
        match_state["winner"] = t1
        match_state["win_margin"] = f"by {diff} run{'s' if diff != 1 else ''}"
    else:
        match_state["winner"] = "Tie"
        match_state["win_margin"] = "Match tied!"

    match_state["done"] = True


# ------------------ GET MATCH STATE ------------------
@app.route("/match/state", methods=["GET"])
def match_state_get():
    return jsonify(match_state)


# ------------------ RUN APP ------------------
if __name__ == "__main__":
    app.run(debug=True)