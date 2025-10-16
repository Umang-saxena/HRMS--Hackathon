import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.supabase_client import supabase

def create_tables():
    try:
        # Read the SQL file
        sql_file_path = os.path.join(os.path.dirname(__file__), '..', 'sql', 'create_table.sql')
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()

        # Split SQL commands by semicolon and execute each one
        sql_commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]

        for command in sql_commands:
            if command:
                print(f"Executing: {command[:50]}...")
                supabase.rpc('exec_sql', {'sql': command}).execute()

        print("All tables created successfully!")

    except Exception as e:
        print(f"Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    create_tables()
