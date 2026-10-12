from math import radians, sin, cos, asin, sqrt


def distance_m(lat1, lng1, lat2, lng2):
    """Straight-line distance between two GPS points, in metres."""
    r = 6371000
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = p2 - p1, radians(lng2 - lng1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * r * asin(sqrt(a))