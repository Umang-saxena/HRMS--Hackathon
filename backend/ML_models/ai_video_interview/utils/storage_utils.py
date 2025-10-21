import os                                       # For accessing environment variables
from supabase import create_client, Client      # Supabase Python client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

BUCKET_NAME = "resumes_and_interviews" 

def upload_file(file_path: str, destination_name: str) -> str:
    """Uploads a file to the Supabase storage bucket."""
    try:
        with open(file_path, 'rb') as f: 
            supabase.storage.from_(BUCKET_NAME).upload(destination_name, f) # Upload the file
        
    
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(destination_name)
        return public_url
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        return ""

def download_file(file_name: str, download_path: str):
    """Downloads a file from the Supabase storage bucket."""
    try:
        with open(download_path, 'wb+') as f: # Open file in binary write mode
            res = supabase.storage.from_(BUCKET_NAME).download(file_name) # Download the file content
            f.write(res)
        print(f"File {file_name} downloaded to {download_path}")
    except Exception as e:
        print(f"Error downloading from Supabase: {e}")