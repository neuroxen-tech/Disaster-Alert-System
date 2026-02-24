def calculate_risk(magnitude):
    if magnitude is None:
        return "Unknown"

    if magnitude >= 6:
        return "High"
    elif magnitude >= 4.5:
        return "Medium"
    else:
        return "Low"