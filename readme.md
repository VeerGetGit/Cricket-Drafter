# 🏏 Cricket Drafter

A web app for quick player drafting and live match scoring — built for real cricket games on the ground.

## Features

- **Toss System** — Coin toss to decide who picks first
- **Player Draft** — Captains alternate picking players; start the match anytime both teams are equal
- **Live Scoring** — Ball-by-ball scoring with runs, wickets, wides, and no-balls
- **Match Stats** — Current run rate, over history, wicket tracker, and target chase info
- **Undo** — Undo the last ball if you made a mistake
- **Result Screen** — Winner, margin, and full scorecard at the end

## Tech Stack

- **Backend** — Python (Flask)
- **Frontend** — HTML, CSS, Vanilla JavaScript

## Setup & Run

1. **Clone the repo**
   ```bash
   git clone https://github.com/VeerGetGit/Cricket-Drafter.git
   cd Cricket-Drafter
   ```

2. **Install dependencies**
   ```bash
   pip install flask
   ```

3. **Run the app**
   ```bash
   python app.py
   ```

4. Open your browser at `http://localhost:5000`

## How to Use

1. Enter both captain names and call the toss
2. Captains take turns picking players from the pool
3. Once both teams have equal players, hit **Start Match**
4. Configure overs and wickets, then begin scoring
5. Use the ball buttons to score each delivery
6. View the result at the end!

## Players

The default player pool can be edited in `app.py` under the `players` list.

---

Made for quick matches on the ground 🏟️