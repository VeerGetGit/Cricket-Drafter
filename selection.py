import random

def generator_toss():
     coins_face = ["head","tail"]*4
     choice=random.choice(coins_face)
     return choice


Captain1 = input("enter your name captain One: ").strip()
print(f"The name of registered captain one is {Captain1} ")
print("\n")
Captain2 = input("enter your name captain Two: ").strip()
print(f"The name of registered captain one is {Captain2} ")
print("\n")

print("_________Now Toss__________")
call = input(f"{Captain1} make your call: ").lower()
result=generator_toss()
print(f"The Toss results are : {result}")
print("\n")

team_one=[]
team_two=[]

if(result==call):
    winner = Captain1
    other = Captain2
    print(f"The winner captain is : {Captain1}")
    print(f"The other is : {Captain2}")

else:
    winner = Captain2
    other = Captain1
    print(f"The winner captain is : {Captain2}")
    print(f"The other is : {Captain1}")

team_one.append(winner)
team_two.append(other)

print(f"{winner} won the toss!\n")
print("\n")

players = ["Veer","singh","Pandey","Harsh Gupta","HarshVardhan","Dj","Divyansh","Himanshu","Shashwat","Dikshant","Harshitt","Kaustubh","Amit","krishk","harshitg"]

newplayers=[]
for p in players:
    if p.lower() not in [Captain1.lower(),Captain2.lower()]:
        newplayers.append(p)

players = newplayers
totalplayers = len(players)+2
team_size = totalplayers//2


turn = winner

while players and (len(team_one)<team_size or len(team_two)<team_size):
    print(f"The list of Available players : {players}")
    choice = input(f"{turn} pick a player: ").strip().lower()
    print("\n")

    matched_player = None
    for p in players:
        if p.lower() == choice:
            matched_player = p
            break

    if matched_player is None:
        print("Invalid choice, try again")
        continue

    if turn == winner and (len(team_one)<team_size):
        
            team_one.append(matched_player)
            turn = other

    elif turn == other and (len(team_two)<team_size):
        
            team_two.append(matched_player)
            turn = winner
        

    players.remove(matched_player)

if players:
     print(f"Player left out: {players}")
print(f"The Team of {winner} is: {team_one}")
print(f"The Team of {other} is: {team_two}")