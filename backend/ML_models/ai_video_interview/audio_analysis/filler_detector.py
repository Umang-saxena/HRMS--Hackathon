FILLER_WORDS = [
    "um", "uh", "er", "ah", "hmm",

    
    "like", "you know", "so", "right",
    
    "kind of", "sort of", "I mean"
]

def count_filler_words(transcript: str) -> int:
    """
    Counts the number of filler words in a given transcript.
    """
    words = transcript.lower().split() 
    count = sum(1 for word in words if word in FILLER_WORDS) 

    return count