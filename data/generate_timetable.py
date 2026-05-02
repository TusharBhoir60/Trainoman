import csv
import random
from datetime import datetime, timedelta

def generate_timetable(filename):
    # Mumbai Western Line stations in order
    all_stations = [
        "Churchgate", "Marine-Lns", "Charni-Rd", "Grant-Rd", "Mumbai-Central",
        "Mahalaxmi", "Lower-Parel", "Prabhadevi", "Dadar", "Matunga-Rd",
        "Mahim", "Bandra", "Khar-Rd", "Santacruz", "Vile-Parle", "Andheri",
        "Jogeshwari", "Ram-Mandir", "Goregaon", "Malad", "Kandivali", "Borivali"
    ]
    
    # Fast trains only stop at these major stations
    fast_stops = ["Churchgate", "Mumbai-Central", "Dadar", "Bandra", "Andheri", "Borivali"]

    header = ["train_id", "station", "sched_arr", "sched_dep", "line_type", "platform", "is_express"]
    
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)

        # Generate 20 synthetic trains (mix of UP and DN, fast and slow)
        start_hour = datetime(2023, 1, 1, 5, 0, 0) # starting at 5:00 AM

        for train_num in range(101, 600):
            is_dn = train_num % 2 != 0 # Odd numbers going Down (away from Churchgate)
            direction = "DN" if is_dn else "UP"
            is_express = random.choice([True, False])
            line_type = "fast" if is_express else "slow"
            train_id = f"WR-{train_num}-{direction}"
            
            # Start time staggered by about 10 minutes per train
            curr_time = start_hour + timedelta(minutes=(train_num - 101) * 10)
            
            # Select route stops based on express/slow
            stops = fast_stops if is_express else all_stations
            if not is_dn:
                stops = stops[::-1] # Reverse for UP direction

            platform = random.choice([3, 4]) if is_express else random.choice([1, 2])

            for j, station in enumerate(stops):
                # Arrival time
                arr_str = "--:--" if j == 0 else curr_time.strftime("%H:%M")
                
                # Add 1 min halt for intermediate stations
                if j > 0 and j < len(stops) - 1:
                    curr_time += timedelta(minutes=1)
                
                # Departure time
                dep_str = "--:--" if j == len(stops) - 1 else curr_time.strftime("%H:%M")
                
                writer.writerow([train_id, station, arr_str, dep_str, line_type, platform, is_express])
                
                # Travel time to next station (synthetic travel time)
                if j < len(stops) - 1:
                    travel_time_mins = random.randint(3, 5) if is_express else random.randint(2, 4)
                    curr_time += timedelta(minutes=travel_time_mins)

if __name__ == "__main__":
    generate_timetable("c:/coding of all sorts/Trainoman/Trainoman/data/synthetic_timetable.csv")
    print("synthetic_timetable.csv generated successfully!")
