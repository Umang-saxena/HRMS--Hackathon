# List of common filler words and phrases
FILLER_WORDS = [
    # Hesitation sounds
    "um", "uh", "er", "ah", "hmm",

    # Common verbal tics
    "like", "you know", "so", "right",
    
    # Phrases that often act as fillers
    "kind of", "sort of", "I mean"
]

def count_filler_words(transcript: str) -> int:
    """
    Counts the number of filler words in a given transcript.
    """
    words = transcript.lower().split() # Convert to lowercase and split into words

    count = sum(1 for word in words if word in FILLER_WORDS) # Sum up occurrences

    return count