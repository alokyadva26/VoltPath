import pandas as pd
from pathlib import Path

# Provide absolute paths reliably
DATA_DIR = Path(__file__).resolve().parents[3] / "data"
CSV_PATH = DATA_DIR / "ev_infra_statewise.csv"

def get_real_ev_data():
    """
    Reads the real EV infrastructure dataset from CSV using pandas.
    Returns a dictionary mapping state names to real counts:
    { "Delhi": { "ev_count": 233212, "chargers": 358 }, ... }
    """
    if not CSV_PATH.exists():
        return {}
        
    try:
        df = pd.read_csv(CSV_PATH)
        
        # Clean column names in case of whitespace
        df.columns = df.columns.str.strip()
        
        state_data = {}
        for _, row in df.iterrows():
            state = str(row["state"]).strip()
            # Skip any "Total" rows if they somehow end up in the dataset
            if state.lower() == "total" or not state:
                continue
                
            try:
                evs = int(row["ev_count"])
                chargers = int(row["chargers"])
                
                state_data[state] = {
                    "ev_count": evs,
                    "chargers": chargers
                }
            except (ValueError, TypeError):
                # Skip invalid rows
                continue
                
        return state_data
    except Exception as e:
        print(f"Error loading CSV data: {e}")
        return {}
